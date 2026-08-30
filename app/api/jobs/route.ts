// データの置き場は Supabase（app/kv.ts）。Upstashの無料枠を使い切ったため 2026-08-24 に移設。
// 中身は get/set/del/incr/expire が同じ形なので、名前を redis のままにして呼び出し側は触っていない。
import { kv as redis } from '../../kv';
import { NextResponse } from 'next/server';
import { dbWarn } from '../../dbfail';
import { JOBS, JOB_BY_ID, timeoutSecOf, SITE_LABEL } from '../../jobs.config';
import { getCasts } from '../casts/route';

/* ───────────────────────────────────────────────
   手動実行キュー（/status の「今すぐ実行」ボタンの受け口）

   ボタンを押した人（＝ブラウザ）は enqueue するだけ。実際にbotを動かすのは
   店のPCで回っている scraper/runner.js で、claim / report は IMPORT_SECRET 必須。
   ＝ブラウザ側に鍵を置かずに「押せるけど、実行は自宅PCの中だけ」を成立させる。

   ★enqueue は鍵なし（ユーザー判断：中村さんがスマホから鍵なしで押せること優先）。
     代わりに ①ジョブは jobs.config のホワイトリストのみ ②ジョブ毎のクールダウン
     ③同じジョブは同時に1件まで、で連打・悪用のダメージを抑える。
─────────────────────────────────────────────── */


const KEY = 'growup_jobs_v1';
const IMPORT_SECRET = process.env.IMPORT_SECRET ?? '';

export type JobState = {
  id: string;
  /** idle=待機 / queued=実行待ち / running=実行中 */
  status: 'idle' | 'queued' | 'running';
  queuedAt?: number;   // enqueueした時刻(ms)
  startedAt?: number;  // runnerが拾った時刻(ms)
  lastRunAt?: number;  // 最後に終わった時刻(ms)
  lastOk?: boolean;    // 最後の結果
  lastMessage?: string;// 最後のひとこと（画面に出す）
  /** 押した時に指定された相手（卒業させる子／選択更新で選ばれた子）。runnerに --only= で渡る。
      ★昔は名前1個の文字列で保存していた。読むときは asList() で吸収する。 */
  only?: string[] | string;
  /** 選択更新で選ばれた媒体キー。runnerに --site= で渡る */
  sites?: string[];
  /** 最後の実行が「誰・どの媒体」を対象にしたか（画面に出す。空＝全員×全媒体） */
  lastTarget?: string;
  /* ★2026-08-31：実行中の途中経過。
     それまでは queued→running→結果 の3段しか出ておらず、10分かかる削除の間
     画面が「実行中…」のまま黙っていた。中村さんに「削除完了してるのか
     わからない」と言わせた原因がこれ。runnerが節目ごとに送ってくる。 */
  progress?: string;
  /** 途中経過を受け取った時刻(ms)。古い経過を「今の状況」として出さないため */
  progressAt?: number;
};

/** 旧形式（文字列1個）で保存された値も配列として読む */
const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String).filter(Boolean)
    : typeof v === 'string' && v ? [v]
    : [];

/** runnerが実行中のままPCが落ちた場合に、いつまでもrunningで固まらないための時効。
    ★ジョブごとの持ち時間(timeoutSec)より必ず長くすること。
      短いと「runnerはまだ動いているのにサーバーが勝手に中断扱いにする」＝
      画面だけ失敗に見えて、裏では書き込みが続くという最悪の食い違いになる。 */
const staleRunningMs = (id: string) => timeoutSecOf(JOB_BY_ID.get(id)) * 1000 + 2 * 60 * 1000;

/** queuedのまま拾われない時の時効（runnerは1分おきに見に来るので短くてよい） */
const STALE_QUEUED_MS = 10 * 60 * 1000;

async function readAll(): Promise<Record<string, JobState>> {
  try {
    const v = await redis.get<Record<string, JobState>>(KEY);
    return v && typeof v === 'object' ? v : {};
  } catch (e) {
    dbWarn('jobs.readAll', e);   // 読めないのを空っぽと区別できるようにログには残す
    return {};
  }
}

