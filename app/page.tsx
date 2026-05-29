'use client';

import { useState, useMemo } from 'react';

/* ─────────────────────────────────────────────
   テンプレート定義
───────────────────────────────────────────── */
type VarDef = { key: string; label: string; placeholder: string };

type Template = {
  id: number;
  category: string;
  emoji: string;
  title: string;
  vars: VarDef[];
  build: (v: Record<string, string>) => string;
};

const TEMPLATES: Template[] = [
  {
    id: 1,
    category: '実績',
    emoji: '🏆',
    title: '制作実績を報告する',
    vars: [
      { key: '業種', label: 'お客様の業種', placeholder: '例：美容室、整体院、ネイルサロン' },
    ],
    build: (v) =>
      `【制作実績 ✨】
${v['業種'] || '[業種]'}様のホームページが完成しました！

📱 スマホ対応デザイン
📞 LINE・電話・地図リンク
💴 料金表・サービス紹介

初期費用6万円・月額1万円で
集客に使えるHPが持てます。

無料相談→ https://lin.ee/Y4Uq7uP

#ホームページ制作 #個人事業主 #${v['業種'] || '格安HP'}`,
  },
  {
    id: 2,
    category: '実績',
    emoji: '📸',
    title: 'ビフォー→アフター紹介',
    vars: [
      { key: '業種', label: 'お客様の業種', placeholder: '例：整体院' },
      { key: 'before', label: 'Before（制作前の状況）', placeholder: '例：SNSのみで集客' },
      { key: 'after', label: 'After（制作後の変化）', placeholder: '例：問い合わせが月3件→10件に' },
    ],
    build: (v) =>
      `【Before → After 🔄】

${v['業種'] || '[業種]'}様の事例です

▶ Before
${v['before'] || 'SNSのみで集客'}

▶ After
${v['after'] || 'ホームページから問い合わせが増えた'}

1ページのHPでここまで変わります。

初期6万円・月1万円〜
無料相談→ https://lin.ee/Y4Uq7uP

#ホームページ制作 #${v['業種'] || '個人事業主'}`,
  },
  {
    id: 3,
    category: '豆知識',
    emoji: '💡',
    title: 'Googleマップだけでは損してる話',
    vars: [],
    build: () =>
      `【知ってほしい事実】

Googleマップに載っていても
公式HPがないと、お客様の
離脱率がぐっと上がります📉

名刺代わりの1ページだけでいい。
料金・予約・LINE・地図がまとまればOK。

初期6万円・月1万円で作れます✨

#個人事業主 #集客 #HP制作`,
  },
  {
    id: 4,
    category: '豆知識',
    emoji: '📱',
    title: 'インスタだけ集客の限界',
    vars: [],
    build: () =>
      `Instagramで集客してる人へ

❌ 料金表が投稿に流れていく
❌ 予約方法が毎回DMで手間
❌ プロフィール欄がごちゃごちゃ

→ ホームページ1枚あれば全部解決

しかも6万円・月1万円で作れます💡

お気軽にLINEどうぞ👇
https://lin.ee/Y4Uq7uP

#Instagram集客 #個人事業主`,
  },
  {
    id: 5,
    category: '営業',
    emoji: '📣',
    title: '料金・サービス紹介',
    vars: [],
    build: () =>
      `個人事業主・店舗オーナーさんへ

「ホームページ、高くて後回し...」
そんな悩みを解決します。

✅ 初期制作費 60,000円
✅ 月額管理費 10,000円
✅ スマホ対応・いつでも解約OK

LINE・地図・料金表を1ページに。
無料相談はこちら👇
https://lin.ee/Y4Uq7uP

#個人事業主 #HP制作 #格安`,
  },
  {
    id: 6,
    category: '営業',
    emoji: '🎁',
    title: '無料ページ案の告知',
    vars: [
      { key: '業種', label: 'ターゲット業種（任意）', placeholder: '例：美容室、整体院' },
    ],
    build: (v) =>
      `${v['業種'] ? `【${v['業種']}さん向け】` : '【無料プレゼント】'}

ホームページの
ページ案を無料で作ります！

・現状ヒアリング
・構成案の提案
・料金のご説明

全部LINEで完結、費用0円、勧誘なし。

「HP相談」とLINEで送ってください👇
https://lin.ee/Y4Uq7uP

#${v['業種'] || '個人事業主'} #無料相談 #HP制作`,
  },
  {
    id: 7,
    category: '共感',
    emoji: '🤝',
    title: 'HPへの疑問に共感',
    vars: [],
    build: () =>
      `「HPって本当に必要？」

正直、SNSだけでも
集客できてる人は多い。

ただ、こんな悩みはありませんか？

→「予約方法が分からない」と言われる
→ Googleで検索した人が離脱する
→ 料金を毎回DMで説明している

1ページHPで全部解決します。
月1万円から。

#個人事業主 #集客 #ホームページ`,
  },
];

