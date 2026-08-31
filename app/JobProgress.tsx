'use client';

/* ───────────────────────────────────────────────
   実行中の「いま何をしているか」を出す行（2026-08-31 追加）

   それまで画面は「受付済 → 実行中… → 結果」の3段しか出しておらず、
   10分かかる削除の間ずっと黙っていた。中村さんに
   「今削除してるのですが、削除完了してるのかわからないんですよ！」
   と言わせた原因がこれ。

   店のPCの runner.js が、botの出力から節目の行を拾って送ってくる。
   まだ1行も届いていない時は「店のPCが受け取るのを待っています」と出す
   ＝黙らせない。

   ★2026-09-01：進み具合のバーと「あと約○分」を足した。
     ただし本当の進捗率は分からない（botは「全部で何工程あるか」を
     先に知らせてこない）。出しているのは **前回かかった時間を基準にした
     目安** で、画面にもそう書いてある。実際より早く100%に見えると
     「終わったのに終わっていない」になるので、95%で止めて、
     超えたら「もうすぐ終わります」に切り替える。
─────────────────────────────────────────────── */

/** 経過時間を「3分20秒」の形にする。0秒台は「まもなく」 */
export function elapsedLabel(startedAt: number | null, now: number): string {
  if (!startedAt) return '';
  const sec = Math.max(0, Math.round((now - startedAt) / 1000));
  if (sec < 5) return 'まもなく';
  if (sec < 60) return `${sec}秒経過`;
  return `${Math.floor(sec / 60)}分${String(sec % 60).padStart(2, '0')}秒経過`;
}

/** 残りを「あと約3分」の形にする。1分未満はまるめて「あと1分ほど」 */
function remainLabel(sec: number): string {
  if (sec <= 60) return 'あと1分ほど';
  return `あと約${Math.ceil(sec / 60)}分`;
}

export default function JobProgress({
  status, progress, startedAt, etaSec, now,
}: {
  status: 'idle' | 'queued' | 'running';
  progress: string;
  startedAt: number | null;
  /** ふだんかかる秒数（前回の実測）。null＝まだ分からない＝バーを出さない */
  etaSec?: number | null;
  /** 呼ぶ側が1秒ごとに更新している時刻。経過表示をここで動かす */
  now: number;
}) {
  if (status === 'idle') return null;

  const waiting = status === 'queued';
  const el = elapsedLabel(startedAt, now);

  const elapsedSec = startedAt ? Math.max(0, (now - startedAt) / 1000) : 0;
  const hasEta = !waiting && Boolean(etaSec) && Boolean(startedAt);
  const pct = hasEta ? Math.min(95, Math.round((elapsedSec / (etaSec as number)) * 100)) : 0;
  const leftSec = hasEta ? Math.round((etaSec as number) - elapsedSec) : 0;

  return (
    <div className="mt-2 rounded-xl border border-sky-500/25 bg-sky-500/5 px-3 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* 動いているものが画面にある、と目で分かるようにする */}
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
        <span className="text-[11px] font-bold text-sky-300">
          {waiting ? '店のPCが受け取るのを待っています' : '実行中'}
        </span>
        {!waiting && el && <span className="text-[10px] text-zinc-500">{el}</span>}
        {hasEta && (
          <span className="text-[10px] text-zinc-400 ml-auto">
            {leftSec > 0 ? remainLabel(leftSec) : 'もうすぐ終わります'}
          </span>
        )}
      </div>

      {/* 進み具合のバー。前回かかった時間からの目安なので、そう書いておく。 */}
      {hasEta && (
        <div className="mt-1.5">
          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[10px] text-zinc-600 mt-1">
            {pct}%（前回 {Math.round((etaSec as number) / 60) || 1}分ほどでした。目安です）
          </div>
        </div>
      )}

      <div className="text-[11px] text-zinc-300 mt-1 leading-relaxed break-words">
        {waiting
          ? '押した内容は届いています。店のPCが1分以内に拾います'
          : progress || '準備しています…'}
      </div>
    </div>
  );
}
