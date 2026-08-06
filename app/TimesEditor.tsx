'use client';

import { useEffect, useState } from 'react';

/* ───────────────────────────────────────────────
   投稿時刻の編集パーツ（/times ページと、管理ダッシュボードの
   「掲載更新」タブの両方から同じものを使う）

   ・ここで直した時刻は /api/times に保存され、店のPCが1分おきに取りに来る。
     ＝押してから実際のbotに効くまで最大1分。
   ・「保存」を押すまで何も変わらない。押し間違いに備えて「前に戻す」も置いてある。
   ・embedded=true … 見出し・余白を親側に任せる（ダッシュボードに埋め込むとき）
─────────────────────────────────────────────── */

type Choice = { value: string; label: string };
type Slot = { time: string; choice?: string };
type Content = {
  id: string; name: string; desc: string; file: string;
  shape: 'times' | 'schedule' | 'times+assign';
  resetHour: number; dailyCap: number | null;
  choices: Choice[]; note: string;
  slots: Slot[] | null; updatedAt: number | null; canUndo: boolean;
};

/* 並べ替えは「1日の区切り(resetHour)」を基準にする。
   例：ココアは朝5時が区切りなので 03:04 は"翌朝"＝いちばん最後に置く。
   時計順に並べると最後の枠が先頭に来て、中村さんが読み違える。 */
const dayMin = (t: string, resetHour: number) => {
  const [h, m] = t.split(':').map(Number);
  return ((h * 60 + m) - resetHour * 60 + 1440) % 1440;
};
const sortSlots = (s: Slot[], resetHour = 0) =>
  [...s].sort((a, b) => dayMin(a.time, resetHour) - dayMin(b.time, resetHour));

