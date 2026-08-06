'use client';

import { useState, useRef, useEffect } from 'react';

/* ════════════════════════════════════════
   ① LINE自動返信シミュレーター
════════════════════════════════════════ */
const AUTO_REPLIES: { keywords: string[]; reply: string }[] = [
  {
    keywords: ['料金', '値段', 'いくら', '費用'],
    reply: '【料金案内】\n\n✅ 60分コース：¥10,000\n✅ 90分コース：¥14,000\n✅ 120分コース：¥18,000\n\nご不明な点はお気軽にどうぞ😊',
  },
  {
    keywords: ['予約', '空き', 'あき'],
    reply: '【空き時間のご案内】\n\n本日の空き時間はこちらです👇\n\n🕐 13:00〜\n🕓 15:00〜\n🕖 18:00〜\n🕘 20:00〜\n\nご希望の時間を教えてください！',
  },
  {
    keywords: ['コース', 'メニュー', '何分'],
    reply: '【コース一覧】\n\n⭐ 60分 ¥10,000\n⭐ 90分 ¥14,000\n⭐ 120分 ¥18,000\n\nご希望のコースをお知らせください！',
  },
  {
    keywords: ['アクセス', '場所', '住所', 'どこ'],
    reply: '【アクセス】\n\n📍 〇〇駅 徒歩3分\n\nご不明な場合はお気軽にご連絡ください！',
  },
  {
    keywords: ['はじめて', '初めて', '初回'],
    reply: '【初めてのお客様へ】\n\nはじめまして😊ご連絡ありがとうございます！\n丁寧にご案内しますのでお気軽にどうぞ。\n\nまず「ご希望のコース」か「空き時間の確認」をお伝えください！',
  },
];

function getAutoReply(input: string): string {
  const lower = input.toLowerCase();
  for (const rule of AUTO_REPLIES) {
    if (rule.keywords.some((k) => lower.includes(k))) return rule.reply;
  }
  return 'ご連絡ありがとうございます！\n\n【よく聞かれること👇】\n・料金について\n・予約・空き時間\n・コース・メニュー\n・アクセス\n\nお気軽にどうぞ😊';
}

type ChatMsg = { from: 'user' | 'bot'; text: string };