async function writeAll(map: Record<string, JobState>): Promise<boolean> {
  try { await redis.set(KEY, JSON.stringify(map)); return true; }
  catch (e) { dbWarn('jobs.writeAll', e); return false; }
}

/** 保存値に「時効切れのrunningはidleに戻す」を適用して返す */
function normalize(map: Record<string, JobState>): Record<string, JobState> {
  const now = Date.now();
  for (const j of JOBS) {
    const s = map[j.id];
    if (!s) { map[j.id] = { id: j.id, status: 'idle' }; continue; }
    if (s.status === 'running' && now - (s.startedAt ?? 0) > staleRunningMs(j.id)) {
      s.status = 'idle';
      s.lastOk = false;
      s.lastMessage = '応答がないため中断扱いにしました（店のPCが止まっている可能性）';
      s.lastRunAt = now;
    }
    if (s.status === 'queued' && now - (s.queuedAt ?? 0) > STALE_QUEUED_MS) {
      s.status = 'idle';
      s.lastOk = false;
      s.lastMessage = '受け付けましたが実行されませんでした（店のPCが止まっている可能性）';
      /* 🔴★2026-08-12：ここで lastRunAt を今にしてはいけない。
         クールタイムは lastRunAt から数えるので、**一度も実行されていないのに**
         次に押せるまで数分待たされることになる。
         実際に起きた：店のPCが3時間スリープしていた間に押したぶんが時効になり、
         PCが復帰したあとも「あと300秒」と出て押し直せなかった。
         ＝クールタイムは「媒体を触った回数」を抑えるためのもの。
           何も触っていないのだから、消費させない。lastRunAt は前回のまま残す。 */
    }
  }
  return map;
}

