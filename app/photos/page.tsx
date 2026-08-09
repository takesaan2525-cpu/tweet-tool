'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SHOP } from '../shop.config';

/* ───────────────────────────────────────────────
   エステラブ 新着情報の写真差し替え（2026-08-08 新規）

   ・投稿5件が並ぶ。写真を選ぶとその場で600×800のjpgに縮めて送る。
   ・実際に差し替えるのは店のPC（runner.js → eslove_photo.js）。
     エステラブは1アカウント1ログイン制なので、常駐を一瞬止めて作業する＝
     押してから反映まで1〜3分かかる。画面はその間ずっと「差し替え中」を出す。

   ★なぜブラウザ側で縮めるか
     ①元写真がそのままだと数MBあってRedisに載らない
     ②サイズを揃えないと一覧で1枚だけ小さく表示される（2026-08-08に実際に発生。
       236×315の写真が混ざっていて、他の600×800より小さく出ていた）
─────────────────────────────────────────────── */

/** 中村さんの運用に合わせた出力サイズ。エステラブの推奨は420×315（4:3横長）だが、
    今の運用は600×800（3:4縦長）で揃えているのでそちらに合わせる。 */
const OUT_W = 600;
const OUT_H = 800;

type Post = { slot: number; id: string; title: string; photo: string; category?: string };
type Pending = { slot: number; title: string; status: 'queued' | 'running'; at: number };
type Result = { at: number; ok: boolean; message: string; slot: number };

/** 選ばれた写真を600×800のjpgにする。
    ★引き伸ばさない＝はみ出す分は切る（cover）。人物写真で比率を変えると顔が歪むため。 */
async function toJpeg600x800(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('画像を処理できませんでした');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  // cover：短い辺を枠に合わせ、長い辺のはみ出しを中央基準で切る
  const scale = Math.max(OUT_W / bitmap.width, OUT_H / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (OUT_W - w) / 2, (OUT_H - h) / 2, w, h);
  bitmap.close();

  // エステラブはjpgのみ。品質を落としながら700KB(base64)以内に収める
  for (const q of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]) {
    const url = canvas.toDataURL('image/jpeg', q);
    const b64 = url.split(',')[1] ?? '';
    if (b64.length <= 700 * 1024) return b64;
  }
  throw new Error('画像を小さくできませんでした。別の写真を選んでください');
}

export default function PhotosPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsAt, setPostsAt] = useState<number | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [error, setError] = useState('');
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/eslove-photo', { cache: 'no-store' }).then((x) => x.json());
      setPosts(Array.isArray(r.posts) ? r.posts : []);
      setPostsAt(r.postsAt ?? null);
      setPending(r.pending ?? null);
      setResult(r.result ?? null);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    /* 差し替え中は反映を早く見たいので短い間隔で見に行く */
    const t = setInterval(load, pending ? 5000 : 20000);
    return () => clearInterval(t);
  }, [load, pending]);

  async function pick(slot: number, file: File | undefined) {
    setError('');
    if (!file) return;
    if (!/^image\//.test(file.type)) { setError('画像ファイルを選んでください'); return; }
    setBusySlot(slot);
    try {
      const imageB64 = await toJpeg600x800(file);
      const r = await fetch('/api/eslove-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', slot, imageB64 }),
      }).then((x) => x.json());
      if (!r.ok) { setError(r.error ?? '送れませんでした'); return; }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '写真を処理できませんでした');
    } finally {
      setBusySlot(null);
      const el = inputs.current[slot];
      if (el) el.value = ''; // 同じ写真をもう一度選べるようにする
    }
  }

  const hhmm = (ms: number) =>
    new Date(ms).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-16">
      <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="font-black text-lg tracking-tight">
            <span className="text-sky-400">{SHOP.name}</span>
            <span className="text-zinc-300 text-sm font-normal ml-1">エステラブ 新着の写真</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            写真を選ぶと600×800に整えて差し替えます（更新回数は減りません）
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {error && (
          <div className="mb-4 rounded-lg bg-red-950 border border-red-800 text-red-200 text-sm px-3 py-2">
            {error}
          </div>
        )}

        {pending && (
          <div className="mb-4 rounded-lg bg-sky-950 border border-sky-800 text-sky-200 text-sm px-3 py-2">
            <span className="inline-block w-2 h-2 rounded-full bg-sky-300 animate-pulse mr-2" />
            「{pending.title}」の写真を差し替え中です（1〜3分かかります）
          </div>
        )}

        {!pending && result && (
          <div
            className={`mb-4 rounded-lg border text-sm px-3 py-2 ${
              result.ok
                ? 'bg-emerald-950 border-emerald-800 text-emerald-200'
                : 'bg-amber-950 border-amber-800 text-amber-200'
            }`}
          >
            {hhmm(result.at)} {result.ok ? '✅' : '⚠️'} {result.message}
          </div>
        )}

        {!posts.length && (
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm px-4 py-6 text-center">
            投稿一覧がまだ読み込まれていません。
            <br />
            店のPCで <code className="text-zinc-300">node eslove_photo.js --list</code> を1回動かすと出ます。
          </div>
        )}

        <div className="space-y-3">
          {posts.map((p) => {
            const busy = busySlot === p.slot || pending?.slot === p.slot;
            return (
              <div
                key={p.slot}
                className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex gap-3 items-start"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photo}
                  alt=""
                  className="w-20 h-[107px] object-cover rounded-lg bg-zinc-800 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-zinc-500">
                    {p.slot}件目{p.category ? ` ・ ${p.category}` : ''}
                  </div>
                  <div className="text-sm font-bold leading-snug break-words">{p.title}</div>
                  <div className="mt-2">
                    <input
                      ref={(el) => {
                        inputs.current[p.slot] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={busy || Boolean(pending)}
                      onChange={(e) => pick(p.slot, e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      disabled={busy || Boolean(pending)}
                      onClick={() => inputs.current[p.slot]?.click()}
                      className="text-xs font-bold rounded-lg px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-700 disabled:text-zinc-500"
                    >
                      {busy ? '差し替え中…' : '写真を選ぶ'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {postsAt && (
          <div className="mt-4 text-[11px] text-zinc-600 text-center">
            投稿一覧の取得：{hhmm(postsAt)}
          </div>
        )}
      </main>
    </div>
  );
}