function LineDemo() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { from: 'bot', text: 'こんにちは！\n何でもお気軽にどうぞ😊\n\n例）「料金は？」「予約したい」「コースは？」' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, isTyping]);

  function send() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMsgs((p) => [...p, { from: 'user', text: userMsg }]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMsgs((p) => [...p, { from: 'bot', text: getAutoReply(userMsg) }]);
    }, 900);
  }

  const QUICK = ['料金は？', '予約したい', 'コースは？', 'アクセスは？'];

  return (
    <div className="space-y-3">
      <div className="bg-[#ACC8A3] rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-[#06C755] px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-sm font-black text-white">G</div>
          <div>
            <div className="text-white font-bold text-sm">GrowUP デモ店舗</div>
            <div className="text-green-100 text-xs">公式LINE（デモ）</div>
          </div>
        </div>
        <div className="h-56 overflow-y-auto px-3 py-3 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
              {m.from === 'bot' && <div className="w-7 h-7 rounded-full bg-[#06C755] flex items-center justify-center text-xs font-black text-white shrink-0 mt-1">G</div>}
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${m.from === 'user' ? 'bg-[#06C755] text-white rounded-tr-sm' : 'bg-white text-zinc-800 rounded-tl-sm'}`}>{m.text}</div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start gap-2">
              <div className="w-7 h-7 rounded-full bg-[#06C755] flex items-center justify-center text-xs font-black text-white shrink-0">G</div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex gap-1">{[0,1,2].map((i) => <div key={i} className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="bg-[#BDD5B5] px-3 py-2 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="メッセージを入力..." className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-zinc-800 outline-none placeholder-zinc-400" />
          <button onClick={send} className="bg-[#06C755] text-white rounded-full w-9 h-9 flex items-center justify-center shrink-0 font-bold">↑</button>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {QUICK.map((q) => (
          <button key={q} onClick={() => { setInput(q); }}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full transition-colors">
            {q}
          </button>
        ))}
      </div>
      <p className="text-xs text-zinc-600 text-center">↑ クイック入力でも試せます</p>
    </div>
  );
}

/* ════════════════════════════════════════
   ② 予約連動シミュレーター
════════════════════════════════════════ */
const BOOKING_SITES = ['エステラブ', 'マッサージ師', 'リラナビ', 'エスタ', 'ヒーリング'];
const ALL_TIMES = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

type SiteBookings = Record<string, string[]>;

function BookingSyncDemo() {
  const initBooked: SiteBookings = Object.fromEntries(BOOKING_SITES.map((s) => [s, ['12:00', '15:00']]));
  const [siteBookings, setSiteBookings] = useState<SiteBookings>(initBooked);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState(BOOKING_SITES[0]);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  const mainBooked = siteBookings[selectedSite] ?? [];

  function bookAndSync() {
    if (!selectedTime || syncing) return;
    setSyncing(true);
    setSyncDone(false);
    setSyncLog([]);
    const time = selectedTime;
    setSelectedTime(null);

    // まず選択サイトに予約確定
    setSiteBookings((prev) => ({ ...prev, [selectedSite]: [...prev[selectedSite], time] }));

    // 他サイトを順番に自動更新
    const otherSites = BOOKING_SITES.filter((s) => s !== selectedSite);
    otherSites.forEach((site, i) => {
      setTimeout(() => {
        setSiteBookings((prev) => ({ ...prev, [site]: [...prev[site], time] }));
        setSyncLog((prev) => [...prev, `${site} の ${time} を自動でブロック ✅`]);
        if (i === otherSites.length - 1) {
          setSyncing(false);
          setSyncDone(true);
        }
      }, (i + 1) * 700);
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
        <div className="text-xs text-zinc-400 font-bold">予約を受け付けるサイト</div>
        <div className="flex gap-2 flex-wrap">
          {BOOKING_SITES.map((s) => (
            <button key={s} onClick={() => { setSelectedSite(s); setSelectedTime(null); }}
              className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${selectedSite === s ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="text-xs text-zinc-400 font-bold mt-2">空き時間を選択</div>
        <div className="grid grid-cols-5 gap-2">
          {ALL_TIMES.map((t) => {
            const isBooked = mainBooked.includes(t);
            const isSel = selectedTime === t;
            return (
              <button key={t} onClick={() => !isBooked && setSelectedTime(isSel ? null : t)} disabled={isBooked || syncing}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${isBooked ? 'bg-zinc-900 text-zinc-700 line-through cursor-not-allowed' : isSel ? 'bg-blue-500 text-white scale-105' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}>
                {t}
              </button>
            );
          })}
        </div>
        {selectedTime && !syncing && (
          <button onClick={bookAndSync} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-colors">
            {selectedTime} で予約確定 → 全サイト自動更新
          </button>
        )}
      </div>

      {(syncing || syncDone) && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-2">
          <div className="text-xs font-bold text-zinc-300 mb-2">🔄 他サイトを自動更新中...</div>
          {syncLog.map((log, i) => (
            <div key={i} className="text-xs text-green-400">{log}</div>
          ))}
          {syncing && <div className="text-xs text-yellow-400 animate-pulse">更新中...</div>}
          {syncDone && (
            <div className="mt-2 bg-green-900/40 border border-green-700 rounded-lg p-2 text-xs text-green-300 text-center font-bold">
              🎉 全{BOOKING_SITES.length}サイトのブロックが完了！ダブルブッキング防止
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-zinc-600 text-center">1つのサイトで予約確定 → 他サイトが自動でブロックされます</p>
    </div>
  );
}

/* ════════════════════════════════════════
   ③ キャスト売上管理デモ
════════════════════════════════════════ */
type Cast = { name: string; color: string; sales: number[]; shimei: number };
const CASTS: Cast[] = [
  { name: 'みく', color: 'bg-pink-500', sales: [28000, 42000, 56000, 38000, 64000, 72000, 48000], shimei: 12 },
  { name: 'あおい', color: 'bg-purple-500', sales: [18000, 24000, 31000, 45000, 38000, 52000, 41000], shimei: 8 },
  { name: 'りな', color: 'bg-blue-500', sales: [12000, 18000, 22000, 28000, 19000, 35000, 30000], shimei: 5 },
  { name: 'さくら', color: 'bg-yellow-500', sales: [8000, 14000, 16000, 20000, 24000, 28000, 22000], shimei: 3 },
];
const WEEKS = ['4週前', '3週前', '2週前', '先週', '今週'];

function SalesDemo() {
  const [selected, setSelected] = useState<Cast>(CASTS[0]);
  const maxSale = Math.max(...selected.sales);
  const total = selected.sales.reduce((a, b) => a + b, 0);
  const thisWeek = selected.sales[selected.sales.length - 1];
  const lastWeek = selected.sales[selected.sales.length - 2];
  const diff = thisWeek - lastWeek;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {CASTS.map((c) => (
          <button key={c.name} onClick={() => setSelected(c)}
            className={`py-3 rounded-xl text-sm font-black transition-all flex flex-col items-center gap-1 ${selected.name === c.name ? 'bg-zinc-700 ring-2 ring-blue-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
            <div className={`w-8 h-8 rounded-full ${c.color} flex items-center justify-center text-white text-xs font-black`}>{c.name[0]}</div>
            <span className="text-xs">{c.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-800 rounded-xl p-3 text-center">
          <div className="text-lg font-black text-white">¥{(total/1000).toFixed(0)}k</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">月間売上</div>
        </div>
        <div className="bg-zinc-800 rounded-xl p-3 text-center">
          <div className={`text-lg font-black ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {diff >= 0 ? '↑' : '↓'}¥{Math.abs(diff/1000).toFixed(0)}k
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">先週比</div>
        </div>
        <div className="bg-zinc-800 rounded-xl p-3 text-center">
          <div className="text-lg font-black text-yellow-400">{selected.shimei}件</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">指名数</div>
        </div>
      </div>

      <div className="bg-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-400 font-bold mb-3">{selected.name} の週別売上</div>
        <div className="flex items-end gap-2 h-24">
          {selected.sales.slice(-5).map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[9px] text-zinc-500">¥{(s/1000).toFixed(0)}k</div>
              <div className={`w-full rounded-t-md transition-all ${selected.color}`} style={{ height: `${(s / maxSale) * 72}px` }} />
              <div className="text-[9px] text-zinc-600">{WEEKS[i]}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-zinc-600 text-center">キャストをタップして売上を確認</p>
    </div>
  );
}

/* ════════════════════════════════════════
   ④ 出勤スケジュール管理
════════════════════════════════════════ */
const CAST_NAMES = ['みく', 'あおい', 'りな', 'さくら'];
const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
type Schedule = Record<string, Record<string, boolean>>;

function ScheduleDemo() {
  const initSchedule: Schedule = {
    'みく':   { '月': true,  '火': false, '水': true,  '木': false, '金': true,  '土': true,  '日': false },
    'あおい': { '月': false, '火': true,  '水': false, '木': true,  '金': false, '土': true,  '日': true  },
    'りな':   { '月': true,  '火': true,  '水': false, '木': false, '金': true,  '土': false, '日': false },
    'さくら': { '月': false, '火': false, '水': true,  '木': true,  '金': false, '土': true,  '日': true  },
  };
  const [schedule, setSchedule] = useState<Schedule>(initSchedule);
  const [saved, setSaved] = useState(false);

  function toggle(cast: string, day: string) {
    setSchedule((prev) => ({ ...prev, [cast]: { ...prev[cast], [day]: !prev[cast][day] } }));
    setSaved(false);
  }

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-8 text-[10px] text-zinc-500 font-bold border-b border-zinc-700">
          <div className="p-2">キャスト</div>
          {DAYS.map((d) => <div key={d} className="p-2 text-center">{d}</div>)}
        </div>
        {CAST_NAMES.map((cast) => (
          <div key={cast} className="grid grid-cols-8 border-b border-zinc-700/50 last:border-0">
            <div className="p-2 text-xs font-bold text-zinc-300 flex items-center">{cast}</div>
            {DAYS.map((day) => (
              <button key={day} onClick={() => toggle(cast, day)}
                className={`m-1 rounded-lg text-[10px] font-bold transition-all ${schedule[cast][day] ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-600'}`}>
                {schedule[cast][day] ? '出' : '休'}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="bg-zinc-800 rounded-xl p-3">
        <div className="text-xs text-zinc-400 font-bold mb-2">今週の出勤人数</div>
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((day) => {
            const count = CAST_NAMES.filter((c) => schedule[c][day]).length;
            return (
              <div key={day} className="text-center">
                <div className={`text-base font-black ${count >= 3 ? 'text-green-400' : count >= 2 ? 'text-yellow-400' : 'text-zinc-600'}`}>{count}</div>
                <div className="text-[9px] text-zinc-600">{day}</div>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={save} className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
        {saved ? '✅ 保存しました！キャストにLINE通知を送信中...' : 'シフトを保存してキャストに通知する'}
      </button>
      <p className="text-xs text-zinc-600 text-center">タップで出勤・休みを切り替え</p>
    </div>
  );
}

/* ════════════════════════════════════════
   ⑤ リピーター管理
════════════════════════════════════════ */
type Customer = { name: string; lastVisit: string; count: number; course: string; cast: string; memo: string; birthday: string };
const CUSTOMERS: Customer[] = [
  { name: 'Aさん', lastVisit: '3日前', count: 12, course: '90分', cast: 'みく', memo: '肩こりひどめ・おしゃべり好き', birthday: '11/15' },
  { name: 'Bさん', lastVisit: '1週間前', count: 7, course: '60分', cast: 'あおい', memo: '静かな施術希望', birthday: '3/22' },
  { name: 'Cさん', lastVisit: '2週間前', count: 4, course: '120分', cast: 'みく', memo: '背中重点的に', birthday: '8/7' },
  { name: 'Dさん', lastVisit: '1ヶ月前', count: 2, course: '60分', cast: 'りな', memo: '初回割引使用', birthday: '1/30' },
];

function RepeatDemo() {
  const [selected, setSelected] = useState<Customer | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  function sendCoupon(name: string) {
    setSent(name);
    setTimeout(() => setSent(null), 2500);
  }

  return (
    <div className="space-y-3">
      {CUSTOMERS.map((c) => (
        <div key={c.name} className="bg-zinc-800 rounded-xl overflow-hidden">
          <button onClick={() => setSelected(selected?.name === c.name ? null : c)} className="w-full px-4 py-3 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-black text-zinc-300">{c.name[0]}</div>
              <div>
                <div className="text-sm font-bold">{c.name}</div>
                <div className="text-xs text-zinc-500">最終来店：{c.lastVisit}　来店{c.count}回</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {c.count >= 10 && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold">VIP</span>}
              {c.lastVisit === '1ヶ月前' && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">要フォロー</span>}
              <svg className={`w-4 h-4 text-zinc-500 transition-transform ${selected?.name === c.name ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </button>
          {selected?.name === c.name && (
            <div className="border-t border-zinc-700 px-4 py-3 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-900 rounded-lg p-2"><span className="text-zinc-500">よく使うコース</span><div className="font-bold mt-0.5">{c.course}</div></div>
                <div className="bg-zinc-900 rounded-lg p-2"><span className="text-zinc-500">担当</span><div className="font-bold mt-0.5">{c.cast}</div></div>
                <div className="bg-zinc-900 rounded-lg p-2 col-span-2"><span className="text-zinc-500">メモ</span><div className="font-bold mt-0.5">{c.memo}</div></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => sendCoupon(c.name)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${sent === c.name ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                  {sent === c.name ? '✅ 送信しました！' : `🎁 クーポンをLINEで送る`}
                </button>
                <div className="bg-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-400 flex items-center">
                  🎂 {c.birthday}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      <p className="text-xs text-zinc-600 text-center">お客様をタップして詳細・クーポン送信</p>
    </div>
  );
}

/* ════════════════════════════════════════
   ⑥ 掲載サイト自動更新
════════════════════════════════════════ */
const PORTAL_SITES = ['エステラブ', 'ココア', '駅ちか', 'エス魂', 'メンエスMAP'];

function BoostDemo() {
  const [updated, setUpdated] = useState<Record<string, boolean>>(
    () => Object.fromEntries(PORTAL_SITES.map((s) => [s, false]))
  );
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  function runBoost() {
    if (running) return;
    setRunning(true); setDone(false); setLog([]);
    PORTAL_SITES.forEach((site, i) => {
      setTimeout(() => {
        setUpdated((p) => ({ ...p, [site]: true }));
        const now = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        setLog((p) => [...p, `${site} の掲載情報を更新しました（${now}）✅`]);
        if (i === PORTAL_SITES.length - 1) { setRunning(false); setDone(true); }
      }, (i + 1) * 650);
    });
  }
  function reset() { setUpdated(Object.fromEntries(PORTAL_SITES.map((s) => [s, false]))); setDone(false); setLog([]); }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {PORTAL_SITES.map((s) => {
          const isUpdated = updated[s];
          return (
            <div key={s} className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-all ${isUpdated ? 'bg-emerald-900/30 border-emerald-600' : 'bg-zinc-800 border-zinc-700'}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{s}</span>
                {isUpdated && <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full">更新済み</span>}
              </div>
              <span className={`text-sm font-black ${isUpdated ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {isUpdated ? '更新完了' : '更新待ち'}
              </span>
            </div>
          );
        })}
      </div>

      {!running && !done && (
        <button onClick={runBoost} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black text-sm transition-colors">
          ⚡ 全サイトを自動更新する
        </button>
      )}
      {(running || done) && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-1.5">
          {log.map((l, i) => <div key={i} className="text-xs text-emerald-400">{l}</div>)}
          {running && <div className="text-xs text-yellow-400 animate-pulse">更新中…</div>}
          {done && (
            <>
              <div className="mt-2 bg-emerald-900/40 border border-emerald-700 rounded-lg p-2 text-xs text-emerald-300 text-center font-bold">
                ✅ 全{PORTAL_SITES.length}サイトの更新が完了！これを毎日・自動で繰り返します
              </div>
              <button onClick={reset} className="w-full mt-2 py-2 rounded-lg bg-zinc-700 text-xs font-bold">もう一度見る</button>
            </>
          )}
        </div>
      )}

      <div className="bg-gradient-to-br from-emerald-900/30 to-zinc-900 border border-emerald-800/40 rounded-xl p-4 text-center">
        <div className="text-xs text-zinc-400">掲載情報を設定した時間に自動で更新し、更新漏れを防止します。</div>
        <div className="text-sm font-bold text-emerald-300 mt-1">毎日の更新作業を自動化し、更新漏れを防止</div>
        <div className="text-[11px] text-zinc-500 mt-2">先行導入プラン：初期設定費 <span className="text-white font-bold">55,000円</span>（税込）/ 月額 <span className="text-white font-bold">9,800円</span>（税込）</div>
      </div>
      <p className="text-xs text-zinc-600 text-center">↑ ボタンを押すと自動更新の流れを体験できます</p>
    </div>
  );
}

/* ════════════════════════════════════════
   ⑦ 店舗管理システム（匿名デモ）
════════════════════════════════════════ */
const DEMO_CASTS = ['みく', 'あおい', 'りな', 'さくら', 'ゆい'];
// 匿名デモ用コースメニュー（種別×時間／顧客料金・キャスト給与）
const DEMO_MENU: { type: string; items: Record<number, { price: number; pay: number }> }[] = [
  { type: 'スタンダード', items: { 60: { price: 9000, pay: 5000 }, 90: { price: 13000, pay: 7500 }, 120: { price: 17000, pay: 10000 }, 150: { price: 21000, pay: 12500 } } },
  { type: 'スペシャル',   items: { 60: { price: 12000, pay: 7000 }, 90: { price: 16000, pay: 9500 }, 120: { price: 20000, pay: 12000 }, 150: { price: 24000, pay: 14500 } } },
  { type: 'プレミアム',   items: { 60: { price: 16000, pay: 9000 }, 90: { price: 20000, pay: 12000 }, 120: { price: 25000, pay: 15000 }, 150: { price: 30000, pay: 18000 } } },
];
const TYPE_BONUS: Record<string, number> = { 'フリー': 0, '指名': 1000, 'リピーター': 2000 };
const EXT_FEE = 5000;
const yen = (n: number) => '¥' + n.toLocaleString('ja-JP');

function AdminDemo() {
  const [tab, setTab] = useState<'resv' | 'pay'>('resv');
  const [toast, setToast] = useState('');

  // 予約登録
  const [form, setForm] = useState({ time: '', cast: '', place: '', customer: '' });
  const [rType, setRType] = useState(DEMO_MENU[0].type);
  const [rMin, setRMin] = useState<number | null>(null);
  const rMenu = DEMO_MENU.find((m) => m.type === rType)!;
  const rPrice = rMin ? rMenu.items[rMin]?.price : 0;

  // 給与計算
  const [pType, setPType] = useState(DEMO_MENU[0].type);
  const [pMin, setPMin] = useState<number>(90);
  const [pCust, setPCust] = useState('フリー');
  const [pExt, setPExt] = useState('0');
  const [sessions, setSessions] = useState<{ label: string; amount: number }[]>([]);
  const pMenu = DEMO_MENU.find((m) => m.type === pType)!;
  const extN = Number(pExt) || 0;
  const curPay = (pMenu.items[pMin]?.pay ?? 0) + (TYPE_BONUS[pCust] ?? 0) + extN * EXT_FEE;
  const dayTotal = sessions.reduce((s, x) => s + x.amount, 0);

  function confirm() {
    if (!form.time || !form.cast || !rMin) { setToast('⚠️ 時間・キャスト・コースを選んでください'); setTimeout(() => setToast(''), 2500); return; }
    setToast(`✅ 予約確定！${form.cast}へLINE自動通知＆お客様へ確認SMSを送信しました`);
    setForm({ time: '', cast: '', place: '', customer: '' }); setRMin(null);
    setTimeout(() => setToast(''), 3500);
  }
  function addSession() {
    const label = `${pType} ${pMin}分・${pCust}${extN ? `・延長${extN}` : ''}`;
    setSessions((p) => [...p, { label, amount: curPay }]);
  }

  return (
    <div className="space-y-4">
      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-2">
        {[['本日の予約', '8件', 'text-blue-400'], ['本日出勤', '5名', 'text-pink-400'], ['在籍キャスト', '14名', 'text-emerald-400']].map(([l, v, c]) => (
          <div key={l} className="bg-zinc-800 rounded-xl p-3 text-center">
            <div className={`text-xl font-black ${c}`}>{v}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* 切替 */}
      <div className="flex gap-1.5 bg-zinc-800 p-1 rounded-xl">
        <button onClick={() => setTab('resv')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${tab === 'resv' ? 'bg-blue-600' : 'text-zinc-400'}`}>予約登録</button>
        <button onClick={() => setTab('pay')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${tab === 'pay' ? 'bg-blue-600' : 'text-zinc-400'}`}>給与計算</button>
      </div>

      {tab === 'resv' && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[11px] text-zinc-400 font-bold mb-1">時間</div>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none" />
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 font-bold mb-1">キャスト</div>
              <select value={form.cast} onChange={(e) => setForm({ ...form, cast: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="">選択</option>
                {DEMO_CASTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 font-bold mb-1">コース種別</div>
            <div className="flex gap-1.5">
              {DEMO_MENU.map((m) => (
                <button key={m.type} onClick={() => { setRType(m.type); setRMin(null); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${rType === m.type ? 'bg-blue-600' : 'bg-zinc-900 text-zinc-400'}`}>{m.type}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(rMenu.items).map(([m, v]) => {
              const min = Number(m); const sel = rMin === min;
              return (
                <button key={m} onClick={() => setRMin(min)} className={`py-2 rounded-lg text-center transition ${sel ? 'bg-pink-600' : 'bg-zinc-900'}`}>
                  <div className="text-sm font-bold">{min}分</div>
                  <div className={`text-[10px] ${sel ? 'text-pink-100' : 'text-zinc-400'}`}>{(v.price / 1000)}k</div>
                </button>
              );
            })}
          </div>
          <input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder="場所（ホテル等）" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-zinc-500" />
          <input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="お客様（例：A様 指名）" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-zinc-500" />
          {rMin ? <div className="text-center text-xs text-pink-300 font-bold">選択中：{rType} {rMin}分／{yen(rPrice!)}</div> : null}
          <button onClick={confirm} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-sm transition">予約を確定する</button>
          <p className="text-[11px] text-zinc-500 text-center">確定するとキャストのLINEへ自動通知＋お客様へ確認SMS</p>
        </div>
      )}

      {tab === 'pay' && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
          <div>
            <div className="text-[11px] text-zinc-400 font-bold mb-1">コース種別</div>
            <div className="flex gap-1.5">
              {DEMO_MENU.map((m) => (
                <button key={m.type} onClick={() => setPType(m.type)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${pType === m.type ? 'bg-blue-600' : 'bg-zinc-900 text-zinc-400'}`}>{m.type}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.keys(pMenu.items).map((m) => {
              const min = Number(m); const sel = pMin === min;
              return (
                <button key={m} onClick={() => setPMin(min)} className={`py-2 rounded-lg text-sm font-bold transition ${sel ? 'bg-pink-600' : 'bg-zinc-900 text-zinc-400'}`}>{min}分</button>
              );
            })}
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 font-bold mb-1">客タイプ</div>
            <div className="grid grid-cols-3 gap-2">
              {['フリー', '指名', 'リピーター'].map((t) => (
                <button key={t} onClick={() => setPCust(t)} className={`py-2 rounded-lg text-sm font-bold transition ${pCust === t ? 'bg-violet-600' : 'bg-zinc-900 text-zinc-400'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 font-bold mb-1">延長30分（回数）</div>
            <input inputMode="numeric" value={pExt} onChange={(e) => setPExt(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-zinc-400">この区分の給与</span>
            <span className="text-xl font-black text-emerald-400">{yen(curPay)}</span>
          </div>
          <button onClick={addSession} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition">＋ 本日の給与に追加</button>

          {sessions.length > 0 && (
            <div className="bg-zinc-900 rounded-xl p-3 space-y-1.5">
              <div className="text-[11px] text-zinc-400 font-bold mb-1">本日の明細（{sessions.length}本）</div>
              {sessions.map((s, i) => (
                <div key={i} className="flex justify-between text-xs"><span className="text-zinc-400">{i + 1}. {s.label}</span><span className="font-bold">{yen(s.amount)}</span></div>
              ))}
              <div className="border-t border-zinc-700 my-2" />
              <div className="flex justify-between items-center"><span className="font-bold text-sm">本日の支給合計</span><span className="text-2xl font-black text-emerald-400">{yen(dayTotal)}</span></div>
              <button onClick={() => setSessions([])} className="w-full mt-2 py-2 rounded-lg bg-zinc-800 text-xs font-bold">クリア</button>
            </div>
          )}
          <p className="text-[11px] text-zinc-500 text-center">🔒 金額データは保存しません（その場で計算するだけ）</p>
        </div>
      )}

      {toast && <div className="bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-3 text-sm text-center">{toast}</div>}
      <p className="text-xs text-zinc-600 text-center">実際の管理画面と同じ操作感を体験できます（データはダミー）</p>
    </div>
  );
}

/* ════════════════════════════════════════
   メインページ
════════════════════════════════════════ */
const TABS = [
  { key: 'boost',    label: '掲載更新',   emoji: '📡' },
  { key: 'admin',    label: '管理画面',   emoji: '🗂' },
  { key: 'line',     label: 'LINE返信',  emoji: '💬' },
  { key: 'sync',     label: '予約連動',  emoji: '🔗' },
  { key: 'sales',    label: '売上管理',  emoji: '📊' },
  { key: 'schedule', label: 'シフト',    emoji: '📅' },
  { key: 'repeat',   label: 'リピーター', emoji: '⭐' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function DemoPage() {
  const [activeDemo, setActiveDemo] = useState<TabKey>('boost');

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="bg-zinc-900/90 backdrop-blur border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-blue-400 font-black text-lg">GrowUP</span>
            <span className="text-zinc-400 text-sm ml-2">店舗DX｜操作デモ</span>
          </div>
          <a href="https://lin.ee/Y4Uq7uP" target="_blank" rel="noopener noreferrer"
            className="bg-[#06C755] text-white text-xs font-bold px-3 py-1.5 rounded-full">
            LINE相談
          </a>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-block text-[11px] font-bold text-emerald-300 bg-emerald-900/40 border border-emerald-700/50 px-3 py-1 rounded-full">メンズエステ専門・実店舗で稼働中</div>
          <h1 className="text-2xl font-black leading-tight">予約・掲載更新・キャスト管理を<br /><span className="text-blue-400">まるごと自動化</span></h1>
          <p className="text-sm text-zinc-400">
            掲載情報の定期更新／ネット予約／LINE通知／出勤・売上管理まで、<br />
            お店の業務を1つの管理画面にまとめます。
          </p>
          <p className="text-xs text-zinc-500">下のデモは実際に触って動かせます👇</p>
          <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-2.5 text-[11px] text-zinc-400 text-left leading-relaxed">
            ⚠️ デモ画面のため、表示されている店舗名、予約情報、売上情報はサンプルです。
          </div>
        </div>

        {/* タブ */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveDemo(tab.key)}
              className={`flex-shrink-0 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 min-w-[64px] ${activeDemo === tab.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              <span className="text-base">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* デモ本体 */}
        <div className="bg-zinc-900 rounded-2xl p-5 space-y-4">
          {activeDemo === 'boost' && (
            <>
              <div><h2 className="font-black text-base mb-1">📡 掲載サイト自動更新</h2><p className="text-xs text-zinc-500">エステラブ・ココア・駅ちか・エス魂・メンエスMAPの更新作業を自動化し、更新漏れを防止します</p></div>
              <BoostDemo />
            </>
          )}
          {activeDemo === 'admin' && (
            <>
              <div><h2 className="font-black text-base mb-1">🗂 店舗管理システム</h2><p className="text-xs text-zinc-500">予約登録・給与計算など、お店側の管理画面を体験できます（データはダミー）</p></div>
              <AdminDemo />
            </>
          )}
          {activeDemo === 'line' && (
            <>
              <div><h2 className="font-black text-base mb-1">💬 LINE自動返信シミュレーター</h2><p className="text-xs text-zinc-500">「料金は？」「予約したい」など入力すると自動で返信が来ます</p></div>
              <LineDemo />
            </>
          )}
          {activeDemo === 'sync' && (
            <>
              <div><h2 className="font-black text-base mb-1">🔗 予約連動シミュレーター</h2><p className="text-xs text-zinc-500">1サイトで予約確定 → 他サイトが自動でブロックされダブルブッキング防止</p></div>
              <BookingSyncDemo />
            </>
          )}
          {activeDemo === 'sales' && (
            <>
              <div><h2 className="font-black text-base mb-1">📊 キャスト売上管理</h2><p className="text-xs text-zinc-500">キャストごとの売上・指名数・週別推移が一目でわかります</p></div>
              <SalesDemo />
            </>
          )}
          {activeDemo === 'schedule' && (
            <>
              <div><h2 className="font-black text-base mb-1">📅 出勤シフト管理</h2><p className="text-xs text-zinc-500">シフトをタップで管理・保存するとキャストにLINEで自動通知</p></div>
              <ScheduleDemo />
            </>
          )}
          {activeDemo === 'repeat' && (
            <>
              <div><h2 className="font-black text-base mb-1">⭐ リピーター管理</h2><p className="text-xs text-zinc-500">お客様ごとの来店履歴・担当・メモを管理。クーポンも1タップで送信</p></div>
              <RepeatDemo />
            </>
          )}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-blue-900/50 to-zinc-900 border border-blue-800/50 rounded-2xl p-5 space-y-4 text-center">
          <div>
            <p className="font-black text-base">このシステムを自分の店に導入したい？</p>
            <p className="text-sm text-zinc-400 mt-1"><span className="text-white font-bold">先行導入プラン：初期設定費 55,000円（税込）/ 月額 9,800円（税込）</span><br />共通システムを店舗運用に合わせて初期設定します。相談だけでもOK。</p>
          </div>
          <a href="https://lin.ee/Y4Uq7uP" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 bg-[#06C755] hover:bg-[#05b34c] rounded-xl font-black text-base transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
            LINEで無料相談する
          </a>
          <p className="text-xs text-zinc-600">返信は通常当日中・相談だけでもOKです</p>
        </div>
      </div>
    </div>
  );
}
