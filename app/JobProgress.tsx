'use client';

/* ───────────────────────────────────────────────
   実行中の「いま何をしているか」を出す行（2026-08-31 追加）

   それまで画面は「受付済 → 実行中… → 結果」の3段しか出しておらず、
   10分かかる削除の間ずっと黙っていた。中村さんに
   「今削除してるのですが、削除完了してるのかわからないんですよ！」
   と言わせた原因がこれ。

   店のPCの runner.js が、botの出力から節目の行を拾って送ってくる。
   まだ1行も届いていない時は「店のPCが受け取るのを待っています」と出す
   ＝黙らせない。経過時間も添える（止まっているのか進んでいるのかの判断材料）。
─────────────────────────────────────────────── */

/** 経過時間を「3分20秒」の形にする。0秒台は「まもなく」 */
export function elapsedLabel(startedAt: number | null, now: number): string {
  if (!startedAt) return '';
  const sec = Math.max(0, Math.round((now - startedAt) / 1000));
  if (sec < 5) return 'まもなく';
  if (sec < 60) return `${sec}秒経過`;
  return `${Math.floor(sec / 60)}分${String(sec % 60).padStart(2, '0')}秒経過`;
}

export default function JobProgress({
  status, progress, startedAt, now,
}: {
  status: 'idle' | 'queued' | 'running';
  progress: string;
  startedAt: number | null;
  /** 呼ぶ側が数秒ごとに更新している時刻。経過表示をここで動かす */
  now: number;
}) {
  if (status === 'idle') return null;

  const waiting = status === 'queued';
  const el = elapsedLabel(startedAt, now);

  return (
    <div className="mt-2 rounded-xl border border-sky-500/25 bg-sky-500/5 px-3 py-2">
      <div className="flex items-center gap-2">
        {/* 動いているものが画面にある、と目で分かるようにする */}
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
        <span className="text-[11px] font-bold text-sky-300">
          {waiting ? '店のPCが受け取るのを待っています' : '実行中'}
        </span>
        {!waiting && el && <span className="text-[10px] text-zinc-500">{el}</span>}
      </div>
      <div className="text-[11px] text-zinc-300 mt-1 leading-relaxed break-words">
        {waiting
          ? '押した内容は届いています。店のPCが1分以内に拾います'
          : progress || '準備しています…'}
      </div>
    </div>
  );
}
