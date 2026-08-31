'use client';

import type { DoneNotice } from './useJobDone';

/* 「終わりました」のお知らせ（×を押すまで消えない）。
   実行中の表示と同じ場所の並びに出す＝押した人が見ていた場所に残る。 */
export default function JobDoneNotices({
  notices, onDismiss, onAskDeviceNotice, deviceNoticeState,
}: {
  notices: DoneNotice[];
  onDismiss: (at: number, id: string) => void;
  onAskDeviceNotice?: () => void;
  /** 'granted' なら案内を出さない（もう出る状態なので） */
  deviceNoticeState?: string;
}) {
  if (!notices.length) return null;
  return (
    <div className="space-y-2">
      {notices.map((n) => (
        <div
          key={`${n.id}:${n.at}`}
          className={`rounded-xl border px-3 py-2.5 ${
            n.ok
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-amber-500/30 bg-amber-500/10'
          }`}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className={`text-xs font-bold ${n.ok ? 'text-emerald-300' : 'text-amber-300'}`}>
                {n.ok ? '✅' : '⚠️'} {n.name} が終わりました
                <span className="text-zinc-500 font-normal ml-2">
                  {new Date(n.at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-[11px] text-zinc-300 mt-1 leading-relaxed break-words">{n.message}</div>
              {/* 画面を見ていなくても気づけるようにする案内。押した時だけ許可を聞く。 */}
              {onAskDeviceNotice && deviceNoticeState !== 'granted' && (
                <button
                  onClick={onAskDeviceNotice}
                  className="text-[10px] text-sky-400 underline mt-1.5"
                >
                  終わった時にスマホにも通知する
                </button>
              )}
            </div>
            <button
              onClick={() => onDismiss(n.at, n.id)}
              className="text-zinc-500 text-lg leading-none px-1 shrink-0"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
