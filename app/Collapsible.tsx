'use client';

import { useState, type ReactNode } from 'react';

/* ───────────────────────────────────────────────
   折りたたみの見出し（2026-08-01 新規）

   ★なぜ作ったか
     ダッシュボードの「掲載更新」タブに［掲載サイトON/OFF → 今すぐ実行 →
     投稿時刻の設定］を全部入れた結果、縦に長くなりすぎてスマホで探せなくなった。
     ベンリーの「コンテンツ一覧」のように、まず見出しが一覧で並んでいて、
     開きたいものだけ開く形にする。

   ・open で最初から開いておくものを決める（いちばんよく使うものだけ開く）
   ・閉じていても中身はReactツリーに残す＝入力中の内容が閉じても消えない
     （hidden で隠すだけ。付け外しにすると編集中の時刻が飛ぶ）
─────────────────────────────────────────────── */

export default function Collapsible({
  title,
  sub,
  open: initial = false,
  badge,
  children,
}: {
  title: string;
  sub?: string;
  open?: boolean;
  /** 見出しの右に出す小さな文字（「7サイト」など） */
  badge?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initial);

  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 bg-zinc-900 px-4 py-4 text-left active:bg-zinc-800/60 transition"
      >
        <div className="min-w-0">
          <div className="font-bold text-sm">{title}</div>
          {sub && <div className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{sub}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge && <span className="text-[11px] text-zinc-500">{badge}</span>}
          <span className={`text-zinc-400 text-lg transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        </div>
      </button>
      {/* 閉じている間も中身は残す（編集中の内容を失わないため） */}
      <div hidden={!open} className="px-4 pt-4 pb-5 border-t border-zinc-800">
        {children}
      </div>
    </div>
  );
}
