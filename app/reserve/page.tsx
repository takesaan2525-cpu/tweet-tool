'use client';

import { useEffect, useState } from 'react';
import { COURSE_MENU, courseLabel, type Cast } from '../api/line-webhook/casts';
import { SHOP, FEES } from '../shop.config';
/* ★出勤時間はここで決めない。HPの出勤表を正とする共通の関数を使う。
   お客様に見せる時間なので、ズレる可能性のある cast.hours を直接出さない。 */
import { todayHours } from '../castHours';

const STORE = SHOP.name;

// 指定日数後の日付を YYYY-MM-DD で返す（0=今日,1=明日…）
function dateStr(addDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export default function ReservePage() {
  const [step, setStep] = useState<'form' | 'done' | 'conflict'>('form');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [storeTel, setStoreTel] = useState(SHOP.tel);
  const [f, setF] = useState({ cast: '', date: dateStr(0), time: '', course: '', name: '', phone: '', note: '' });
  const [castView, setCastView] = useState<'today' | 'all'>('today');
  const [casts, setCasts] = useState<Cast[]>([]);
  // コース選択（種別＋時間）
  const [cType, setCType] = useState(COURSE_MENU[0].type);
  const [cMin, setCMin] = useState<number | null>(null);
  const curMenu = COURSE_MENU.find((m) => m.type === cType) ?? COURSE_MENU[0];
  function pickCourse(type: string, min: number) {
    setCType(type); setCMin(min);
    const price = (COURSE_MENU.find((m) => m.type === type)?.prices[min]) ?? 0;
    set('course', courseLabel(type, min, price));
  }
  // 種別を変えたら、その種別に同じ時間があれば維持・なければ未選択に
  function pickType(type: string) {
    const menu = COURSE_MENU.find((m) => m.type === type)!;
    if (cMin && menu.prices[cMin] != null) pickCourse(type, cMin);
    else { setCType(type); setCMin(null); set('course', ''); }
  }

  useEffect(() => {
    fetch('/api/casts').then((r) => r.json()).then(setCasts).catch(() => {});
  }, []);

  function set<K extends keyof typeof f>(k: K, v: string) { setF((p) => ({ ...p, [k]: v })); }

  const todayCasts = casts.filter((c) => c.today);

  async function submit() {
    if (!f.cast || !f.date || !f.time || !f.course || !f.name) { setError('キャスト・日付・時間・コース・お名前は必須です'); return; }
    if (!f.phone || !/^0\d{9,10}$/.test(f.phone.replace(/[^\d]/g, ''))) { setError('確認のため、携帯電話番号を正しくご入力ください'); return; }
    setSending(true); setError('');
    try {
      const r = await fetch('/api/reservations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f),
      });
      const j = await r.json();
      if (j.ok) setStep('done');
      else if (j.conflict) { if (j.tel) setStoreTel(j.tel); setStep('conflict'); }
      else setError(j.error ?? '送信に失敗しました');
    } catch { setError('通信エラー。もう一度お試しください'); }
    setSending(false);
  }

  if (step === 'conflict') {
    const telDigits = storeTel.replace(/[^\d]/g, '');
    const telView = telDigits.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3');
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">📞</div>
          <h1 className="text-xl font-black mb-2">お電話でのご確認をお願いします</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            ご希望の {f.cast} / {f.date} {f.time}〜 は<br />
            ただいま満席の可能性がございます。<br />
            確実なご予約のため、お手数ですが<br />
            店舗まで直接お電話ください🙏
          </p>
          <a href={`tel:${telDigits}`}
            className="mt-6 block w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-black text-lg transition">
            📞 {telView} に電話する
          </a>
          <button onClick={() => { setStep('form'); set('time', ''); }}
            className="mt-4 text-xs text-zinc-500 underline">別の時間で予約し直す</button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-black mb-2">ご予約ありがとうございます</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            内容を確認の上、店舗より折り返しご連絡いたします。<br />
            少々お待ちください🙏
          </p>
          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left text-sm space-y-1">
            <Row l="キャスト" v={f.cast} />
            <Row l="日時" v={`${f.date} ${f.time}〜`} />
            <Row l="コース" v={f.course} />
            <Row l="お名前" v={`${f.name} 様`} />
          </div>
          <p className="mt-3 text-[11px] text-zinc-500 leading-relaxed">
            ※ コース料金のほかに、指名料（{FEES.nomination.toLocaleString('ja-JP')}円／リピーターの方は本指名料{FEES.repeatNomination.toLocaleString('ja-JP')}円）と、
            エリアに応じた交通費がかかります。
          </p>
          <button onClick={() => { setStep('form'); setF({ cast: '', date: dateStr(0), time: '', course: '', name: '', phone: '', note: '' }); setCType(COURSE_MENU[0].type); setCMin(null); }}
            className="mt-5 text-xs text-zinc-500 underline">続けて予約する</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-10">
      <header className="bg-gradient-to-b from-zinc-900 to-zinc-950 px-5 py-6 text-center border-b border-zinc-800">
        <div className="text-amber-300/90 text-xs tracking-widest">MEN'S ESTHE</div>
        <h1 className="text-2xl font-black mt-1">{STORE} ネット予約</h1>
        <p className="text-zinc-500 text-xs mt-1">24時間カンタン予約 / 営業 {SHOP.hours}</p>
      </header>

      <main className="max-w-md mx-auto px-5 py-6 space-y-6">
        {/* キャスト選択 ─ 本日出勤 / 全キャスト 切替 */}
        <section>
          <Label>① キャストを選ぶ</Label>

          <div className="flex gap-1.5 mb-3 bg-zinc-900 p-1 rounded-2xl">
            <button onClick={() => setCastView('today')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${castView === 'today' ? 'bg-pink-600' : 'text-zinc-400'}`}>
              本日出勤（{todayCasts.length}）
            </button>
            <button onClick={() => setCastView('all')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${castView === 'all' ? 'bg-pink-600' : 'text-zinc-400'}`}>
              全キャスト・指名（{casts.length}）
            </button>
          </div>
          {castView === 'all' && (
            <p className="text-[11px] text-zinc-500 mb-3">※ お休みの子も「別日予約」で指名できます。希望日を選んでください。</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {(castView === 'today' ? todayCasts : casts).map((c) => {
              const sel = f.cast === c.name;
              return (
                <button key={c.name} onClick={() => set('cast', c.name)}
                  className={`text-left rounded-2xl overflow-hidden border transition ${sel ? 'border-pink-500 ring-2 ring-pink-500/40' : 'border-zinc-800'} bg-zinc-900`}>
                  <div className="relative aspect-[3/4] bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.photo} alt={c.name} className={`w-full h-full object-cover ${c.today ? '' : 'grayscale-[35%]'}`} loading="lazy" />
                    {sel && <div className="absolute top-2 right-2 bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">選択中</div>}
                    {!c.today && <div className="absolute top-2 left-2 bg-amber-500/90 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">別日予約可</div>}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 to-transparent p-2.5">
                      <div className="font-bold text-base leading-tight">{c.name} <span className="text-[12px] text-zinc-300 font-normal">{c.age}</span></div>
                      <div className="text-[11px] text-zinc-300 mt-0.5">{c.height}cm・{c.cup}カップ</div>
                      <div className="text-[11px] text-zinc-400">{c.type}</div>
                      <div className={`text-[11px] mt-0.5 ${c.today ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {c.today ? `🟢 本日 ${todayHours(c)}` : '本日お休み'}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 日時 */}
        <section>
          <Label>② 希望日時</Label>
          <div className="flex gap-1.5 mb-2">
            {[['今日', 0], ['明日', 1], ['明後日', 2]].map(([label, n]) => {
              const v = dateStr(n as number);
              return (
                <button key={label} onClick={() => set('date', v)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${f.date === v ? 'bg-pink-600' : 'bg-zinc-800 text-zinc-400'}`}>{label}</button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={f.date} min={dateStr(0)} onChange={(e) => set('date', e.target.value)} className="inp" />
            <input type="time" value={f.time} onChange={(e) => set('time', e.target.value)} className="inp" />
          </div>
        </section>

        {/* コース：種別 → 時間 の2段選択 */}
        <section>
          <Label>③ コース</Label>
          {/* 種別 */}
          <div className="flex gap-1.5 mb-2">
            {COURSE_MENU.map((m) => (
              <button key={m.type} onClick={() => pickType(m.type)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${cType === m.type ? 'bg-blue-600' : 'bg-zinc-800 text-zinc-400'}`}>
                {m.type === '極' ? 'Zero極' : m.type === 'Zero' ? 'Zero' : '通常'}
              </button>
            ))}
          </div>
          {/* 時間 */}
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(curMenu.prices).map(([m, p]) => {
              const min = Number(m); const sel = cType === curMenu.type && cMin === min;
              return (
                <button key={m} onClick={() => pickCourse(curMenu.type, min)}
                  className={`py-2.5 rounded-xl text-center transition ${sel ? 'bg-pink-600' : 'bg-zinc-800'}`}>
                  <div className={`text-sm font-bold ${sel ? 'text-white' : 'text-zinc-200'}`}>{min}分</div>
                  <div className={`text-[11px] ${sel ? 'text-pink-100' : 'text-zinc-400'}`}>{p.toLocaleString('ja-JP')}円</div>
                </button>
              );
            })}
          </div>
          {f.course && <div className="mt-2 text-center text-sm text-pink-300 font-bold">選択中：{f.course}</div>}
        </section>

        {/* お客様情報 */}
        <section className="space-y-3">
          <Label>④ お客様情報</Label>
          <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="お名前（ニックネーム可）" className="inp" />
          <input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="携帯電話番号（確認のご連絡が届きます）" inputMode="tel" className="inp" />
          <textarea value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="ご要望・ホテル名など（任意）" rows={2} className="inp" />
        </section>

        {error && <div className="bg-red-500/15 border border-red-500/40 text-red-300 text-sm rounded-xl p-3">{error}</div>}

        <button onClick={submit} disabled={sending}
          className="w-full py-4 rounded-2xl bg-pink-600 hover:bg-pink-500 font-black text-lg transition disabled:opacity-50">
          {sending ? '送信中…' : 'この内容で予約する'}
        </button>
        <p className="text-[11px] text-zinc-600 text-center">送信後、店舗より確認のご連絡をいたします。</p>
      </main>

      <style>{`.inp{width:100%;padding:.7rem .8rem;border-radius:.85rem;background:#18181b;border:1px solid #3f3f46;color:#fff;outline:none;font-size:15px}.inp:focus{border-color:#ec4899}`}</style>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-bold text-zinc-300 mb-2">{children}</div>;
}
function Row({ l, v }: { l: string; v: string }) {
  return <div className="flex justify-between"><span className="text-zinc-500">{l}</span><span className="font-bold">{v}</span></div>;
}
