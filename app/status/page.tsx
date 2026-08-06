'use client';

import { useEffect, useState } from 'react';
import { SHOP } from '../shop.config';
import JobsPanel from '../JobsPanel';

/* ───────────────────────────────────────────────
   公開・稼働状況ページ（ログイン不要）
   ・中村さんにそのまま送れるビュー。スマホから「今すぐ実行」が押せる。
   ・/api/sites（掲載稼働）・/api/casts（出勤/在籍）・/api/jobs（手動実行）は公開API。
   ・「今すぐ実行」の中身は JobsPanel（管理ダッシュボードにも同じものを埋め込み）。
─────────────────────────────────────────────── */

type Site = { id: string; name: string; auto: boolean; last: string; ready?: boolean };
type Cast = { name: string; today: boolean };

export default function StatusPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [at, setAt] = useState<string>('');

  async function load() {
    try {
      const s = await fetch('/api/sites', { cache: 'no-store' }).then((r) => r.json());
      if (Array.isArray(s)) setSites(s);
    } catch {}
    try {
      const c = await fetch('/api/casts', { cache: 'no-store' }).then((r) => r.json());
      if (Array.isArray(c)) setCasts(c);
    } catch {}
    setAt(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const working = casts.filter((c) => c.today).length;
  const active = sites.filter((s) => s.ready && s.auto).length;
  // 中身がまだ無い媒体（ready:false＝旧「準備中」表示）は、中村さんに見せる画面では出さない。
  // 「準備中」が並んでいると未完成に見えるため。実装できたら shop.config で ready:true にすれば自動で出る。
  const shown = sites.filter((s) => s.ready);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-16">
      <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-black text-lg tracking-tight">
              <span className="text-sky-400">{SHOP.name}</span>
              <span className="text-zinc-300 text-sm font-normal ml-1">自動更新 稼働状況</span>
            </div>
            <div className="text-[11px] text-zinc-500">掲載サイトを24時間 自動更新中</div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" />稼働中 LIVE
            </span>
            {at && <div className="text-[10px] text-zinc-500 mt-1">{at} 更新</div>}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card label="稼働中の媒体" value={`${active}`} unit="サイト" accent="text-sky-400" />
          <Card label="本日出勤" value={`${working}`} unit="名" accent="text-pink-400" />
          <Card label="在籍キャスト" value={`${casts.length}`} unit="名" accent="text-emerald-400" />
        </div>

        {/* 細かい設定は別ページに分ける（このページは中村さんの入口なので今の見た目を保つ） */}
        <a
          href="/times"
          className="flex items-center justify-between gap-3 bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-6 active:scale-[0.99] transition"
        >
          <div className="min-w-0">
            <div className="font-bold">投稿時刻の設定</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              「何時に何を出すか」を変えられます（駅ちか・エステラブ・ココア・MAPなど）
            </div>
          </div>
          <span className="text-sky-400 text-lg shrink-0">›</span>
        </a>

        <h2 className="text-base font-black mb-1">今すぐ実行</h2>
        <p className="text-xs text-zinc-500 mb-4">
          自動更新を待たずに、その場で反映したいときに押してください
        </p>
        <div className="mb-8">
          <JobsPanel />
        </div>

        <h2 className="text-base font-black mb-1">掲載サイト 自動更新</h2>
        <p className="text-xs text-zinc-500 mb-4">各サイトを自動で定期更新し、ランキング上位を維持しています</p>

        <div className="space-y-3">
          {shown.length === 0 && <div className="text-sm text-zinc-500">読み込み中…</div>}
          {shown.map((s) => (
            <div key={s.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex items-center justify-between">
              <div>
                <div className="font-bold">{s.name}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {s.auto ? <>最終更新：{s.last}</> : <span className="text-zinc-500">停止中</span>}
                </div>
              </div>
              {s.auto
                ? <span className="text-xs font-bold text-emerald-400 inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />稼働中</span>
                : <span className="text-xs font-bold text-zinc-500">停止中</span>}
            </div>
          ))}
        </div>

        <p className="text-[11px] text-zinc-600 mt-6 text-center">
          掲載サイトは24時間 自動で更新しています。<br />このページは30秒ごとに自動で最新化されます。
        </p>
      </main>
    </div>
  );
}

function Card({ label, value, unit, accent }: { label: string; value: string; unit: string; accent: string }) {
  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-3 text-center">
      <div className={`text-2xl font-black ${accent}`}>{value}<span className="text-sm ml-0.5">{unit}</span></div>
      <div className="text-[11px] text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}
