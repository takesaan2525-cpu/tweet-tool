'use client';

import { useEffect, useState } from 'react';
import type { Cast } from './api/line-webhook/casts';

/* ───────────────────────────────────────────────
   在籍キャストの管理パーツ（追加・編集・卒業・出勤切替・LINE連携）

   /staff ページと、管理ダッシュボードの「キャスト」タブの両方から
   同じものを使う（TimesEditor / JobsPanel と同じ作り）。
   ＝どちらで直しても同じ名簿を触っている。

   ★★置き場所の決まり：この部品は鍵つきのページにしか置かないこと。
     「卒業」＝在籍からの削除は取り消せない。/dashboard も /staff も
     middleware.ts の matcher に入っていてCookie必須だが、
     公開の /status には絶対に置かない。
─────────────────────────────────────────────── */

type LineUser = { userId: string; name: string; at: string };

const BLANK: Partial<Cast> = { name: '', age: 0, height: 0, cup: '', type: '', hours: '', photo: '', comment: '' };

export default function StaffPanel() {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [users, setUsers] = useState<LineUser[]>([]);
  const [saving, setSaving] = useState('');
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState<string | null>(null); // 編集中のキャストid（'new'=新規追加）
  const [form, setForm] = useState<Partial<Cast>>(BLANK);

  async function load() {
    const [c, u] = await Promise.all([
      fetch('/api/casts').then((r) => r.json()),
      fetch('/api/line-webhook').then((r) => r.json()).catch(() => []),
    ]);
    setCasts(Array.isArray(c) ? c : []);
    setUsers(Array.isArray(u) ? u : []);
  }
  useEffect(() => { load(); }, []);

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
    const isNew = editId === 'new';
    try {
      const r = await fetch('/api/casts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: isNew
          ? JSON.stringify({ action: 'add', ...form })
          : JSON.stringify({ action: 'update', id: editId, fields: form }),
      });
      const j = await r.json();
      flash(j.ok, j.error);
      if (j.ok) { setEditId(null); setForm(BLANK); await load(); }
    } catch { setMsg('⚠️ 通信エラー'); }
    setSaving('');
  }

  /* ★削除は取り消せない。名前を出して1回だけ確認する。
     （このパーツ自体が鍵つきページ限定なので、これで二重の歯止め） */
  async function remove(c: Cast) {
    if (!confirm(`「${c.name}」を在籍から削除します。\n\nこの操作は取り消せません。よろしいですか？`)) return;
    setSaving(c.id!); setMsg('');
    try {
      const r = await fetch('/api/casts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: c.id }),
      });
      const j = await r.json(); flash(j.ok, j.error);
      if (j.ok) await load();
    } catch { setMsg('⚠️ 通信エラー'); }
    setSaving('');
  }

  /* ★卒業その1＝媒体から下げる（非表示にする）。
     じゃぱん・リフナビ・MAP・ランキングを非表示にするだけで、消さないので元に戻せる。
     実際に動かすのは店のPCの runner.js なので、ここではお願いを1件積むだけ。 */
  async function hideOnSites(c: Cast) {
    if (!confirm(
      `「${c.name}」を各サイトで非表示にします。\n\n`
      + '対象：メンエスじゃぱん／リフナビ／メンエスMAP／全国ランキング\n'
      + '※消すのではなく隠すだけなので、あとから戻せます。\n'
      + '※駅ちか・エス魂・エステラブは手作業が必要です。\n\n'
      + 'よろしいですか？',
    )) return;
    setSaving(c.id!); setMsg('');
    try {
      const r = await fetch('/api/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enqueue', id: 'cast_remove', only: c.name }),
      }).then((res) => res.json());
      setMsg(r?.ok
        ? `✅ 「${c.name}」を各サイトで非表示にする指示を出しました。反映まで数分かかります`
        : '⚠️ ' + (r?.error ?? '受け付けできませんでした'));
    } catch { setMsg('⚠️ 通信エラー'); }
    setSaving('');
  }

  function startEdit(c: Cast) { setEditId(c.id!); setForm({ ...c }); setMsg(''); }
  function startAdd() { setEditId('new'); setForm({ ...BLANK }); setMsg(''); }

  function availableUsers(id: string) {
    const taken = new Set(casts.filter((c) => c.id !== id && c.lineUserId).map((c) => c.lineUserId));
    return users.filter((u) => !taken.has(u.userId));
  }

  const f = <K extends keyof Cast>(k: K, v: Cast[K]) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-3">
      {msg && <div className="text-sm text-emerald-300">{msg}</div>}

      {/* 追加/編集フォーム */}
      {editId && (
        <div className="bg-zinc-900 border border-pink-600/50 rounded-2xl p-4 space-y-3">
          <div className="font-bold text-sm">{editId === 'new' ? '➕ 新しい子を追加' : '✏️ プロフィール編集'}</div>
          <div className="grid grid-cols-2 gap-2">
            <I label="名前" v={form.name ?? ''} on={(v) => f('name', v)} />
            <I label="タイプ（例：お姉さん）" v={form.type ?? ''} on={(v) => f('type', v)} />
            <I label="年齢" v={String(form.age ?? '')} on={(v) => f('age', Number(v) as Cast['age'])} num />
            <I label="身長(cm)" v={String(form.height ?? '')} on={(v) => f('height', Number(v) as Cast['height'])} num />
            <I label="カップ（例：C）" v={form.cup ?? ''} on={(v) => f('cup', v)} />
            <I label="出勤時間（例：20:00〜翌2:00）" v={form.hours ?? ''} on={(v) => f('hours', v)} />
          </div>
          <I label="写真URL" v={form.photo ?? ''} on={(v) => f('photo', v)} />
          {form.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.photo} alt="" className="w-16 h-20 object-cover rounded-lg border border-zinc-700" />
          ) : null}
          <div className="flex gap-2">
            <button onClick={submitForm} disabled={saving === 'form'}
              className="flex-1 py-2.5 rounded-xl bg-pink-600 font-bold text-sm disabled:opacity-50">
              {saving === 'form' ? '保存中…' : '保存する'}
            </button>
            <button onClick={() => { setEditId(null); setForm(BLANK); }}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 font-bold text-sm">やめる</button>
          </div>
        </div>
      )}

      {!editId && (
        <button onClick={startAdd} className="w-full py-3 rounded-xl bg-pink-600 font-bold text-sm">
          ➕ 新しい子を追加
        </button>
      )}

      {users.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs rounded-xl p-3">
          まだLINEを友だち追加した子がいません。女の子に店の公式LINEを追加してもらうと「LINE連携」で選べます。
        </div>
      )}

      {casts.map((c) => {
        const linked = users.find((u) => u.userId === c.lineUserId);
        return (
          <div key={c.id ?? c.name} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.photo} alt={c.name} className="w-12 h-12 rounded-full object-cover bg-zinc-800" />
              <div className="flex-1">
                <div className="font-bold">{c.name} <span className="text-xs text-zinc-400 font-normal">{c.age}歳</span></div>
                <div className="text-[11px] text-zinc-500">{c.type}・{c.hours}</div>
              </div>
              <button
                onClick={() => quick(c.id!, { today: !c.today })}
                disabled={saving === c.id}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${c.today ? 'bg-emerald-600' : 'bg-zinc-700 text-zinc-300'}`}>
                {c.today ? '本日出勤' : 'お休み'}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-zinc-400 w-16">LINE連携</span>
              <select
                value={c.lineUserId ?? ''}
                onChange={(e) => quick(c.id!, { lineUserId: e.target.value })}
                disabled={saving === c.id}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm">
                <option value="">未連携（店に通知）</option>
                {availableUsers(c.id!).map((u) => (
                  <option key={u.userId} value={u.userId}>{u.name || u.userId.slice(0, 8)}</option>
                ))}
                {c.lineUserId && !availableUsers(c.id!).some((u) => u.userId === c.lineUserId) && (
                  <option value={c.lineUserId}>{linked?.name || c.lineUserId.slice(0, 8)}</option>
                )}
              </select>
              {c.lineUserId
                ? <span className="text-[11px] text-emerald-300 whitespace-nowrap">✅連携済</span>
                : <span className="text-[11px] text-zinc-500 whitespace-nowrap">未連携</span>}
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={() => startEdit(c)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-xs font-bold">✏️ 編集</button>
              {/* 卒業は2段階：①サイトから隠す（戻せる）→②名簿から消す（戻せない） */}
              <button onClick={() => hideOnSites(c)} disabled={saving === c.id}
                className="px-3 py-2 rounded-lg bg-amber-600/80 text-xs font-bold disabled:opacity-50 whitespace-nowrap">
                サイトから下げる
              </button>
              <button onClick={() => remove(c)} disabled={saving === c.id}
                className="px-3 py-2 rounded-lg bg-red-600/80 text-xs font-bold disabled:opacity-50">🗑 卒業</button>
            </div>
          </div>
        );
      })}

      <button onClick={load} className="w-full py-3 rounded-xl bg-zinc-800 text-sm font-bold mt-2">
        最新に更新
      </button>
      <p className="text-[11px] text-zinc-600 leading-relaxed">
        ・「本日出勤」にした子だけ予約画面の「本日出勤」に並びます<br />
        ・LINE連携した本日出勤の子は、予約が入るとその子のLINEに直接届きます<br />
        ・未連携・お休みの子の予約は、店のLINEに届きます<br />
        ・辞めた子は「サイトから下げる」→ 各サイトで非表示になります（隠すだけなので戻せます）<br />
        ・そのあと「卒業」を押すと名簿から消えます（こちらは取り消せません）<br />
        ・駅ちか・エス魂・エステラブの3つは、管理画面から手作業でお願いします
      </p>
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
