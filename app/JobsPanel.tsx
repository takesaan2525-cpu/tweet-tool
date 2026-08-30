'use client';

import { useEffect, useState } from 'react';
import JobProgress from './JobProgress';

/* ───────────────────────────────────────────────
   「今すぐ実行」パーツ（/status ページと、管理ダッシュボードの
   「掲載更新」タブの両方から同じものを使う）

   押すと /api/jobs にキューが1件積まれ、店のPCの runner.js が拾って
   実際のbotを走らせる。＝ブラウザ側に鍵を置かずに手動実行ができる。
   ・実行中のものがあれば5秒ごと、平常時は30秒ごとに状態を取り直す。
─────────────────────────────────────────────── */

/** そのジョブが「この子だけ・この媒体だけ」を受け取れるか（jobs.config の params） */
type JobParams = { only?: boolean; sites?: string[] } | null;

type Job = {
  id: string; name: string; desc: string; kind: 'attend' | 'boost' | 'post' | 'cast';
  danger?: boolean;
  params: JobParams;
  primary: boolean;
  /** 見るだけ（媒体を変えない） */
  readOnly?: boolean;
  /** ふだんは見せない（まとめボタンの部品・うまくいかない時の逃げ道） */
  fallback?: boolean;
  status: 'idle' | 'queued' | 'running';
  lastRunAt: number | null; lastOk: boolean | null; lastMessage: string;
  lastTarget: string;
  /** 実行中に店のPCから届く「いま何をしているか」（2026-08-31 追加） */
  progress: string; progressAt: number | null; startedAt: number | null;
  cooldownLeftSec: number; canRun: boolean;
};

/** 媒体キー→表示名（jobs.config の SITES と一致させること） */
const SITE_LABEL: Record<string, string> = {
  deki: '駅ちか', mensest: 'じゃぱん', refle: 'リフナビ', map: 'MAP',
  rank: 'ランキング', estama: 'エス魂', eslove: 'エステラブ',
};

/** 1ジョブぶんの絞り込み。空＝絞らない（全員×全媒体） */
type Sel = { only: string[]; sites: string[] };
const EMPTY_SEL: Sel = { only: [], sites: [] };

/** 本日の残り回数（/api/counts）。店のPCが30分おきに媒体から読んでくる */
type Counter = {
  id: string; label: string; jobId: string | null;
  dailyCap: number | null; remaining: number | null;
  readAt: number | null; fresh: boolean; exhausted: boolean;
};

const KIND_LABEL: Record<Job['kind'], string> = { attend: '出勤', boost: '上位表示', post: '投稿', cast: 'キャスト' };

/* 「詳しい操作」を開いたときの並べ方（2026-08-12）。
   ★以前は14件が同じ見た目でひと続きに並んでいて、
     「回数を使うもの」「文章が公開されるもの」「見るだけのもの」が
     混ざっていた＝押す前に危なさが分からなかった。
   種類ごとに小見出しを付けて、危ないものほど下に置く。 */
