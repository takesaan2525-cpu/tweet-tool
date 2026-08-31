'use client';

import { useEffect, useRef, useState } from 'react';

/* ───────────────────────────────────────────────
   「終わりました」の通知（2026-09-01 追加）

   途中経過を出しただけでは、画面を閉じて戻ってきた時に
   「終わったのかどうか」が分からないままだった。
   実行中だったものが終わったのを見つけて、消えないお知らせを出す。

   ★消えるトースト（数秒で消える）にはしない。
     押した本人がスマホを置いている間に終わるのがふつうなので、
     数秒で消えるお知らせは高い確率で見逃される。
     ここは「×を押すまで残る」お知らせにする。

   ★端末の通知（バナー・音）はブラウザの許可が要るうえ、
     iPhoneはホーム画面に追加していないと出せない。
     許可済みの時だけ添える＝出なくても画面のお知らせで用は足りる。
─────────────────────────────────────────────── */

export type DoneNotice = { id: string; name: string; ok: boolean; message: string; at: number };

type Watchable = {
  id: string; name: string;
  status: 'idle' | 'queued' | 'running';
  lastOk: boolean | null; lastMessage: string; lastRunAt: number | null;
};

export default function useJobDone(jobs: Watchable[]) {
  /** 前回見たときに動いていたジョブのid */
  const wasBusy = useRef<Set<string>>(new Set());
  /** 同じ実行で二重にお知らせを出さないための目印（id + 終わった時刻） */
  const notified = useRef<Set<string>>(new Set());
  const [notices, setNotices] = useState<DoneNotice[]>([]);

  useEffect(() => {
    if (!jobs.length) return;
    const nextBusy = new Set<string>();
    const fresh: DoneNotice[] = [];

    for (const j of jobs) {
      if (j.status !== 'idle') { nextBusy.add(j.id); continue; }
      // 動いていたものが idle になった＝終わった
      if (!wasBusy.current.has(j.id) || !j.lastRunAt) continue;
      const key = `${j.id}:${j.lastRunAt}`;
      if (notified.current.has(key)) continue;
      notified.current.add(key);
      fresh.push({
        id: j.id, name: j.name,
        ok: j.lastOk !== false,
        message: j.lastMessage || (j.lastOk ? '完了しました' : '失敗しました'),
        at: j.lastRunAt,
      });
    }
    wasBusy.current = nextBusy;

    if (!fresh.length) return;
    setNotices((p) => [...fresh, ...p].slice(0, 5));

    /* 端末の通知は「すでに許可されている時」だけ。ここで許可を求めない
       （押した覚えのないタイミングで許可を聞かれると、たいてい拒否される）。 */
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      for (const n of fresh) {
        try {
          new Notification(`${n.ok ? '✅' : '⚠️'} ${n.name}`, { body: n.message, tag: `${n.id}:${n.at}` });
        } catch { /* 通知が出せなくても画面のお知らせが残るので気にしない */ }
      }
    }
  }, [jobs]);

  const dismiss = (at: number, id: string) =>
    setNotices((p) => p.filter((n) => !(n.at === at && n.id === id)));

  /** 端末の通知を使いたい人向け。ボタンを押した時だけ許可を聞く。 */
  const askDeviceNotice = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    try { return await Notification.requestPermission(); } catch { return 'denied'; }
  };

  return { notices, dismiss, askDeviceNotice };
}
