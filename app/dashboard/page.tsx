'use client';

import { useState, useMemo, useEffect } from 'react';
import { SHOP, FEES, PAYROLL } from '../shop.config';
import TimesEditor from '../TimesEditor';
import JobsPanel from '../JobsPanel';
import StaffPanel from '../StaffPanel';
import Collapsible from '../Collapsible';

/* ───────────────────────────────────────────────
   派遣型メンエス 管理システム ─ 試作（デモ）
   ※データはすべてサンプルです
─────────────────────────────────────────────── */

const STORE = SHOP.name;

type Cast = { id: string; name: string; status: '待機' | '接客中' | '出勤前' | '退勤'; color: string };
type Resv = {
  id: string; time: string; cast: string; course: string; place: string;
  customer: string; status: '確定' | '仮予約' | '完了'; notified: boolean;
};
type Site = { id: string; name: string; auto: boolean; last: string; updating?: boolean; ready?: boolean; pauseUntil?: number; soloLogin?: boolean };

// キャストカラーのパレット（実キャストに順番に割り当て）
const CAST_COLORS = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb7185', '#22d3ee', '#c084fc'];

const initialResv: Resv[] = [];

const COURSES = PAYROLL.manualCourses;

export default function SystemPage() {
  const [tab, setTab] = useState<'dash' | 'resv' | 'cast' | 'sites' | 'pay'>('dash');
  const [casts, setCasts] = useState<Cast[]>([]);
  const [resvs, setResvs] = useState<Resv[]>(initialResv);
  const [sites, setSites] = useState<Site[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // ネット予約（客の予約フォームから入ったリアルな予約）
  type NetResv = { id: string; cast: string; date: string; time: string; course: string; name: string; phone: string; note: string; status: string; repeat?: number };
  const [net, setNet] = useState<NetResv[]>([]);
  useEffect(() => {
    fetch('/api/reservations').then((r) => r.json()).then((d) => setNet(Array.isArray(d) ? d : [])).catch(() => {});
    // 実キャストを /api/casts から取得（本日出勤=待機／お休み=退勤 で初期化）
    fetch('/api/casts').then((r) => r.json()).then((d) => {
      if (!Array.isArray(d)) return;
      setCasts(d.map((c: { name: string; today: boolean }, i: number) => ({
        id: 'c' + i,
        name: c.name,
        status: c.today ? '待機' : '退勤',
        color: CAST_COLORS[i % CAST_COLORS.length],
      })));
    }).catch(() => {});
    // 掲載サイトのON/OFF状態を取得
    fetch('/api/sites').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setSites(d); }).catch(() => {});
  }, []);

  // 予約登録フォーム
  const [form, setForm] = useState({ time: '', cast: '', course: '60分', place: '', customer: '' });

  // 給与計算（店舗マスタ shop.config の PAYROLL に集約・数値は保存しない）
  const RATE = PAYROLL.rate;
  const EXT_FEE = PAYROLL.extFee;
  const UP = PAYROLL.up;
  const EVENT = PAYROLL.event;
  const COURSE_KEYS = PAYROLL.courseKeys;
  const EVENT_KEYS = PAYROLL.eventKeys;
  const TYPE_KEYS = PAYROLL.typeKeys;
  const UP_KEYS = PAYROLL.upKeys;
  const [cur, setCur] = useState({ course: '75', type: 'フリー', up: 'なし', ext: '0' });
  const [sessions, setSessions] = useState<{ label: string; amount: number }[]>([]);
  const yen = (n: number) => '¥' + n.toLocaleString('ja-JP');
  const isEvent = EVENT_KEYS.includes(cur.course);
  const baseAmount = isEvent ? (EVENT[cur.course] ?? 0) : ((RATE[cur.course]?.[cur.type] ?? 0) + (UP[cur.up] ?? 0));
  const extN = Number(cur.ext) || 0;
  const curAmount = baseAmount + extN * EXT_FEE;
  const dayTotal = sessions.reduce((s, x) => s + x.amount, 0);
  function curLabel() {
    if (isEvent) return cur.course + (extN ? `・延長${extN}` : '');
    const up = cur.up !== 'なし' ? `・${cur.up.split(' ')[0]}` : '';
    return `${cur.course}分・${cur.type}${up}${extN ? `・延長${extN}` : ''}`;
  }
  function addSession() {
    setSessions((prev) => [...prev, { label: curLabel(), amount: curAmount }]);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3200); }

  // ネット予約を完了にしてリストから外す（サーバー側でアーカイブへ退避）
  async function completeNet(id: string, name: string) {
    if (!confirm(`${name}様の予約を「完了」にしてリストから外しますか？`)) return;
    setNet((prev) => prev.filter((x) => x.id !== id)); // 画面は即反映
    try {
      const r = await fetch(`/api/reservations?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      showToast('✅ 完了にしました');
    } catch {
      showToast('⚠️ 失敗しました。読み込み直してください');
    }
  }

  const todayCount = resvs.length;

  // ダブルブッキング判定
  const conflict = useMemo(() => {
    if (!form.cast || !form.time) return false;
    return resvs.some((r) => r.cast === form.cast && r.time === form.time);
  }, [form, resvs]);

  function addResv() {
    if (!form.time || !form.cast || !form.place) { showToast('時間・キャスト・場所を入力してください'); return; }
    if (conflict) { showToast('⚠️ ダブルブッキングです！別の時間を選んでください'); return; }
    const r: Resv = {
      id: 'r' + Date.now(), time: form.time, cast: form.cast, course: form.course,
      place: form.place, customer: form.customer || 'お客様', status: '確定', notified: true,
    };
    setResvs((prev) => [...prev, r].sort((a, b) => a.time.localeCompare(b.time)));
    setForm({ time: '', cast: '', course: '60分', place: '', customer: '' });
    showToast(`✅ 予約確定！${form.cast}のLINEへ自動通知＆お客様へ確認SMSを送信しました`);
    setTab('dash');
  }

  function cycleCast(id: string) {
    const order: Cast['status'][] = ['出勤前', '待機', '接客中', '退勤'];
    setCasts((prev) => prev.map((c) => c.id === id
      ? { ...c, status: order[(order.indexOf(c.status) + 1) % order.length] } : c));
  }

  async function toggleAuto(id: string) {
    const target = sites.find((s) => s.id === id);
    if (!target) return;
    const next = !target.auto;
    setSites((prev) => prev.map((s) => s.id === id ? { ...s, auto: next } : s)); // 即時反映
    try {
      const r = await fetch('/api/sites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, auto: next }),
      });
      const j = await r.json();
      if (j.ok) showToast(next ? `🟢 ${target.name} の自動更新をONにしました` : `⚪ ${target.name} の自動更新をOFFにしました`);
      else { showToast('⚠️ 保存に失敗しました'); setSites((prev) => prev.map((s) => s.id === id ? { ...s, auto: !next } : s)); }
    } catch { showToast('⚠️ 通信エラー'); setSites((prev) => prev.map((s) => s.id === id ? { ...s, auto: !next } : s)); }
  }

  /* 「自分で触る」＝そのサイトの自動更新を一定時間だけ止める。
     ★エステラブは1アカウント1ログイン制で、止めずに管理画面へ入ると
       ボットと取り合いになる。止めている間はボットはログインもしない。
     ★時間が来たら勝手に元へ戻る（ONに戻し忘れを無くすため）。 */
  async function pauseSite(id: string, minutes: number) {
    const target = sites.find((s) => s.id === id);
    if (!target) return;
    try {
      const r = await fetch('/api/sites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'pause', minutes }),
      });
      const j = await r.json();
      if (j.ok) {
        setSites((prev) => prev.map((s) => s.id === id ? { ...s, auto: false, pauseUntil: j.site?.pauseUntil } : s));
        showToast(`⏸ ${target.name} を${minutes}分止めました。どうぞ操作してください`);
      } else showToast('⚠️ 保存に失敗しました');
    } catch { showToast('⚠️ 通信エラー'); }
  }

  async function resumeSite(id: string) {
    const target = sites.find((s) => s.id === id);
    if (!target) return;
    try {
      const r = await fetch('/api/sites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'resume' }),
      });
      const j = await r.json();
      if (j.ok) {
        setSites((prev) => prev.map((s) => s.id === id ? { ...s, auto: j.site?.auto ?? true, pauseUntil: undefined } : s));
        showToast(`▶ ${target.name} の自動更新を再開しました`);
      } else showToast('⚠️ 保存に失敗しました');
    } catch { showToast('⚠️ 通信エラー'); }
  }

  /* 一時停止の残り分数（切り上げ）。0以下なら停止していない。 */
  const pausedMin = (s: Site) =>
    s.pauseUntil ? Math.max(0, Math.ceil((s.pauseUntil - Date.now()) / 60000)) : 0;

  const statusColor: Record<Cast['status'], string> = {
    '待機': 'bg-emerald-500/20 text-emerald-300',
    '接客中': 'bg-pink-500/20 text-pink-300',
    '出勤前': 'bg-blue-500/20 text-blue-300',
    '退勤': 'bg-zinc-600/30 text-zinc-400',
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-black text-lg tracking-tight"><span className="text-blue-400">GrowUP 店舗DX</span> <span className="text-zinc-300 text-sm font-normal">|</span> <span className="text-zinc-200 text-sm">{STORE}</span></div>
            <div className="text-[11px] text-zinc-500">予約・キャスト・掲載・給与 統合管理</div>
          </div>
          {/* 別ページへの導線。給与タブなど「掲載更新」以外を見ているときも
              押せるように、タブの中ではなくヘッダーに置く。 */}
          <div className="text-right shrink-0">
            <div className="text-xs text-zinc-400">{new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</div>
            <div className="flex items-center justify-end gap-1.5 mt-1">
              <a href="/times"
                className="text-[10px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/30 rounded-full px-2 py-1 active:scale-95 transition">
                ⏱ 投稿時刻
              </a>
              <a href="/photos"
                className="text-[10px] font-bold text-pink-300 bg-pink-500/10 border border-pink-500/30 rounded-full px-2 py-1 active:scale-95 transition">
                🖼 新着の写真
              </a>
              <a href="/status"
                className="text-[10px] font-bold text-zinc-300 bg-zinc-700/40 border border-zinc-600 rounded-full px-2 py-1 active:scale-95 transition">
                稼働状況
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5">
        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card label="本日の予約" value={`${todayCount + net.length}件`} accent="text-blue-400" />
          <Card label="本日出勤" value={`${casts.filter((c) => c.status !== '退勤').length}名`} accent="text-pink-400" />
          <Card label="在籍キャスト" value={`${casts.length}名`} accent="text-emerald-400" />
        </div>

        {tab === 'dash' && (
          <section>
            {net.length > 0 && (
              <div className="mb-6">
                <H title="🌐 ネット予約（受付）" sub="お客様の予約フォームから届いた予約" />
                <div className="space-y-3">
                  {net.map((r) => (
                    <div key={r.id} className="bg-pink-500/5 rounded-2xl border border-pink-500/30 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold">{r.cast}</span>
                          <span className="text-xs text-zinc-400 ml-2">{r.name}様</span>
                          {r.phone && <span className="text-[11px] text-zinc-500 ml-2">{r.phone}</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {r.repeat && r.repeat > 0
                            ? <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">🔁 リピ{r.repeat + 1}回目</span>
                            : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300">🆕 新規</span>}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300">{r.status}</span>
                        </div>
                      </div>
                      <div className="text-sm text-zinc-400 mt-1">🗓 {r.date} {r.time}〜 / {r.course}</div>
                      <div className="text-xs text-amber-300/90 mt-1">
                        💰 {r.repeat && r.repeat > 0 ? `本指名料 ¥${FEES.repeatNomination.toLocaleString('ja-JP')}` : `指名料 ¥${FEES.nomination.toLocaleString('ja-JP')}`}（＋コース料金＋交通費）
                      </div>
                      {r.note && <div className="text-xs text-zinc-500 mt-1">📝 {r.note}</div>}
                      {r.phone && (() => {
                        // このダッシュボードを開いている端末（＝店のスマホ）からSMS/発信する
                        const to = r.phone.replace(/[^\d]/g, '');
                        // 指名料はリピーター判定で自動。交通費は派遣先で変わるので空欄で送信前に入力。
                        const nomLabel = r.repeat && r.repeat > 0 ? `＋本指名料　${FEES.repeatNomination.toLocaleString('ja-JP')}円` : `＋指名料　${FEES.nomination.toLocaleString('ja-JP')}円`;
                        const body = `【${STORE}】${r.name}様\nご予約ありがとうございます。\n${r.date} ${r.time}〜 / ${r.course}\nご希望キャスト：${r.cast}\n${nomLabel}\n＋交通費　　　円\n当日お待ちしております🙏\nご不明点はこの番号までお電話ください。`;
                        return (
                          <div className="flex gap-2 mt-3">
                            <a href={`sms:${to}?&body=${encodeURIComponent(body)}`}
                              className="flex-1 text-center py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold transition">
                              📱 確認SMSを送る
                            </a>
                            <a href={`tel:${to}`}
                              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold transition">
                              📞 電話
                            </a>
                          </div>
                        );
                      })()}
                      <button onClick={() => completeNet(r.id, r.name)}
                        className="w-full mt-2 py-2 rounded-xl bg-zinc-800 hover:bg-emerald-700 text-xs font-bold text-zinc-300 transition">
                        ✓ 完了にする（リストから外す）
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <H title="本日の予約" sub="時間順・ダブルブッキング自動防止" />
            <div className="space-y-3">
              {resvs.map((r) => {
                const cast = casts.find((c) => c.name === r.cast);
                return (
                  <div key={r.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex gap-4">
                    <div className="text-center min-w-[52px]">
                      <div className="text-xl font-black">{r.time}</div>
                      <div className="text-[10px] text-zinc-500">{r.course}</div>
                    </div>
                    <div className="w-px bg-zinc-800" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: cast?.color ?? '#888' }} />
                        <span className="font-bold">{r.cast}</span>
                        <span className="text-xs text-zinc-400">{r.customer}</span>
                      </div>
                      <div className="text-sm text-zinc-400 mt-1">📍 {r.place}</div>
                      <div className="flex gap-2 mt-2">
                        <Badge ok={r.status === '確定'}>{r.status}</Badge>
                        <Badge ok={r.notified}>{r.notified ? 'キャスト通知済' : '未通知'}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setTab('resv')}
              className="w-full mt-4 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold transition">
              ＋ 予約を登録する
            </button>
          </section>
        )}

        {tab === 'resv' && (
          <section>
            <H title="予約登録" sub="登録するとキャストへLINE自動通知＋お客様へ確認SMS" />
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-4">
              <Field label="時間">
                <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="input" />
              </Field>
              <Field label="キャスト">
                <select value={form.cast} onChange={(e) => setForm({ ...form, cast: e.target.value })} className="input">
                  <option value="">選択してください</option>
                  {casts.filter((c) => c.status !== '退勤').map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="コース">
                <div className="flex gap-2">
                  {COURSES.map((co) => (
                    <button key={co} onClick={() => setForm({ ...form, course: co })}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${form.course === co ? 'bg-blue-600' : 'bg-zinc-800 text-zinc-400'}`}>
                      {co}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="場所（ホテル等）">
                <input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })}
                  placeholder="例：難波 ○○ホテル 1208" className="input" />
              </Field>
              <Field label="お客様">
                <input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  placeholder="例：A様（指名）" className="input" />
              </Field>

              {conflict && (
                <div className="bg-red-500/15 border border-red-500/40 text-red-300 text-sm rounded-xl p-3">
                  ⚠️ {form.cast} は {form.time} に既に予約があります（ダブルブッキング防止）
                </div>
              )}

              <button onClick={addResv}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold transition disabled:opacity-40"
                disabled={conflict}>
                予約を確定する
              </button>
              <p className="text-[11px] text-zinc-500 text-center">
                確定すると → 担当キャストのLINEへ「時間・場所・お客様情報」を自動送信、<br />お客様へ確認SMSも自動送信されます
              </p>
            </div>
          </section>
        )}

        {tab === 'cast' && (
          <section>
            <H title="キャスト管理" sub="タップでステータス切替（出勤前→待機→接客中→退勤）" />

            {/* 在籍そのものの追加・編集・卒業を、このタブの中でそのままできるようにする（2026-08-01）。
                中身は /staff と同じ部品。★このページは鍵つき（middlewareのmatcher）なので
                取り消せない「卒業」を置いてよい。公開の /status には絶対に置かない。 */}
            <div className="mb-4">
              <Collapsible
                title="在籍キャストの追加・編集・卒業"
                sub="プロフィール・写真・出勤時間の変更、LINE連携、辞めた子の削除"
                badge={`${casts.length}名`}
              >
                <StaffPanel />
              </Collapsible>
            </div>
            <div className="space-y-3">
              {casts.map((c) => (
                <button key={c.id} onClick={() => cycleCast(c.id)}
                  className="w-full bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex items-center justify-between hover:border-zinc-600 transition">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: c.color + '33', color: c.color }}>{c.name[0]}</span>
                    <span className="font-bold">{c.name}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor[c.status]}`}>{c.status}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === 'sites' && (
          <section>
            <H title="掲載更新" sub="やりたいものを開いてください" />

            {/* ★3つとも縦に並べると長すぎてスマホで探せない（2026-08-01）。
                ベンリーのコンテンツ一覧のように見出しだけ並べ、開いたものだけ出す。
                いちばんよく使う「今すぐ実行」だけ最初から開けておく。 */}
            <div className="space-y-3">

            <Collapsible
              title="今すぐ実行"
              sub="自動更新を待たずに、その場で反映したいときに押してください"
              open
            >
              <JobsPanel />
            </Collapsible>

            {/* 投稿時刻の設定。中身は /times と同じ部品なので、
                どちらで直しても同じ設定を触っている。 */}
            <Collapsible
              title="投稿時刻の設定"
              sub="何時に何を出すか。保存すると1分ほどで自動更新に反映されます"
            >
              <TimesEditor embedded />
            </Collapsible>

            <Collapsible
              title="掲載サイト 自動更新のON / OFF"
              sub="ONにしたサイトを自動で定期更新し、ランキング上位を維持します"
              badge={sites.length ? `${sites.filter((s) => s.auto).length}/${sites.length} ON` : undefined}
            >
            <div className="space-y-3">
              {sites.length === 0 && <div className="text-sm text-zinc-500">読み込み中…</div>}
              {sites.map((s) => (
                <div key={s.id} className={`bg-zinc-900 rounded-2xl border border-zinc-800 p-4 ${!s.ready ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">{s.name}</div>
                      <div className="text-[11px] text-zinc-500">
                        {s.ready
                          ? (pausedMin(s) > 0
                            ? <>最終更新：{s.last}　/　<span className="text-sky-400">お休み中（あと{pausedMin(s)}分で自動再開）</span></>
                            : <>最終更新：{s.last}　/　{s.auto ? <span className="text-emerald-400">自動更新ON</span> : <span className="text-zinc-500">停止中</span>}</>)
                          : <span className="text-amber-400">準備中（近日対応予定）</span>}
                      </div>
                    </div>
                    {s.ready ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[11px] text-zinc-400">自動更新</span>
                        <span onClick={() => toggleAuto(s.id)}
                          className={`w-11 h-6 rounded-full relative transition ${s.auto ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${s.auto ? 'left-[22px]' : 'left-0.5'}`} />
                        </span>
                      </label>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 border border-amber-400/40 rounded-full px-2 py-1">準備中</span>
                    )}
                  </div>

                  {/* 自分で管理画面を触りたい時のボタン。
                      ★止めずに入るとボットと取り合いになるサイトがあるため（エステラブ）。
                        止め忘れても時間で勝手に戻るので、押しっぱなしの事故は起きない。 */}
                  {s.soloLogin && s.ready && s.auto && pausedMin(s) === 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500">自分で操作する：</span>
                      {[15, 30, 60].map((m) => (
                        <button key={m} onClick={() => pauseSite(s.id, m)}
                          className="text-[11px] px-2.5 py-1 rounded-full border border-zinc-700 text-zinc-300 hover:bg-zinc-800 active:bg-zinc-700">
                          {m}分
                        </button>
                      ))}
                    </div>
                  )}
                  {s.soloLogin && s.ready && pausedMin(s) > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[11px] text-sky-400">操作中はボットが触りません</span>
                      <button onClick={() => resumeSite(s.id)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-sky-500/50 text-sky-300 hover:bg-sky-500/10">
                        もう終わった（すぐ再開）
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-4 text-center">
              ※ ONにすると、自動更新システムがそのサイトを定期的に更新します。<br />OFFの間は更新しません。
            </p>
            </Collapsible>

            </div>
          </section>
        )}

        {tab === 'pay' && (
          <section>
            <H title="給与計算（Zero様）" sub="コースと客タイプを選ぶだけ。金額データは保存しません" />
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-4">
              <Field label="コース（分）">
                <div className="grid grid-cols-5 gap-1.5">
                  {COURSE_KEYS.map((c) => (
                    <button key={c} onClick={() => setCur({ ...cur, course: c })}
                      className={`py-2 rounded-lg text-sm font-bold transition ${cur.course === c ? 'bg-blue-600' : 'bg-zinc-800 text-zinc-400'}`}>{c}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {EVENT_KEYS.map((c) => (
                    <button key={c} onClick={() => setCur({ ...cur, course: c })}
                      className={`py-2 rounded-lg text-xs font-bold transition ${cur.course === c ? 'bg-amber-600' : 'bg-zinc-800 text-zinc-400'}`}>{c}</button>
                  ))}
                </div>
              </Field>

              {!isEvent && (
                <>
                  <Field label="客タイプ">
                    <div className="grid grid-cols-3 gap-1.5">
                      {TYPE_KEYS.map((t) => (
                        <button key={t} onClick={() => setCur({ ...cur, type: t })}
                          className={`py-2 rounded-lg text-sm font-bold transition ${cur.type === t ? 'bg-pink-600' : 'bg-zinc-800 text-zinc-400'}`}>{t}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label="コースアップ">
                    <div className="grid grid-cols-3 gap-1.5">
                      {UP_KEYS.map((u) => (
                        <button key={u} onClick={() => setCur({ ...cur, up: u })}
                          className={`py-2 rounded-lg text-xs font-bold transition ${cur.up === u ? 'bg-violet-600' : 'bg-zinc-800 text-zinc-400'}`}>{u === 'なし' ? 'なし' : u.split(' ')[0]}</button>
                      ))}
                    </div>
                  </Field>
                </>
              )}

              <Field label="延長30分（回数）">
                <input inputMode="numeric" value={cur.ext} onChange={(e) => setCur({ ...cur, ext: e.target.value })}
                  placeholder="0" className="input" />
              </Field>

              <div className="bg-zinc-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">この区分の給与</span>
                  <span className="text-xl font-black text-emerald-400">{yen(curAmount)}</span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  {curLabel()}　／　基本 {yen(baseAmount)} ＋ 延長 {yen(extN * EXT_FEE)}
                </div>
              </div>
              <button onClick={addSession}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition">
                ＋ 本日の給与に追加
              </button>

              {sessions.length > 0 && (
                <div className="bg-zinc-800/40 rounded-xl p-4 space-y-1.5">
                  <div className="text-xs text-zinc-400 font-bold mb-1">本日の明細（{sessions.length}件）</div>
                  {sessions.map((s, i) => (
                    <Row key={i} label={s.label} value={yen(s.amount)} />
                  ))}
                  <div className="border-t border-zinc-700 my-2" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold">本日の支給合計</span>
                    <span className="text-2xl font-black text-emerald-400">{yen(dayTotal)}</span>
                  </div>
                  <button onClick={() => setSessions([])}
                    className="w-full mt-2 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold transition">クリア</button>
                </div>
              )}

              <p className="text-[11px] text-zinc-500 text-center">
                🔒 入力した数字はどこにも保存されません（その場で計算するだけ）<br />
                ※ コース・客タイプ・ZERO/極・イベント・延長すべてZero様の実データ反映済み（雑費なし）
              </p>
            </div>
          </section>
        )}
      </main>

      {/* トースト */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-[90%]">
          <div className="bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-3 text-sm shadow-xl text-center">{toast}</div>
        </div>
      )}

      {/* 下部ナビ */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-zinc-900/95 backdrop-blur border-t border-zinc-800">
        <div className="max-w-3xl mx-auto grid grid-cols-5">
          {([['dash', '予約', '📋'], ['resv', '登録', '＋'], ['cast', 'キャスト', '👥'], ['sites', '掲載更新', '🔄'], ['pay', '給与', '🧮']] as const).map(([k, label, icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`py-3 flex flex-col items-center gap-0.5 text-[11px] font-bold transition ${tab === k ? 'text-blue-400' : 'text-zinc-500'}`}>
              <span className="text-lg">{icon}</span>{label}
            </button>
          ))}
        </div>
      </nav>

      <style>{`.input{width:100%;padding:.6rem .75rem;border-radius:.75rem;background:#18181b;border:1px solid #3f3f46;color:#fff;outline:none}.input:focus{border-color:#3b82f6}`}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
function Card({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-3 text-center">
      <div className={`text-2xl font-black ${accent}`}>{value}</div>
      <div className="text-[11px] text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}
function H({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-black">{title}</h2>
      <p className="text-xs text-zinc-500">{sub}</p>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1.5 font-bold">{label}</label>
      {children}
    </div>
  );
}
function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>{children}</span>
  );
}
