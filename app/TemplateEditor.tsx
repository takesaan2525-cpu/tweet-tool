'use client';

import { useEffect, useState } from 'react';

/* ───────────────────────────────────────────────
   投稿文面（タイトル・本文）の編集パーツ（2026-10-13 新規）

   /times の各コンテンツの中に、時刻表の下として置く。
   ・ここで直した文面は /api/templates に保存され、店のPCが1分おきに取りに来る。
     ＝直してから実際のbotに効くまで最大1分。
   ・「保存」を押すまで何も変わらない。押し間違いに備えて「前に戻す」も置く。
     （時刻表の編集とまったく同じ操作感にしてある）

   ★テンプレ名は編集させない＝照合キーだから。見出しとして出すだけ。
   ★文字数は媒体の上限を画面に出す。超えたら保存ボタンを止める
     （送ってから「長すぎます」と言われるより、入力中に分かるほうがいい）。
─────────────────────────────────────────────── */

type Tpl = {
  /** 保存の宛名（key）。画面には出さない */
  name: string;
  /** 画面に出す見出し */
  label: string;
  title: string | null;
  body: string | null;
  updatedAt: number | null;
  canUndo: boolean;
};
type TplSet = {
  id: string; name: string; desc: string;
  titleMax: number; bodyMax: number; photoHint: string; bodyOptional?: boolean;
  templates: Tpl[];
};