export default function TimesEditor({ embedded = false }: { embedded?: boolean }) {
  const [contents, setContents] = useState<Content[]>([]);
  // 編集中の内容（保存するまでサーバーには送らない）
  const [draft, setDraft] = useState<Record<string, Slot[]>>({});
  const [open, setOpen] = useState<string>('');
  const [busy, setBusy] = useState<string>('');
  const [toast, setToast] = useState<string>('');
  const [loaded, setLoaded] = useState(false);

  async function load() {
    try {
      const j = await fetch('/api/times', { cache: 'no-store' }).then((r) => r.json());
      if (Array.isArray(j?.contents)) {
        setContents(j.contents);
        const d: Record<string, Slot[]> = {};
        for (const c of j.contents as Content[]) d[c.id] = sortSlots(c.slots ?? [], c.resetHour);
        setDraft(d);
      }
    } catch {}
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 6000); };

  function edit(id: string, fn: (s: Slot[]) => Slot[]) {
    setDraft((p) => ({ ...p, [id]: fn(p[id] ?? []) }));
  }

  async function save(c: Content) {
    const slots = sortSlots(draft[c.id] ?? [], c.resetHour);
    if (!slots.length && !window.confirm(`「${c.name}」の時刻をすべて消します。\nこの媒体の自動投稿は止まります。よろしいですか？`)) return;
    if (!window.confirm(`「${c.name}」の時刻を保存します。\n\n${slots.length}件（${slots.map((s) => s.time).join(' / ')}）\n\nよろしいですか？`)) return;
    setBusy(c.id);
    try {
      const r = await fetch('/api/times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', id: c.id, slots }),
      }).then((res) => res.json());
      say(r?.ok ? `「${c.name}」を保存しました。1分ほどで反映されます` : (r?.error ?? '保存できませんでした'));
      if (r?.ok) await load();
    } catch {
      say('通信できませんでした。電波のいいところで もう一度お試しください');
    }
    setBusy('');
  }

  async function undo(c: Content) {
    if (!window.confirm(`「${c.name}」を1つ前の内容に戻します。よろしいですか？`)) return;
    setBusy(c.id);
    try {
      const r = await fetch('/api/times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'undo', id: c.id }),
      }).then((res) => res.json());
      say(r?.ok ? `「${c.name}」を前の内容に戻しました` : (r?.error ?? '戻せませんでした'));
      if (r?.ok) await load();
    } catch {
      say('通信できませんでした');
    }
    setBusy('');
  }

  return (
    <div className={embedded ? '' : 'pb-24'}>
      <div className={embedded ? '' : 'max-w-2xl mx-auto px-4 py-5'}>
        {/* ★2026-08-01：中村さんから「開くと勝手に更新されるのでは」と質問があった。
            「開く」はただ中身を見るだけで、投稿も保存も一切起きない。
            誤解したまま触れなくなるのがいちばん困るので、最初にはっきり書く。 */}
        <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
          変えたい媒体をタップして開き、時刻を直して「保存」を押してください。<br />
          <span className="text-zinc-300">「開く」を押しても何も起きません</span>（中を見るだけです）。
          投稿されたり時刻が変わったりするのは、<span className="text-zinc-300">「保存」を押したときだけ</span>です。<br />
          保存すると1分ほどで自動更新に反映されます。
        </p>

        {!loaded && <div className="text-sm text-zinc-500">読み込み中…</div>}

        <div className="space-y-3">
          {contents.map((c) => {
            const slots = draft[c.id] ?? [];
            const isOpen = open === c.id;
            const dirty = JSON.stringify(sortSlots(slots, c.resetHour)) !== JSON.stringify(sortSlots(c.slots ?? [], c.resetHour));
            const notSeeded = c.slots === null;
            return (
              <div key={c.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? '' : c.id)}
                  className="w-full text-left p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold flex items-center gap-2 flex-wrap">
                      {c.name}
                      {dirty && <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">未保存</span>}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      {notSeeded
                        ? '店のPCから読み込み中です…'
                        : <>1日 {slots.length}回{c.dailyCap ? `（上限${c.dailyCap}回）` : ''} ・ {slots.slice(0, 4).map((s) => s.time).join(' ')}{slots.length > 4 ? ' …' : ''}</>}
                    </div>
                  </div>
                  <span className="text-zinc-500 text-xs shrink-0">{isOpen ? '閉じる' : '開く'}</span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-zinc-800 pt-4">
                    <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
                      {c.desc}
                      {c.note && <><br /><span className="text-zinc-600">※{c.note}</span></>}
                    </p>

                    {notSeeded ? (
                      <div className="text-xs text-zinc-500">
                        まだ店のPCから今の設定が届いていません。しばらくしてから開き直してください。
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {slots.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="time"
                                value={s.time}
                                onChange={(e) =>
                                  edit(c.id, (p) => p.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))
                                }
                                className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-bold tabular-nums w-[7.5rem] shrink-0"
                              />
                              {c.choices.length > 0 && (
                                <select
                                  value={s.choice ?? c.choices[0].value}
                                  onChange={(e) =>
                                    edit(c.id, (p) => p.map((x, j) => (j === i ? { ...x, choice: e.target.value } : x)))
                                  }
                                  className="bg-zinc-800 border border-zinc-700 rounded-xl px-2 py-2 text-xs min-w-0 flex-1"
                                >
                                  {c.choices.map((ch) => (
                                    <option key={ch.value} value={ch.value}>{ch.label}</option>
                                  ))}
                                </select>
                              )}
                              <button
                                onClick={() => edit(c.id, (p) => p.filter((_, j) => j !== i))}
                                className="shrink-0 text-xs text-zinc-500 border border-zinc-700 rounded-xl px-3 py-2 active:scale-95"
                                aria-label="この時刻を消す"
                              >
                                消す
                              </button>
                            </div>
                          ))}
                          {slots.length === 0 && (
                            <div className="text-xs text-amber-400">時刻がありません。このままだと自動投稿は止まります。</div>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            edit(c.id, (p) => [
                              ...p,
                              { time: '12:00', ...(c.choices.length ? { choice: c.choices[0].value } : {}) },
                            ])
                          }
                          disabled={!!c.dailyCap && slots.length >= c.dailyCap}
                          className="mt-3 w-full text-xs font-bold border border-zinc-700 text-zinc-300 rounded-xl py-2.5 disabled:text-zinc-600 disabled:border-zinc-800"
                        >
                          {!!c.dailyCap && slots.length >= c.dailyCap ? `上限の${c.dailyCap}件です` : '＋ 時刻を追加'}
                        </button>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => save(c)}
                            disabled={!dirty || busy === c.id}
                            className={`flex-1 text-sm font-bold rounded-xl py-3 transition ${
                              dirty && busy !== c.id
                                ? 'bg-sky-500 text-white active:scale-95'
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            {busy === c.id ? '保存中…' : dirty ? '保存する' : '変更なし'}
                          </button>
                          {dirty && (
                            <button
                              onClick={() => edit(c.id, () => sortSlots(c.slots ?? [], c.resetHour))}
                              className="text-xs font-bold text-zinc-400 border border-zinc-700 rounded-xl px-4"
                            >
                              やめる
                            </button>
                          )}
                          {!dirty && c.canUndo && (
                            <button
                              onClick={() => undo(c)}
                              disabled={busy === c.id}
                              className="text-xs font-bold text-zinc-400 border border-zinc-700 rounded-xl px-4"
                            >
                              前に戻す
                            </button>
                          )}
                        </div>

                        {c.updatedAt && (
                          <div className="text-[10px] text-zinc-600 mt-2 text-center">
                            最終変更：{new Date(c.updatedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

        <p className="text-[11px] text-zinc-600 mt-6 text-center leading-relaxed">
          時刻を早い方にずらしたときは、その日はもう過ぎた枠として扱われます<br />（変えた瞬間にまとめて投稿されないようにするためです）。
        </p>
      </div>

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
