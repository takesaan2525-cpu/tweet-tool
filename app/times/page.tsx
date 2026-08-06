'use client';

import { useEffect, useState } from 'react';
import { SHOP } from '../shop.config';
import TimesEditor from '../TimesEditor';

/* ───────────────────────────────────────────────
   投稿時刻の設定ページ（ログイン不要）

   中身は TimesEditor（管理ダッシュボードの「掲載更新」タブにも
   同じものを埋め込んでいる）。このページはヘッダーと戻り先だけを持つ。
─────────────────────────────────────────────── */

export default function TimesPage() {
  /* 戻り先は「来たページ」に合わせる。
     ダッシュボード（管理用・鍵つき）から来た人にはダッシュボードへ、
     それ以外（中村さんの入口＝稼働状況ページ）には /status へ返す。
     ※/times に常時ダッシュボードのリンクを置くと、鍵のない人には404になるため。 */
  const [back, setBack] = useState<{ href: string; label: string }>({ href: '/status', label: '稼働状況にもどる' });
  useEffect(() => {
    try {
      if (new URL(document.referrer).pathname.startsWith('/dashboard')) {
        setBack({ href: '/dashboard', label: '管理ダッシュボードにもどる' });
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <a href={back.href} className="text-[11px] text-sky-400">← {back.label}</a>
          <div className="font-black text-lg tracking-tight mt-0.5">
            <span className="text-sky-400">{SHOP.name}</span>
            <span className="text-zinc-300 text-sm font-normal ml-1">投稿時刻の設定</span>
          </div>
          <div className="text-[11px] text-zinc-500">「何時に何を出すか」をここで変えられます</div>
        </div>
      </header>

      <TimesEditor />
    </div>
  );
}