/** 画面用：定義＋状態＋「今押せるか」 */
export async function GET() {
  const map = normalize(await readAll());
  const now = Date.now();
  const list = JOBS.map((j) => {
    const s = map[j.id] ?? { id: j.id, status: 'idle' as const };
    const since = now - (s.lastRunAt ?? 0);
    const coolLeft = s.lastRunAt ? Math.max(0, j.cooldownSec * 1000 - since) : 0;
    return {
      id: j.id, name: j.name, desc: j.desc, kind: j.kind,
      danger: Boolean(j.danger),
      /* 画面が「子と媒体の選択欄」を出すかどうかの判断材料。
         選べる媒体はジョブごとに違う（スクリプトが対応している媒体だけ）。 */
      params: j.params ?? null,
      /** 画面のいちばん上に出すか（残りは「詳しい操作」に畳む） */
      primary: Boolean(j.primary),
      /** 見るだけ（媒体を変えない）＝画面に緑の印を出して安心して押せるようにする */
      readOnly: Boolean(j.readOnly),
      /** ふだんは見せない（まとめボタンに入っている工程の部品・逃げ道） */
      fallback: Boolean(j.fallback),
      status: s.status,
      /** いま何をしているか（実行中だけ）。終わったら結果の行に置き換わる */
      progress: s.status === 'running' ? (s.progress ?? '') : '',
      progressAt: s.status === 'running' ? (s.progressAt ?? null) : null,
      /** いつから走っているか（画面に「3分経過」と出すため） */
      startedAt: s.status === 'running' ? (s.startedAt ?? null) : null,
      /** 前回どの範囲で走ったか（「1人だけ直したのに全員に見える」を防ぐ表示用） */
      lastTarget: s.lastTarget ?? '',
      lastRunAt: s.lastRunAt ?? null,
      lastOk: s.lastOk ?? null,
      lastMessage: s.lastMessage ?? '',
      cooldownLeftSec: Math.ceil(coolLeft / 1000),
      canRun: s.status === 'idle' && coolLeft === 0,
    };
  });
  return NextResponse.json({ jobs: list, now });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = String((b as { action?: unknown }).action ?? 'enqueue');
  const map = normalize(await readAll());
  const now = Date.now();

  // ── ① 画面から：実行をお願いする（鍵なし）─────────────
  if (action === 'enqueue') {
    const id = String((b as { id?: unknown }).id ?? '');
    const def = JOB_BY_ID.get(id);
    if (!def) return NextResponse.json({ ok: false, error: 'そのボタンは無効です' }, { status: 400 });

    const s = map[id] ?? { id, status: 'idle' as const };
    if (s.status !== 'idle') {
      return NextResponse.json({ ok: false, error: 'いま実行中です。終わるまでお待ちください' }, { status: 409 });
    }
    const coolLeft = s.lastRunAt ? def.cooldownSec * 1000 - (now - s.lastRunAt) : 0;
    if (coolLeft > 0) {
      return NextResponse.json(
        { ok: false, error: `連続実行を防ぐため、あと${Math.ceil(coolLeft / 1000)}秒お待ちください` },
        { status: 429 },
      );
    }
    /* ★このAPIは鍵なしで叩ける（中村さんがスマホから押せることを優先している）。
       ＝ここに来る値は全部「他人が好きに書ける文字列」だと思って扱う。
       受け取るのは ①jobs.config が params で宣言したジョブ ②卒業（danger）だけで、
       値は必ずホワイトリスト照合してから通す（形のチェックだけでは足りない）。 */
    let only: string[] | undefined;
    let sites: string[] | undefined;

    if (def.danger) {
      // 卒業＝媒体から下げる／削除する。相手1名を必ず指定させる（従来どおり）
      const raw = String((b as { only?: unknown }).only ?? '').trim();
      if (!raw) return NextResponse.json({ ok: false, error: '対象の名前がありません' }, { status: 400 });
      if (raw.length > 20 || /[\s;&|<>`$"'=,]/.test(raw)) {
        return NextResponse.json({ ok: false, error: '対象の名前が正しくありません' }, { status: 400 });
      }
      /* ★★2026-08-09：在籍名簿との「完全一致」をここでも見る。
         削除（cast_delete）は取り消せないので、名簿に無い文字列が
         店のPCまで届くこと自体を防ぐ。スクリプト側にも同じ確認があり、二重の歯止め。
         ★部分一致にはしない（「ゆう」で「ゆうか」が消える）。 */
      const roster = new Set((await getCasts()).map((c) => c.name));
      if (!roster.has(raw)) {
        return NextResponse.json({ ok: false, error: `在籍にない名前です：${raw}` }, { status: 400 });
      }
      only = [raw];
    } else if (def.params) {
      if (def.params.only) {
        const want = asList((b as { only?: unknown }).only).map((x) => x.trim()).filter(Boolean);
        if (want.length > 40) {
          return NextResponse.json({ ok: false, error: '選べる人数が多すぎます' }, { status: 400 });
        }
        if (want.length) {
          /* ★在籍名簿に「完全一致」する名前だけ通す。部分一致や正規化で
             寄せると、名簿に無い文字列が素通りする穴になる。 */
          const roster = new Set((await getCasts()).map((c) => c.name));
          const bad = want.filter((n) => !roster.has(n));
          if (bad.length) {
            return NextResponse.json(
              { ok: false, error: `在籍にない名前が含まれています：${bad.slice(0, 3).join('・')}` },
              { status: 400 },
            );
          }
          only = [...new Set(want)];
        }
      }
      if (def.params.sites?.length) {
        const allowed = new Set<string>(def.params.sites);
        const want = asList((b as { site?: unknown }).site).map((x) => x.trim()).filter(Boolean);
        if (want.some((k) => !allowed.has(k))) {
          return NextResponse.json({ ok: false, error: '対象の媒体が正しくありません' }, { status: 400 });
        }
        // 全部選ばれている＝絞らないのと同じ。--site= を付けない（スクリプトの既定に任せる）
        if (want.length && want.length < allowed.size) sites = [...new Set(want)];
      }
    }

    map[id] = { ...s, id, status: 'queued', queuedAt: now, only, sites };
    if (!(await writeAll(map))) {
      return NextResponse.json({ ok: false, error: 'DBに接続できません' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: 'queued' });
  }

  // ここから下は店のPC（runner.js）専用
  if (!IMPORT_SECRET || (b as { secret?: unknown }).secret !== IMPORT_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // ── ② runnerから：実行待ちを1件もらう ─────────────
  if (action === 'claim') {
    const queued = JOBS.map((j) => map[j.id]).filter((s) => s?.status === 'queued');
    // 先に積まれた順（＝押された順）に処理する
    queued.sort((a, b2) => (a.queuedAt ?? 0) - (b2.queuedAt ?? 0));
    const take = queued[0];
    if (!take) return NextResponse.json({ ok: true, job: null });
    const def = JOB_BY_ID.get(take.id);
    take.status = 'running';
    take.startedAt = now;
    /* 前回の途中経過が残っていると、走り出した瞬間に古い行が「いまの状況」として出る */
    take.progress = '';
    take.progressAt = undefined;
    await writeAll(map);
    return NextResponse.json({
      ok: true,
      job: {
        id: take.id,
        script: def?.script ?? '',
        name: def?.name ?? take.id,
        /* ★複数対応。runner.js の safeArgs も カンマ区切りを通す形にしてある。
           空の時は付けない＝スクリプト既定の「全員×全媒体」になる。
           ★def.args＝ジョブ定義に固定で書いてある引数（例 deki_import の --refresh）。
             画面から来る only/sites より先に置く。 */
        args: [
          ...(Array.isArray(def?.args) ? def.args : []),
          ...(asList(take.only).length ? [`--only=${asList(take.only).join(',')}`] : []),
          ...(asList(take.sites).length ? [`--site=${asList(take.sites).join(',')}`] : []),
        ],
        /* ★そのジョブ固有の環境変数（例：写真の差し替え REPLACE=1）。
           jobs.config に書いたものだけ。画面からは指定できない。
           runner.js 側でもキー・値を許可リストで縛っている（二重の歯止め）。 */
        env: def?.env ?? {},
        confirm: Boolean(def?.confirm),
        /* ★持ち時間はサーバーが渡す。runner側に数字を持たせると
           jobs.config を直しても店のPCが古い値のままになる。 */
        timeoutSec: timeoutSecOf(def),
      },
    });
  }

  /* ── ③ runnerから：途中経過を送る（2026-08-31 追加）─────────────
     結果(report)と違って「まだ終わっていない」ので、状態は running のまま。
     ★実行中のものにしか書かない。runnerの送信が遅れて結果の後に届いた時に、
       終わったジョブへ「いま○○中」と書き戻してしまうのを防ぐ。 */
  if (action === 'progress') {
    const id = String((b as { id?: unknown }).id ?? '');
    const s = map[id];
    if (!s || s.status !== 'running') return NextResponse.json({ ok: true, ignored: true });
    s.progress = String((b as { message?: unknown }).message ?? '').slice(0, 200);
    s.progressAt = now;
    await writeAll(map);
    return NextResponse.json({ ok: true });
  }

  // ── ④ runnerから：結果を返す ─────────────
  if (action === 'report') {
    const id = String((b as { id?: unknown }).id ?? '');
    const s = map[id];
    if (!s) return NextResponse.json({ ok: false, error: '対象が見つかりません' }, { status: 400 });
    s.status = 'idle';
    s.lastRunAt = now;
    s.lastOk = Boolean((b as { ok?: unknown }).ok);
    s.lastMessage = String((b as { message?: unknown }).message ?? '').slice(0, 300);
    /* ★何を対象に走ったかを結果と一緒に残す。これが無いと
       「1人だけ選んで押した」のか「全員に流した」のかが後から分からない。 */
    const names = asList(s.only);
    const sk = asList(s.sites);
    s.lastTarget = [
      names.length ? `${names.join('・')} だけ` : '',
      sk.length ? `${sk.map((k) => SITE_LABEL[k] ?? k).join('・')} だけ` : '',
    ].filter(Boolean).join(' ／ ');
    // 選択は1回きり。消しておかないと次に押した時も同じ絞り込みが残る
    s.only = undefined;
    s.sites = undefined;
    // 終わったら途中経過は用済み（結果の行が出る）
    s.progress = undefined;
    s.progressAt = undefined;
    await writeAll(map);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: '不明な操作です' }, { status: 400 });
}
