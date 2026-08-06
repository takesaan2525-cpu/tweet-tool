import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { JOBS, JOB_BY_ID, timeoutSecOf } from '../../jobs.config';

/* ───────────────────────────────────────────────
   手動実行キュー（/status の「今すぐ実行」ボタンの受け口）

   ボタンを押した人（＝ブラウザ）は enqueue するだけ。実際にbotを動かすのは
   店のPCで回っている scraper/runner.js で、claim / report は IMPORT_SECRET 必須。
   ＝ブラウザ側に鍵を置かずに「押せるけど、実行は自宅PCの中だけ」を成立させる。

   ★enqueue は鍵なし（ユーザー判断：中村さんがスマホから鍵なしで押せること優先）。
     代わりに ①ジョブは jobs.config のホワイトリストのみ ②ジョブ毎のクールダウン
     ③同じジョブは同時に1件まで、で連打・悪用のダメージを抑える。
─────────────────────────────────────────────── */

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
  token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
});

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
  /** 押した時に指定された相手（卒業させる子の名前など）。runnerに --only= で渡る */
  only?: string;
};

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
  } catch {
    return {};
  }
}

async function writeAll(map: Record<string, JobState>): Promise<boolean> {
  try { await redis.set(KEY, JSON.stringify(map)); return true; } catch { return false; }
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
      s.lastRunAt = now;
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
      status: s.status,
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
    /* 「誰に対して」を伴う操作（卒業＝媒体から下げる）だけ、押した時の相手を受け取る。
       それ以外のジョブでは無視する＝ボタンに勝手な引数を足せないようにする。 */
    let only: string | undefined;
    if (def.danger) {
      const raw = String((b as { only?: unknown }).only ?? '').trim();
      if (!raw) return NextResponse.json({ ok: false, error: '対象の名前がありません' }, { status: 400 });
      // 記号を含む名前は扱わない（runner側でも --only= の形を再チェックする）
      if (raw.length > 20 || /[\s;&|<>`$"'=]/.test(raw)) {
        return NextResponse.json({ ok: false, error: '対象の名前が正しくありません' }, { status: 400 });
      }
      only = raw;
    }

    map[id] = { ...s, id, status: 'queued', queuedAt: now, only };
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
    await writeAll(map);
    return NextResponse.json({
      ok: true,
      job: {
        id: take.id,
        script: def?.script ?? '',
        name: def?.name ?? take.id,
        args: take.only ? [`--only=${take.only}`] : [],
        confirm: Boolean(def?.confirm),
        /* ★持ち時間はサーバーが渡す。runner側に数字を持たせると
           jobs.config を直しても店のPCが古い値のままになる。 */
        timeoutSec: timeoutSecOf(def),
      },
    });
  }

  // ── ③ runnerから：結果を返す ─────────────
  if (action === 'report') {
    const id = String((b as { id?: unknown }).id ?? '');
    const s = map[id];
    if (!s) return NextResponse.json({ ok: false, error: '対象が見つかりません' }, { status: 400 });
    s.status = 'idle';
    s.lastRunAt = now;
    s.lastOk = Boolean((b as { ok?: unknown }).ok);
    s.lastMessage = String((b as { message?: unknown }).message ?? '').slice(0, 300);
    await writeAll(map);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: '不明な操作です' }, { status: 400 });
}
