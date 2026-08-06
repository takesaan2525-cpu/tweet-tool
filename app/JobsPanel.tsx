'use client';

import { useEffect, useState } from 'react';

/* ───────────────────────────────────────────────
   「今すぐ実行」パーツ（/status ページと、管理ダッシュボードの
   「掲載更新」タブの両方から同じものを使う）

   押すと /api/jobs にキューが1件積まれ、店のPCの runner.js が拾って
   実際のbotを走らせる。＝ブラウザ側に鍵を置かずに手動実行ができる。
   ・実行中のものがあれば5秒ごと、平常時は30秒ごとに状態を取り直す。
─────────────────────────────────────────────── */

type Job = {
  id: string; name: string; desc: string; kind: 'attend' | 'boost' | 'post' | 'cast';
  danger?: boolean;
  status: 'idle' | 'queued' | 'running';
  lastRunAt: number | null; lastOk: boolean | null; lastMessage: string;
  cooldownLeftSec: number; canRun: boolean;
};

/** 本日の残り回数（/api/counts）。店のPCが30分おきに媒体から読んでくる */
type Counter = {
  id: string; label: string; jobId: string | null;
  dailyCap: number | null; remaining: number | null;
  readAt: number | null; fresh: boolean; exhausted: boolean;
};

const KIND_LABEL: Record<Job['kind'], string> = { attend: '出勤', boost: '上位表示', post: '投稿', cast: 'キャスト' };
const KIND_STYLE: Record<Job['kind'], string> = {
  attend: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  boost: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  post: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  cast: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

const hhmm = (ms: number | null) =>
  ms ? new Date(ms).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '';

export default function JobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [toast, setToast] = useState('');

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

  async function runJob(j: Job) {
    // 残り0＝押しても媒体側で弾かれるだけなので、ここで止めて理由を出す
    if (isOut(j.id)) {
      setToast(`「${j.name}」は本日の回数を使い切りました。明日またお使いください`);
      setTimeout(() => setToast(''), 6000);
      return;
    }
    // 投稿・上位化は取り消せないので、押し間違い防止に一度だけ確認する
    if (j.kind !== 'attend' && !window.confirm(`「${j.name}」を今すぐ実行します。\n\n${j.desc}\n\nよろしいですか？`)) return;
    setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, status: 'queued', canRun: false } : x)));
    try {
      const r = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enqueue', id: j.id }),
      }).then((res) => res.json());
      setToast(r?.ok ? `「${j.name}」を受け付けました。実行まで少しお待ちください` : (r?.error ?? '実行できませんでした'));
    } catch {
      setToast('通信できませんでした。電波のいいところで もう一度お試しください');
    }
    setTimeout(() => setToast(''), 6000);
    load();
  }

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

        {jobs.map((j) => {
          const running = j.status !== 'idle';
          const cs = countsOf(j.id);
          const out = isOut(j.id);
          const canPress = j.canRun && !out;
          return (
            <div key={j.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${KIND_STYLE[j.kind]}`}>
                      {KIND_LABEL[j.kind]}
                    </span>
                    <span className="font-bold">{j.name}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{j.desc}</div>

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

                  {j.lastRunAt && (
                    <div className={`text-[11px] mt-1.5 ${j.lastOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {j.lastOk ? '✅' : '⚠️'} {hhmm(j.lastRunAt)} {j.lastMessage || (j.lastOk ? '完了' : '失敗')}
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
        })}
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
}
