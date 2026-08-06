import StaffPanel from '../StaffPanel';

/* キャスト管理の単独ページ。
   中身は StaffPanel（管理ダッシュボードの「キャスト」タブと同じ部品）。
   ＝どちらで直しても同じ名簿を触っている。 */
export default function StaffPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-16">
      <header className="bg-zinc-900 px-5 py-5 border-b border-zinc-800">
        {/* 入口は管理ダッシュボードの「キャスト」タブ。戻れないと迷子になるので戻り先を置く */}
        <a href="/dashboard" className="text-[11px] text-blue-400">← 管理ダッシュボードにもどる</a>
        <h1 className="text-xl font-black mt-0.5">キャスト管理</h1>
        <p className="text-zinc-500 text-xs mt-1">追加・編集・卒業、出勤切替、LINE連携をここで全部できます</p>
      </header>

      <main className="max-w-md mx-auto px-4 py-5">
        <StaffPanel />
      </main>
    </div>
  );
}