const GROUPS: { kind: Job['kind']; title: string; hint: string }[] = [
  { kind: 'cast',   title: 'キャスト',   hint: '登録・写真・プロフ・並び順' },
  { kind: 'attend', title: '出勤',       hint: 'HPの出勤表を読む' },
  { kind: 'boost',  title: '上位表示',   hint: '★1日の残り回数を消費します' },
  { kind: 'post',   title: '投稿',       hint: '★お客様に見える文章が出ます' },
];
const KIND_STYLE: Record<Job['kind'], string> = {
  attend: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  boost: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  post: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  cast: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

/** ボタン横に出す「いまの絞り込み」の一言。
    ★媒体を選べないジョブ（＝工程ごとに対応媒体が違うもの）に「全媒体」と
      出すと、選べるのに選んでいないように見える。その時は人数だけ出す。 */
function scopeLabel(s: Sel, canPickSites: boolean): string {
  const a = s.only.length ? `${s.only.length}名` : '全員';
  if (!canPickSites) return `（${a}）`;
  const b = s.sites.length ? `${s.sites.map((k) => SITE_LABEL[k] ?? k).join('・')}` : '全媒体';
  return `（${a}／${b}）`;
}

/** チェックボックスの並び（媒体・キャストで共用） */
function Picker({
  title, hint, items, picked, onPick, onClear, empty,
}: {
  title: string; hint: string;
  items: { v: string; label: string }[];
  picked: string[];
  onPick: (v: string) => void;
  onClear: () => void;
  empty?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <span className="text-[11px] font-bold text-zinc-300">{title}</span>
          <span className="text-[10px] text-zinc-600 ml-2">{hint}</span>
        </div>
        {picked.length > 0 && (
          <button onClick={onClear} className="text-[10px] text-zinc-400 underline shrink-0">
            解除
          </button>
        )}
      </div>
      {items.length === 0
        ? <div className="text-[11px] text-zinc-600">{empty ?? '選べるものがありません'}</div>
        : (
          <div className="flex flex-wrap gap-1.5">
            {items.map((it) => {
              const on = picked.includes(it.v);
              return (
                <button
                  key={it.v}
                  onClick={() => onPick(it.v)}
                  className={`text-[11px] rounded-lg px-2.5 py-1.5 border transition active:scale-95 ${
                    on
                      ? 'bg-sky-500 border-sky-400 text-white font-bold'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}
                >
                  {it.label}
                </button>
              );
            })}
          </div>
        )}
    </div>
  );
}

const hhmm = (ms: number | null) =>
  ms ? new Date(ms).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '';

export default function JobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [toast, setToast] = useState('');
  /** 在籍キャスト名（絞り込みの選択肢。名前の正はサーバー側でも突き合わせる） */
  const [castNames, setCastNames] = useState<string[]>([]);
  /** ジョブidごとの絞り込み。開いているジョブのidを openSel に入れる */
  const [sel, setSel] = useState<Record<string, Sel>>({});
  const [openSel, setOpenSel] = useState<string | null>(null);
  /** 「詳しい操作」を開いているか（既定は閉じる） */
  const [showAll, setShowAll] = useState(false);
  /** 「うまくいかない時」を開いているか（既定は閉じる） */
  const [showFallback, setShowFallback] = useState(false);
  const selOf = (id: string) => sel[id] ?? EMPTY_SEL;

  async function load() {
    try {
      const [j, c] = await Promise.all([
        fetch('/api/jobs', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/counts', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      ]);
      // 取り消せない操作（卒業）はここには出さない＝キャスト管理の各行から実行する
      if (Array.isArray(j?.jobs)) setJobs((j.jobs as Job[]).filter((x) => !x.danger));
      if (Array.isArray(c?.counters)) setCounters(c.counters);
    } catch {}
  }

  /* キャスト名は絞り込みを開いた時に一度だけ取りに行く（毎回30秒ごとに取る必要はない） */
  async function loadCasts() {
    if (castNames.length) return;
    try {
      const list = await fetch('/api/casts', { cache: 'no-store' }).then((r) => r.json());
      if (Array.isArray(list)) {
        setCastNames(list.map((c: { name?: string }) => String(c?.name ?? '')).filter(Boolean));
      }
    } catch {}
  }

  /** チェックの付け外し（すでに入っていれば外す） */
  function toggle(jobId: string, field: keyof Sel, value: string) {
    setSel((prev) => {
      const cur = prev[jobId] ?? EMPTY_SEL;
      const list = cur[field];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...prev, [jobId]: { ...cur, [field]: next } };
    });
  }

  /* ボタンidごとの残り回数。1つのボタンに2つ付くことがある（エステラブ＝新着と求人）。
     まだ一度も読めていないものは出さない＝「残り —」だらけの画面にしない。 */
  const countsOf = (jobId: string) => counters.filter((c) => c.jobId === jobId && c.remaining !== null);
  /* 押せなくするのは「新しい数字で、関係する枠が全部0」のときだけ。
     数字が古い／読めていない場合は閉めない＝出せるはずのものを止めない。 */
  const isOut = (jobId: string) => {
    const cs = countsOf(jobId);
    return cs.length > 0 && cs.every((c) => c.exhausted);
  };
  /** ボタンに付かない枠（求人ココアのブログ）は上にまとめて出す */
  const infoOnly = counters.filter((c) => !c.jobId && c.remaining !== null);

  const busy = jobs.some((j) => j.status !== 'idle');
  useEffect(() => {
    load();
    const t = setInterval(load, busy ? 5000 : 30000);
    return () => clearInterval(t);
  }, [busy]);

  /* 経過時間の表示を進めるための時計。動いているものが無い時は回さない。 */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!busy) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function runJob(j: Job) {
    // 残り0＝押しても媒体側で弾かれるだけなので、ここで止めて理由を出す
    if (isOut(j.id)) {
      setToast(`「${j.name}」は本日の回数を使い切りました。明日またお使いください`);
      setTimeout(() => setToast(''), 6000);
      return;
    }
    const s = selOf(j.id);
    /* 何を対象にするかを確認文にも出す。「全員に流すつもりじゃなかった」を防ぐ。 */
    const scope = [
      s.only.length ? `対象：${s.only.join('・')}（${s.only.length}名）` : '対象：全員',
      s.sites.length ? `媒体：${s.sites.map((k) => SITE_LABEL[k] ?? k).join('・')}` : '媒体：すべて',
    ].join('\n');
    /* 投稿・上位化は取り消せないので、押し間違い防止に一度だけ確認する。
       ★見るだけのもの（登録状況の確認・並び順の確認）は聞かない。
         何も変えないのに確認を出すと、確認そのものが読まれなくなる。 */
    if (!j.readOnly && j.kind !== 'attend'
      && !window.confirm(`「${j.name}」を今すぐ実行します。\n\n${j.desc}\n\n${scope}\n\nよろしいですか？`)) return;
    setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, status: 'queued', canRun: false } : x)));
    try {
      const r = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enqueue', id: j.id, only: s.only, site: s.sites }),
      }).then((res) => res.json());
      setToast(r?.ok ? `「${j.name}」を受け付けました。実行まで少しお待ちください` : (r?.error ?? '実行できませんでした'));
    } catch {
      setToast('通信できませんでした。電波のいいところで もう一度お試しください');
    }
    setTimeout(() => setToast(''), 6000);
    load();
  }

  /* ★2026-08-09：ボタンが17個並んで「どれを押せばいいか分からない」状態だったので、
     ふだん押す3つ（jobs.config の primary）だけ表に出し、残りは畳む。
     消したわけではないので、開けば全部ある。 */
  const primaryJobs = jobs.filter((j) => j.primary);
  /* ★2026-08-12：3段にした。
       表 … ふだん押す（primary）
       詳しい操作 … 上位表示・投稿・確認など、たまに押すもの
       うまくいかない時 … 「駅ちかに合わせる」に入っている工程の部品。
         中村さんに「写真のやつが2個ある」「エステラブって何？」と
         言わせた原因。消さずに、ここまで下げる。 */
  const otherJobs = jobs.filter((j) => !j.primary && !j.fallback);
  const fallbackJobs = jobs.filter((j) => !j.primary && j.fallback);
  /* 畳んだ側で何か動いている／直近に失敗した時は勝手に開く。
     閉じたまま失敗しているのがいちばん気づけない。
     ★2026-08-12：「直近」を24時間以内に限定した。それまでは期限なしだったので、
       8/9の失敗が残っているだけで「うまくいかない時」が永久に開きっぱなしになり、
       畳んだ意味がなくなっていた（実際にそうなっていた）。
       古い失敗は放っておくのではなく、開けば見えるところに残っている。 */
  const RECENT_MS = 24 * 60 * 60 * 1000;
  const needsAttention = (list: Job[]) => list.some((j) =>
    j.status !== 'idle'
    || (j.lastOk === false && j.lastRunAt !== null && Date.now() - j.lastRunAt < RECENT_MS));
  const otherNeedsAttention = needsAttention(otherJobs);
  const fallbackNeedsAttention = needsAttention(fallbackJobs);

  return (
    <>
      <div className="space-y-3">
        {jobs.length === 0 && <div className="text-sm text-zinc-500">読み込み中…</div>}

        {/* ボタンの無い枠（求人ココアの店長ブログ）の残り回数 */}
        {infoOnly.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500 px-1">
            {infoOnly.map((c) => (
              <span key={c.id}>
                {c.label}
                <span className={c.remaining === 0 ? 'text-amber-400 font-bold' : 'text-zinc-300 font-bold'}>
                  残り {c.remaining}{c.dailyCap ? `/${c.dailyCap}` : '回'}
                </span>
                {!c.fresh && <span className="text-zinc-600">（古い数字）</span>}
              </span>
            ))}
          </div>
        )}

        {/* ★ map(renderJob) と書かない：mapは第2引数にindex(number)を渡すので
            showKind に 0/1 が入ってしまう（先頭のカードだけバッジが消える）。 */}
        {primaryJobs.map((j) => renderJob(j, true))}

        {/* ── 詳しい操作（ふだん押さないもの）────────────────
            上位表示・投稿・確認系・並び順はここに畳む。件数を出して
            「隠された」のではなく「畳んである」と分かるようにする。 */}
        {otherJobs.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full text-left text-xs font-bold text-zinc-400 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 active:scale-[0.99] transition"
            >
              {showAll || otherNeedsAttention ? '▾' : '▸'} 詳しい操作（{otherJobs.length}件）
              <span className="text-zinc-600 font-normal ml-2">
                上位表示・投稿・並び順・確認
              </span>
              {otherNeedsAttention && !showAll && (
                <span className="text-amber-400 ml-2">※動いているものがあります</span>
              )}
            </button>
          </div>
        )}
        {/* ★種類ごとに小見出しを付けて出す。ひと続きの14件だと
            「回数を使うもの」と「見るだけ」が同じ顔で並んでしまう。 */}
        {(showAll || otherNeedsAttention) && GROUPS.map((g) => {
          const list = otherJobs.filter((j) => j.kind === g.kind);
          if (!list.length) return null;
          return (
            <div key={g.kind} className="space-y-3">
              <div className="flex items-baseline gap-2 px-1 pt-2">
                <span className="text-xs font-bold text-zinc-300">{g.title}</span>
                <span className="text-[10px] text-zinc-600">{g.hint}</span>
              </div>
              {list.map((j) => renderJob(j, false))}
            </div>
          );
        })}

        {/* ── うまくいかない時（まとめボタンの部品）────────────
            「駅ちかに合わせる」が全部やるので、ふだんは要らない。
            一部だけ失敗した時に、そこだけやり直すための逃げ道として残す。 */}
        {fallbackJobs.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setShowFallback(!showFallback)}
              className="w-full text-left text-xs font-bold text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 rounded-xl px-4 py-3 active:scale-[0.99] transition"
            >
              {showFallback || fallbackNeedsAttention ? '▾' : '▸'} うまくいかない時（{fallbackJobs.length}件）
              <span className="text-zinc-600 font-normal ml-2">
                写真だけ・プロフだけ・エステラブだけ、など個別にやり直す
              </span>
              {fallbackNeedsAttention && !showFallback && (
                <span className="text-amber-400 ml-2">※動いているものがあります</span>
              )}
            </button>
          </div>
        )}
        {(showFallback || fallbackNeedsAttention) && (
          <>
            <p className="text-[11px] text-zinc-600 px-1 leading-relaxed">
              ふだんは「駅ちかに合わせる」だけで足ります。ここは、そのうち一部だけ
              失敗した時に、その工程だけやり直すためのものです。
            </p>
            {fallbackJobs.map((j) => renderJob(j, false))}
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[92vw]">
          <div className="bg-zinc-800 border border-zinc-700 text-white text-xs font-bold rounded-xl px-4 py-3 shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </>
  );

  /** ジョブ1件のカード（表に出すものと、畳んだ側の両方から使う）
      showKind＝種類バッジを出すか。畳んだ側は種類ごとの小見出しの下に並ぶので、
      同じ語がすぐ上と重なる（「キャスト」の見出しの下に「キャスト」バッジ）。
      そこでは出さない。 */
  function renderJob(j: Job, showKind = true) {
          const running = j.status !== 'idle';
          const cs = countsOf(j.id);
          const out = isOut(j.id);
          const canPress = j.canRun && !out;
          return (
            <div key={j.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {showKind && (
                      <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${KIND_STYLE[j.kind]}`}>
                        {KIND_LABEL[j.kind]}
                      </span>
                    )}
                    <span className="font-bold">{j.name}</span>
                    {/* 「押しても何も変わらない」ものは、押す前にそう分かるようにする */}
                    {j.readOnly && (
                      <span className="text-[10px] font-bold border rounded-full px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                        見るだけ
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{j.desc}</div>

                  {/* ── 対象をえらぶ（jobs.config で params を宣言したジョブだけ）──
                      何も選ばなければ今までどおり全員×全媒体。1人だけ直したい時に、
                      26名×5媒体を待たなくて済むようにするための欄。 */}
                  {j.params && (
                    <div className="mt-2">
                      <button
                        onClick={() => { setOpenSel(openSel === j.id ? null : j.id); loadCasts(); }}
                        className="text-[11px] font-bold text-sky-400 active:opacity-70"
                      >
                        {openSel === j.id ? '▾ 対象をえらぶ' : '▸ 対象をえらぶ'}
                        <span className="text-zinc-500 font-normal ml-1">
                          {scopeLabel(selOf(j.id), Boolean(j.params?.sites?.length))}
                        </span>
                      </button>

                      {openSel === j.id && (
                        <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-3">
                          {j.params.sites && j.params.sites.length > 0 && (
                            <Picker
                              title="媒体"
                              hint="選ばなければ全媒体。1媒体ずつ回すとMAPが落ちにくい"
                              items={j.params.sites.map((k) => ({ v: k, label: SITE_LABEL[k] ?? k }))}
                              picked={selOf(j.id).sites}
                              onPick={(v) => toggle(j.id, 'sites', v)}
                              onClear={() => setSel((p) => ({ ...p, [j.id]: { ...selOf(j.id), sites: [] } }))}
                            />
                          )}
                          {j.params.only && (
                            <Picker
                              title="キャスト"
                              hint="選ばなければ在籍全員"
                              items={castNames.map((n) => ({ v: n, label: n }))}
                              picked={selOf(j.id).only}
                              onPick={(v) => toggle(j.id, 'only', v)}
                              onClear={() => setSel((p) => ({ ...p, [j.id]: { ...selOf(j.id), only: [] } }))}
                              empty="キャストを読み込み中…"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 本日の残り回数。0なら琥珀色＋ボタンはグレーアウトする */}
                  {cs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {cs.map((c) => (
                        <span
                          key={c.id}
                          className={`text-[11px] rounded-md px-1.5 py-0.5 border ${
                            !c.fresh || c.remaining === null
                              ? 'border-zinc-800 text-zinc-600'
                              : c.remaining === 0
                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold'
                                : 'border-zinc-700 text-zinc-300'
                          }`}
                        >
                          {cs.length > 1 && `${c.label} `}
                          {c.remaining === null
                            ? '残り —'
                            : `残り ${c.remaining}${c.dailyCap ? `/${c.dailyCap}` : '回'}`}
                        </span>
                      ))}
                      {cs.some((c) => !c.fresh) && (
                        <span className="text-[10px] text-zinc-600">数字が少し前のものです</span>
                      )}
                    </div>
                  )}

                  {/* いま何をしているか。走っている間はここが数秒ごとに動く */}
                  <JobProgress status={j.status} progress={j.progress} startedAt={j.startedAt} now={now} />

                  {/* 前回の結果は、走っていない時だけ出す
                      （実行中に「✅ 完了」が並ぶと、終わったのかと勘違いする） */}
                  {j.status === 'idle' && j.lastRunAt && (
                    <div className={`text-[11px] mt-1.5 ${j.lastOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {j.lastOk ? '✅' : '⚠️'} {hhmm(j.lastRunAt)} {j.lastMessage || (j.lastOk ? '完了' : '失敗')}
                      {/* 前回どの範囲で走ったか。「1人だけ直した」のか「全員に流した」のかが
                          結果だけ見ても分からないので必ず添える。 */}
                      {j.lastTarget && <span className="text-zinc-500">（{j.lastTarget}）</span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => runJob(j)}
                  disabled={!canPress}
                  className={`shrink-0 text-xs font-bold rounded-xl px-4 py-2.5 transition ${
                    running
                      ? 'bg-sky-500/20 text-sky-300 cursor-wait'
                      : canPress
                        ? 'bg-sky-500 text-white active:scale-95'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {j.status === 'running' ? '実行中…'
                    : j.status === 'queued' ? '受付済…'
                    : out ? '本日終了'
                    : j.cooldownLeftSec > 0 ? `あと${j.cooldownLeftSec}秒`
                    : '今すぐ実行'}
                </button>
              </div>
            </div>
          );
  }
}
