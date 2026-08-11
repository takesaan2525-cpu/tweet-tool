'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Cast } from './api/line-webhook/casts';
import { todayHours } from './castHours';

/* ───────────────────────────────────────────────
   在籍キャストの管理パーツ（選ぶ → その子の画面）

   /staff ページと、管理ダッシュボードの「キャスト」タブの両方から
   同じものを使う（TimesEditor / JobsPanel と同じ作り）。
   ＝どちらで直しても同じ名簿を触っている。

   ★2026-08-12 の作り直し
     以前は24人ぶんのカードが縦にダラっと並び、1枚のカードの中に
     「出勤トグル／LINE選択／編集／サイトから削除／卒業」が全部載っていた。
     ＝探すのに延々スクロールが要るうえ、取り消せない「卒業」が
       ぜんぶの行に出ていて押し間違いが怖い形だった。
     まず顔で1人選び、その子の画面で用を足す形にする。
     「卒業」はその子の画面の一番下だけに置く（一覧には出さない）。

   ★★置き場所の決まり：この部品は書き込みが全部 /api/casts の
     isAdmin()（/gate で発行される gk Cookie）で守られている。
     🔴ページ自体には鍵が掛かっていない（middleware.ts の matcher は
       /gate・/api/reservations・/api/line-webhook の3つだけ。2026-08-10 に
       「ページは開けっぱなし・データを守る側で止める」方針へ変更した）。
     ＝画面は誰でも開けるが、押しても401で弾かれる、という守り方。
       ここに新しい操作を足すときは、必ずAPI側にも isAdmin() を入れること。
       「このページは鍵つきだから安全」は成り立たない。
─────────────────────────────────────────────── */

type LineUser = { userId: string; name: string; at: string };

const BLANK: Partial<Cast> = { name: '', age: 0, height: 0, cup: '', type: '', hours: '', photo: '', comment: '' };

/* 週間出勤の表示に使う日付（今日から7日）。
   ★あくまで表示だけ。ここは直せない＝HPの出勤表が正で、
     「掲載更新 → 今すぐ実行 → 出勤を読み込むだけ」で更新する。
     手で直せるようにすると同期に上書きされて「直したのに戻った」になるため。 */
function next7Days() {
  const out: { key: string; label: string; wd: string }[] = [];
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    out.push({ key, label: `${t.getMonth() + 1}/${t.getDate()}`, wd: '日月火水木金土'[t.getDay()] });
  }
  return out;
}