export default function TemplateEditor({ timesId }: { timesId: string }) {
  const [set, setSet] = useState<TplSet | null>(null);
  const [draft, setDraft] = useState<Record<string, { title: string; body: string }>>({});
  const [open, setOpen] = useState<string>('');
  const [busy, setBusy] = useState<string>('');
  const [toast, setToast] = useState<string>('');
  const [loaded, setLoaded] = useState(false);

  async function load() {
    try {
      const j = await fetch('/api/templates', { cache: 'no-store' }).then((r) => r.json());
      const s = (j?.sets ?? []).find((x: TplSet) => x.id === timesId) ?? null;
      setSet(s);
      if (s) {
        const d: Record<string, { title: string; body: string }> = {};
        for (const t of s.templates) d[t.name] = { title: t.title ?? '', body: t.body ?? '' };
        setDraft(d);
      }
    } catch { /* 読めなくても時刻表の編集は使えるようにする＝ここは黙って出さない */ }
    setLoaded(true);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [timesId]);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 6000); };

  /* まだ読み込めていない／この時刻表に紐づく文面が無い＝何も出さない。
     （文面を持たないコンテンツ＝駅ちか上位表示などで余計な枠が出ないように） */
  if (!loaded || !set || !set.templates.length) return null;

  async function save(t: Tpl) {
    if (!set) return;
    const d = draft[t.name];
    if (!d) return;
    if (!window.confirm(`「${t.label}」の文面を保存します。\n\n次の投稿から、この内容に差し替わります。\n\nよろしいですか？`)) return;
    setBusy(t.name);
    try {
      const r = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', name: t.name, title: d.title, body: d.body }),
      }).then((x) => x.json());
      if (r?.ok) { say('✅ 保存しました（店のPCに届くまで最大1分）'); await load(); }
      else say(`⚠️ ${r?.error ?? '保存できませんでした'}`);
    } catch { say('⚠️ 通信できませんでした'); }
    setBusy('');
  }

  async function undo(t: Tpl) {
    if (!window.confirm(`「${t.label}」を直前の内容に戻します。よろしいですか？`)) return;
    setBusy(t.name);
    try {
      const r = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'undo', name: t.name }),
      }).then((x) => x.json());
      if (r?.ok) { say('✅ 前の内容に戻しました'); await load(); }
      else say(`⚠️ ${r?.error ?? '戻せませんでした'}`);
    } catch { say('⚠️ 通信できませんでした'); }
    setBusy('');
  }

  return (
    <div className="mt-5 pt-4 border-t border-zinc-800">
      <div className="text-xs font-bold text-zinc-300">文面を直す</div>
      <div className="text-[11px] text-zinc-500 mt-1">{set.desc}</div>

      <div className="space-y-2 mt-3">
        {set.templates.map((t) => {
          const d = draft[t.name] ?? { title: '', body: '' };
          const dirty = d.title !== (t.title ?? '') || d.body !== (t.body ?? '');
          const tooLong = d.title.length > set.titleMax || d.body.length > set.bodyMax;
          const empty = !d.title.trim() || (!set.bodyOptional && !d.body.trim());
          const isOpen = open === t.name;
          return (
            <div key={t.name} className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? '' : t.name)}
                className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2"
              >
                <span className="text-xs text-zinc-300 min-w-0 truncate">{t.label}</span>
                <span className="text-[11px] text-zinc-500 shrink-0">
                  {dirty ? '未保存' : isOpen ? '閉じる' : '直す'}
                </span>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-3">
                  {t.title === null ? (
                    /* ★「空」ではなく「まだ届いていない」と書く。
                       ここで空欄を出すと、保存して本物の文面を消しかねない。 */
                    <div className="text-[11px] text-amber-400">
                      いまの文面をまだ店のPCから受け取っていません。1〜2分待ってから開き直してください。
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">タイトル</span>
                          <span className={`text-[10px] ${d.title.length > set.titleMax ? 'text-rose-400' : 'text-zinc-600'}`}>
                            {d.title.length} / {set.titleMax}文字
                          </span>
                        </div>
                        <input
                          value={d.title}
                          onChange={(e) => setDraft((p) => ({ ...p, [t.name]: { ...d, title: e.target.value } }))}
                          className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">本文</span>
                          <span className={`text-[10px] ${d.body.length > set.bodyMax ? 'text-rose-400' : 'text-zinc-600'}`}>
                            {d.body.length} / {set.bodyMax}文字
                          </span>
                        </div>
                        <textarea
                          value={d.body}
                          rows={10}
                          onChange={(e) => setDraft((p) => ({ ...p, [t.name]: { ...d, body: e.target.value } }))}
                          className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 leading-relaxed"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => save(t)}
                          disabled={!dirty || tooLong || empty || busy === t.name}
                          className={`flex-1 text-sm font-bold rounded-xl py-2.5 transition ${
                            dirty && !tooLong && !empty && busy !== t.name
                              ? 'bg-sky-500 text-white active:scale-95'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {busy === t.name ? '保存中…'
                            : empty ? '空欄があります'
                            : tooLong ? '文字数が多すぎます'
                            : dirty ? '保存する' : '変更なし'}
                        </button>
                        {dirty && (
                          <button
                            onClick={() => setDraft((p) => ({ ...p, [t.name]: { title: t.title ?? '', body: t.body ?? '' } }))}
                            className="text-xs font-bold text-zinc-400 border border-zinc-700 rounded-xl px-4"
                          >
                            やめる
                          </button>
                        )}
                        {!dirty && t.canUndo && (
                          <button
                            onClick={() => undo(t)}
                            disabled={busy === t.name}
                            className="text-xs font-bold text-zinc-400 border border-zinc-700 rounded-xl px-4"
                          >
                            前に戻す
                          </button>
                        )}
                      </div>

                      {t.updatedAt && (
                        <div className="text-[10px] text-zinc-600 text-center">
                          最終変更：{new Date(t.updatedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 写真はこの画面では直さない。/photos に既に動いている仕組みがあるので、そこへ送る。
          ★同じことを2か所に作ると、どちらが本物か分からなくなる。 */}
      <a
        href="/photos"
        className="mt-3 block text-center text-xs font-bold text-zinc-300 border border-zinc-700 rounded-xl py-2.5"
      >
        写真を差し替える（写真のページへ）
      </a>
      {set.photoHint && <div className="text-[10px] text-zinc-600 mt-1.5 text-center">{set.photoHint}</div>}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[92vw]">
          <div className="bg-zinc-800 border border-zinc-700 text-white text-xs font-bold rounded-xl px-4 py-3 shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