const CATEGORIES = ['すべて', '実績', '豆知識', '営業', '共感'];
const MAX_CHARS = 280;

/* ─────────────────────────────────────────────
   メインコンポーネント
───────────────────────────────────────────── */
export default function Page() {
  const [activeCategory, setActiveCategory] = useState('すべて');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      activeCategory === 'すべて'
        ? TEMPLATES
        : TEMPLATES.filter((t) => t.category === activeCategory),
    [activeCategory],
  );

  const selected = TEMPLATES.find((t) => t.id === selectedId) ?? null;

  const tweetText = selected ? selected.build(vars) : '';
  const charCount = [...tweetText].length; // 絵文字も1文字カウント
  const charColor =
    charCount > MAX_CHARS
      ? 'text-red-400'
      : charCount > 240
        ? 'text-yellow-400'
        : 'text-zinc-400';

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  function selectTemplate(id: number) {
    if (selectedId === id) {
      setSelectedId(null);
      setVars({});
    } else {
      setSelectedId(id);
      setVars({});
    }
  }

  function setVar(key: string, value: string) {
    setVars((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-50 bg-zinc-900/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-blue-400 font-black text-lg">GrowUP</span>
            <span className="text-zinc-400 text-sm ml-2">X投稿ツール</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
            {TEMPLATES.length}テンプレート
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* ── カテゴリタブ ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setSelectedId(null); setVars({}); }}
              className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── テンプレートカード一覧 ── */}
        <div className="space-y-3">
          {filtered.map((tmpl) => {
            const isSelected = selectedId === tmpl.id;
            return (
              <div key={tmpl.id} className="rounded-2xl overflow-hidden">
                {/* カードヘッダー */}
                <button
                  onClick={() => selectTemplate(tmpl.id)}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-all ${
                    isSelected
                      ? 'bg-blue-600'
                      : 'bg-zinc-900 hover:bg-zinc-800'
                  }`}
                >
                  <span className="text-2xl">{tmpl.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-blue-500/50 text-blue-100' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {tmpl.category}
                      </span>
                    </div>
                    <p className="font-bold text-sm leading-snug">{tmpl.title}</p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-zinc-400 transition-transform shrink-0 ${isSelected ? 'rotate-180 text-white' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* 展開パネル */}
                {isSelected && (
                  <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-5 space-y-4">

                    {/* 入力フィールド */}
                    {tmpl.vars.length > 0 && (
                      <div className="space-y-3">
                        {tmpl.vars.map((v) => (
                          <div key={v.key}>
                            <label className="block text-xs font-bold text-zinc-400 mb-1">
                              {v.label}
                            </label>
                            <input
                              type="text"
                              value={vars[v.key] ?? ''}
                              onChange={(e) => setVar(v.key, e.target.value)}
                              placeholder={v.placeholder}
                              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* プレビュー */}
                    <div className="bg-black rounded-xl p-4 border border-zinc-800">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-700" />
                        <div>
                          <div className="text-xs font-bold">GrowUP サポート</div>
                          <div className="text-xs text-zinc-500">@growup_support</div>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-100">
                        {tweetText}
                      </p>
                      <div className={`text-xs mt-3 text-right font-mono ${charColor}`}>
                        {charCount} / {MAX_CHARS}
                      </div>
                    </div>

                    {/* 投稿ボタン */}
                    <a
                      href={tweetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl font-black text-lg transition-all ${
                        charCount > MAX_CHARS
                          ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed pointer-events-none'
                          : 'bg-black border-2 border-zinc-600 hover:border-zinc-400 hover:bg-zinc-900 active:scale-95'
                      }`}
                    >
                      {/* X (Twitter) ロゴ */}
                      <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Xで投稿する
                    </a>

                    {/* コピーボタン */}
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(tweetText);
                        alert('コピーしました！');
                      }}
                      className="w-full py-2.5 rounded-xl text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    >
                      📋 テキストをコピー
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div className="text-center text-xs text-zinc-700 pb-4">
          GrowUP サポート — HP制作 営業ツール
        </div>
      </div>
    </div>
  );
}