export default function StaffPanel() {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [users, setUsers] = useState<LineUser[]>([]);
  const [saving, setSaving] = useState('');
  const [msg, setMsg] = useState('');
  /* いま開いている子のid。null＝一覧。'new'＝新しい子の追加フォーム。 */
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);      // その子の画面でプロフ編集中か
  const [form, setForm] = useState<Partial<Cast>>(BLANK);
  const [q, setQ] = useState('');                     // 名前でしぼり込み
  /* ★読み込み前と「本当に0人」を区別する。同じ「読み込み中…」を出すと、
     名簿が空になった事故に気づけない。 */
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const [c, u] = await Promise.all([
      fetch('/api/casts').then((r) => r.json()).catch(() => []),
      fetch('/api/line-webhook').then((r) => r.json()).catch(() => []),
    ]);
    setCasts(Array.isArray(c) ? c : []);
    setUsers(Array.isArray(u) ? u : []);
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  const days = useMemo(() => next7Days(), []);
  const cur = casts.find((c) => c.id === openId) ?? null;

  function flash(ok: boolean, err?: string) { setMsg(ok ? '✅ 保存しました' : '⚠️ ' + (err ?? '保存失敗')); }

  // 出勤/LINEのワンタップ更新（id指定）
  async function quick(id: string, patch: { today?: boolean; lineUserId?: string }) {
    setSaving(id); setMsg('');
    setCasts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    try {
      const r = await fetch('/api/casts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id, ...patch }),
      });
      const j = await r.json(); flash(j.ok, j.error);
    } catch { setMsg('⚠️ 通信エラー'); }
    setSaving('');
  }

  // 追加 or 編集の保存
  async function submitForm() {
    if (!form.name) { setMsg('⚠️ 名前は必須です'); return; }
    setSaving('form'); setMsg('');
    const isNew = openId === 'new';
    try {
      const r = await fetch('/api/casts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: isNew
          ? JSON.stringify({ action: 'add', ...form })
          : JSON.stringify({ action: 'update', id: openId, fields: form }),
      });
      const j = await r.json();
      flash(j.ok, j.error);
      if (j.ok) {
        await load();
        // 追加なら一覧へ戻る。編集なら開いたままで編集モードだけ閉じる。
        if (isNew) { setOpenId(null); setForm(BLANK); } else setEditing(false);
      }
    } catch { setMsg('⚠️ 通信エラー'); }
    setSaving('');
  }

  /* ★削除は取り消せない。名前を出して1回だけ確認する。 */
  async function remove(c: Cast) {
    if (!confirm(`「${c.name}」を在籍から削除します。\n\nこの操作は取り消せません。よろしいですか？`)) return;
    setSaving(c.id!); setMsg('');
    try {
      const r = await fetch('/api/casts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: c.id }),
      });
      const j = await r.json(); flash(j.ok, j.error);
      if (j.ok) { setOpenId(null); await load(); }
    } catch { setMsg('⚠️ 通信エラー'); }
    setSaving('');
  }

  /* ★卒業その1＝各サイトから削除する（2026-08-09 に「非表示」から変更）。
     じゃぱん・リフナビ・MAP・ランキング・エス魂・エステラブの6媒体から消す。
     駅ちかだけは媒体側が一括削除しか用意しておらず、取り違えると別の子まで
     消えるので手作業のまま残している。
     ★★これは取り消せない。だから確認は「はい/いいえ」ではなく
       キャスト名を打ってもらう（押し間違いでは絶対に進まないようにする）。
     実際に動かすのは店のPCの runner.js なので、ここではお願いを1件積むだけ。 */
  async function deleteOnSites(c: Cast) {
    const typed = prompt(
      `「${c.name}」を各サイトから削除します。\n\n`
      + '対象：メンエスじゃぱん／リフナビ／メンエスMAP／全国ランキング／エス魂／エステラブ\n'
      + '★★この操作は取り消せません（非表示ではなく削除です）。\n'
      + '※駅ちかだけは管理画面から手作業でお願いします。\n\n'
      + `よろしければ、確認のため「${c.name}」と入力してください：`,
    );
    if (typed === null) return; // キャンセル
    if (typed.trim() !== c.name) { setMsg('⚠️ 名前が一致しないので中止しました'); return; }
    setSaving(c.id!); setMsg('');
    try {
      const r = await fetch('/api/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enqueue', id: 'cast_delete', only: c.name }),
      }).then((res) => res.json());
      setMsg(r?.ok
        ? `✅ 「${c.name}」を各サイトから削除する指示を出しました。エステラブを含むので10分ほどかかります`
        : '⚠️ ' + (r?.error ?? '受け付けできませんでした'));
    } catch { setMsg('⚠️ 通信エラー'); }
    setSaving('');
  }

  function openCast(c: Cast) { setOpenId(c.id!); setForm({ ...c }); setEditing(false); setMsg(''); }
  function startAdd() { setOpenId('new'); setForm({ ...BLANK }); setEditing(true); setMsg(''); }
  function backToList() { setOpenId(null); setEditing(false); setForm(BLANK); setMsg(''); }

  function availableUsers(id: string) {
    const taken = new Set(casts.filter((c) => c.id !== id && c.lineUserId).map((c) => c.lineUserId));
    return users.filter((u) => !taken.has(u.userId));
  }

  const f = <K extends keyof Cast>(k: K, v: Cast[K]) => setForm((p) => ({ ...p, [k]: v }));

  /* ── 一覧（顔を並べて1人選ぶ）──────────────────────── */
  if (!openId) {
    const list = q.trim()
      ? casts.filter((c) => c.name.includes(q.trim()))
      : casts;
    const onCount = casts.filter((c) => c.today).length;
    return (
      <div className="space-y-3">
        {msg && <div className="text-sm text-emerald-300">{msg}</div>}

        <div className="flex items-center gap-2">
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="名前でさがす"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-pink-500"
          />
          <span className="text-[11px] text-zinc-500 shrink-0">
            出勤 <span className="text-emerald-400 font-bold">{onCount}</span> / {casts.length}名
          </span>
        </div>

        {/* ★顔で選べるようにする（名前だけだと似た名前で取り違える）。
            緑の点＝本日出勤。ここでは出勤の切り替えはしない＝
            一覧をタップした指がそのまま出勤を変えてしまう事故を防ぐため。 */}
        <div className="grid grid-cols-3 gap-2">
          {list.map((c) => (
            <button key={c.id ?? c.name} onClick={() => openCast(c)}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2 text-left active:bg-zinc-800 hover:border-zinc-600 transition">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.photo} alt={c.name} className="w-full aspect-[3/4] rounded-xl object-cover bg-zinc-800" />
                <span className={`absolute top-1.5 right-1.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${c.today ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              </div>
              <div className="mt-1.5 font-bold text-sm truncate">{c.name}</div>
              <div className="text-[10px] text-zinc-500 truncate">
                {c.today ? <span className="text-emerald-400">本日出勤</span> : 'お休み'}
                {c.lineUserId ? ' ・LINE✅' : ''}
              </div>
            </button>
          ))}
        </div>

        {list.length === 0 && (
          <div className="text-sm text-center py-6">
            {!loaded ? <span className="text-zinc-500">読み込み中…</span>
              : q ? <span className="text-zinc-500">「{q}」に合う子がいません</span>
                : <span className="text-amber-300">在籍キャストが1人もいません（読み込みに失敗した可能性があります）</span>}
          </div>
        )}

        <button onClick={startAdd} className="w-full py-3 rounded-xl bg-pink-600 font-bold text-sm">
          ＋ 新しい子を追加
        </button>
        <button onClick={load} className="w-full py-3 rounded-xl bg-zinc-800 text-sm font-bold">
          最新に更新
        </button>
        <p className="text-[11px] text-zinc-600 leading-relaxed">
          ・写真をタップすると、その子のプロフィール・出勤・LINE連携をまとめて直せます<br />
          ・右上の緑の点が「本日出勤」。予約画面の本日出勤に並ぶのはこの子たちです
        </p>
      </div>
    );
  }

  /* ── 新しい子の追加 ────────────────────────────── */
  if (openId === 'new') {
    return (
      <div className="space-y-3">
        <button onClick={backToList} className="text-[11px] text-blue-400">← 一覧にもどる</button>
        {msg && <div className="text-sm text-emerald-300">{msg}</div>}
        <div className="bg-zinc-900 border border-pink-600/50 rounded-2xl p-4 space-y-3">
          <div className="font-bold text-sm">➕ 新しい子を追加</div>
          <ProfileFields form={form} f={f} />
          <div className="flex gap-2">
            <button onClick={submitForm} disabled={saving === 'form'}
              className="flex-1 py-2.5 rounded-xl bg-pink-600 font-bold text-sm disabled:opacity-50">
              {saving === 'form' ? '保存中…' : '追加する'}
            </button>
            <button onClick={backToList} className="px-4 py-2.5 rounded-xl bg-zinc-800 font-bold text-sm">やめる</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── その子の画面 ─────────────────────────────── */
  if (!cur) {
    return (
      <div className="space-y-3">
        <button onClick={backToList} className="text-[11px] text-blue-400">← 一覧にもどる</button>
        <div className="text-sm text-zinc-500">この子は見つかりませんでした（削除された可能性があります）</div>
      </div>
    );
  }

  const linked = users.find((u) => u.userId === cur.lineUserId);
  const busy = saving === cur.id;
  const photos = Array.isArray(cur.photos) && cur.photos.length ? cur.photos : (cur.photo ? [cur.photo] : []);

  return (
    <div className="space-y-3">
      <button onClick={backToList} className="text-[11px] text-blue-400">← 一覧にもどる</button>
      {msg && <div className="text-sm text-emerald-300">{msg}</div>}

      {/* 見出し＝誰を触っているかを常に見せる */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cur.photo} alt={cur.name} className="w-16 h-20 rounded-xl object-cover bg-zinc-800" />
        <div className="flex-1 min-w-0">
          <div className="font-black text-lg">{cur.name}</div>
          <div className="text-xs text-zinc-400">
            {cur.age ? `${cur.age}歳` : ''}{cur.height ? ` / ${cur.height}cm` : ''}{cur.cup ? ` / ${cur.cup}カップ` : ''}
          </div>
          <div className="text-[11px] text-zinc-500 truncate">{cur.type}</div>
        </div>
      </div>

      {/* ── 本日の出勤 ───────────────────────────── */}
      <Box title="本日の出勤">
        <div className="flex items-center gap-3">
          <button
            onClick={() => quick(cur.id!, { today: !cur.today })}
            disabled={busy}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 ${cur.today ? 'bg-emerald-600' : 'bg-zinc-700 text-zinc-300'}`}>
            {cur.today ? '本日出勤' : 'お休み'}
          </button>
          {/* ★お客様の予約ページと同じ関数で出す。別々に出すと、
              店の画面とお客様の画面で違う時間が見えることになる。 */}
          <span className="text-xs text-zinc-400">{todayHours(cur) || '時間は未設定'}</span>
        </div>
        <p className="text-[11px] text-zinc-600 mt-2">
          ここを「本日出勤」にした子だけ、お客様の予約画面に並びます。時間はHPの出勤表が正です。
        </p>
      </Box>

      {/* ── 週間出勤（読み取り専用）────────────────────
          ★ここは手で直せない。HPの出勤表が正で、手編集を入れると
            同期が走ったときに上書きされて「直したのに戻った」になるため。
            直したいときはHPを直して、下のボタンで読み直す。 */}
      <Box title="週間出勤" sub="HPの出勤表から読み取ったものです（ここでは直せません）">
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const on = cur.schedule ? Object.prototype.hasOwnProperty.call(cur.schedule, d.key) : false;
            const hours = cur.schedule?.[d.key] ?? '';
            return (
              <div key={d.key}
                className={`rounded-lg py-1.5 text-center border ${on ? 'bg-emerald-500/15 border-emerald-500/40' : 'bg-zinc-800/40 border-zinc-800'}`}>
                <div className={`text-[10px] ${i === 0 ? 'text-blue-300 font-bold' : 'text-zinc-500'}`}>{d.label}</div>
                <div className={`text-[10px] ${on ? 'text-emerald-300' : 'text-zinc-600'}`}>{d.wd}</div>
                <div className={`text-[9px] mt-0.5 leading-tight ${on ? 'text-emerald-200/80' : 'text-zinc-700'}`}>
                  {on ? (hours ? hours.replace('〜', '\n〜') : '出勤') : '休'}
                </div>
              </div>
            );
          })}
        </div>
        {!cur.schedule && (
          <p className="text-[11px] text-amber-300/80 mt-2">
            まだ読み取っていません。「掲載更新 → 今すぐ実行 → 出勤を読み込むだけ」を押してください。
          </p>
        )}
        <p className="text-[11px] text-zinc-600 mt-2">
          直すときはHPの出勤表を直してから、「掲載更新 → 今すぐ実行 → 出勤を読み込むだけ」を押してください。
        </p>
      </Box>

      {/* ── プロフィール ───────────────────────────── */}
      <Box title="プロフィール">
        {editing ? (
          <div className="space-y-3">
            <ProfileFields form={form} f={f} />
            <div className="flex gap-2">
              <button onClick={submitForm} disabled={saving === 'form'}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 font-bold text-sm disabled:opacity-50">
                {saving === 'form' ? '保存中…' : '保存する'}
              </button>
              <button onClick={() => { setEditing(false); setForm({ ...cur }); }}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 font-bold text-sm">やめる</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Line label="タイプ" v={cur.type} />
            {/* ★「本日の出勤」に出している時間とは別物。あちらはHPの出勤表から
                来た今日の時間、こちらは名簿に登録してある既定の時間。
                同じ「出勤時間」と書くと、違う値が2か所に出て混乱する。 */}
            <Line label="既定の時間" v={cur.hours} />
            <Line label="紹介文" v={cur.comment} />
            <button onClick={() => { setForm({ ...cur }); setEditing(true); }}
              className="w-full mt-2 py-2.5 rounded-xl bg-zinc-800 text-sm font-bold">✏️ プロフィールを直す</button>
          </div>
        )}
      </Box>

      {/* ── 写真（読み取り専用）───────────────────────
          写真の正は駅ちか。ここで差し替えると出所が二重になるので見せるだけ。 */}
      <Box title="写真" sub={`${photos.length}枚（駅ちかから取り込んだもの）`}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u + i} src={u} alt="" className="w-16 h-20 rounded-lg object-cover bg-zinc-800 shrink-0 border border-zinc-700" />
          ))}
          {photos.length === 0 && <span className="text-xs text-zinc-500">写真がありません</span>}
        </div>
        <p className="text-[11px] text-zinc-600 mt-2">
          増やすときは駅ちかに入れてから、「掲載更新 → 今すぐ実行 → 駅ちかから取り込む」を押してください。
        </p>
      </Box>

      {/* ── LINE連携 ─────────────────────────────── */}
      <Box title="LINE連携" sub="連携すると、この子あての予約が本人のLINEに直接届きます">
        <div className="flex items-center gap-2">
          <select
            value={cur.lineUserId ?? ''}
            onChange={(e) => quick(cur.id!, { lineUserId: e.target.value })}
            disabled={busy}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2.5 text-sm">
            <option value="">未連携（店に通知）</option>
            {availableUsers(cur.id!).map((u) => (
              <option key={u.userId} value={u.userId}>{u.name || u.userId.slice(0, 8)}</option>
            ))}
            {cur.lineUserId && !availableUsers(cur.id!).some((u) => u.userId === cur.lineUserId) && (
              <option value={cur.lineUserId}>{linked?.name || cur.lineUserId.slice(0, 8)}</option>
            )}
          </select>
          {cur.lineUserId
            ? <span className="text-[11px] text-emerald-300 whitespace-nowrap">✅連携済</span>
            : <span className="text-[11px] text-zinc-500 whitespace-nowrap">未連携</span>}
        </div>
        {users.length === 0 && (
          <p className="text-[11px] text-amber-300/80 mt-2">
            まだLINEを友だち追加した子がいません。店の公式LINEを追加してもらうと、ここで選べます。
          </p>
        )}
      </Box>

      {/* ── 卒業（取り消せない）──────────────────────
          ★一覧には出さない＝スクロール中に指が触れる場所に置かない。
            この子の画面のいちばん下だけに置く。 */}
      <Box title="卒業（辞めたとき）" danger>
        <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
          ①「サイトから削除」で6媒体（じゃぱん・リフナビ・MAP・ランキング・エス魂・エステラブ）から消します。<br />
          ② そのあと「名簿から消す」でうちの名簿から外します。<br />
          ★どちらも取り消せません。駅ちかだけは管理画面から手作業でお願いします。
        </p>
        <div className="flex gap-2">
          <button onClick={() => deleteOnSites(cur)} disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-amber-600/80 text-xs font-bold disabled:opacity-50">
            ① サイトから削除
          </button>
          <button onClick={() => remove(cur)} disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-red-600/80 text-xs font-bold disabled:opacity-50">
            ② 名簿から消す
          </button>
        </div>
      </Box>
    </div>
  );
}

/* プロフィールの入力欄。追加でも編集でも同じものを使う。
   ★紹介文（comment）は 2026-08-12 に追加。項目としては前からあったのに
     入力欄が無く、画面からは一生空のままだった。 */
function ProfileFields({ form, f }: { form: Partial<Cast>; f: <K extends keyof Cast>(k: K, v: Cast[K]) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <I label="名前" v={form.name ?? ''} on={(v) => f('name', v)} />
        <I label="タイプ（例：お姉さん）" v={form.type ?? ''} on={(v) => f('type', v)} />
        <I label="年齢" v={String(form.age ?? '')} on={(v) => f('age', Number(v) as Cast['age'])} num />
        <I label="身長(cm)" v={String(form.height ?? '')} on={(v) => f('height', Number(v) as Cast['height'])} num />
        <I label="カップ（例：C）" v={form.cup ?? ''} on={(v) => f('cup', v)} />
        <I label="出勤時間（例：20:00〜翌2:00）" v={form.hours ?? ''} on={(v) => f('hours', v)} />
      </div>
      <label className="block">
        <span className="block text-[11px] text-zinc-400 mb-1">紹介文</span>
        <textarea value={form.comment ?? ''} onChange={(e) => f('comment', e.target.value)} rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm outline-none focus:border-pink-500 resize-y" />
      </label>
      <I label="写真URL" v={form.photo ?? ''} on={(v) => f('photo', v)} />
      {form.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={form.photo} alt="" className="w-16 h-20 object-cover rounded-lg border border-zinc-700" />
      ) : null}
    </>
  );
}

function Box({ title, sub, danger, children }: { title: string; sub?: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <div className={`bg-zinc-900 border rounded-2xl p-4 ${danger ? 'border-red-900/60' : 'border-zinc-800'}`}>
      <div className={`font-bold text-sm ${danger ? 'text-red-300' : ''}`}>{title}</div>
      {sub && <div className="text-[11px] text-zinc-500 mt-0.5 mb-2">{sub}</div>}
      <div className={sub ? '' : 'mt-3'}>{children}</div>
    </div>
  );
}

function Line({ label, v }: { label: string; v?: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-zinc-500 text-xs w-16 shrink-0 pt-0.5">{label}</span>
      <span className={v ? 'flex-1' : 'flex-1 text-zinc-600'}>{v || '未設定'}</span>
    </div>
  );
}

function I({ label, v, on, num }: { label: string; v: string; on: (v: string) => void; num?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-zinc-400 mb-1">{label}</span>
      <input value={v} inputMode={num ? 'numeric' : undefined} onChange={(e) => on(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm outline-none focus:border-pink-500" />
    </label>
  );
}
