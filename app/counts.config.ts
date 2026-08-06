/* ═══════════════════════════════════════════════════════════
   媒体ごとの「本日の残り回数」の定義
   ───────────────────────────────────────────────────────────
   ここに載せたものが /api/counts に保存でき、ボタンの横に
   「残り 24/40」として出る。残り0のボタンは自動でグレーアウトする。

   仕組み：店のPCの scraper/read_counts.js が30分おきに各媒体へ
          ログインして残り回数を「読むだけ」（投稿はしない）
          → /api/counts に保存 → JobsPanel が表示に使う

   ★ id はPC側 read_counts.js のテーブルと一致していないと保存されない
     （安全のため二重管理。片方だけ増えても無視されるだけ）。
   ★ jobId は「この回数が尽きたら押せなくする」ボタン（jobs.config の id）。
     回数を消費しないボタン＝jobId なし（表示だけ）。
═══════════════════════════════════════════════════════════ */

export type CounterDef = {
  id: string;
  /** 画面に出す名前（同じボタンに2つ付くときの区別に使う） */
  label: string;
  /** 1日の上限。「24/40」の40。分からない媒体は null（「残り24回」とだけ出る） */
  dailyCap: number | null;
  /** 回数がリセットされる時刻。これをまたいだ古い数字は信用しない */
  resetHour: number;
  /** この回数で開け閉めするボタン。null＝表示だけ */
  jobId: string | null;
};

export const COUNTERS: CounterDef[] = [
  {
    id: 'deki_joui',
    label: '上位表示',
    dailyCap: 40,
    resetHour: 0,
    jobId: 'deki_joui',
  },
  {
    id: 'eslove_new',
    label: '新着',
    dailyCap: 10,
    resetHour: 0,
    jobId: 'eslove_boost',
  },
  {
    id: 'eslove_work',
    label: '求人',
    dailyCap: 10,
    resetHour: 0,
    jobId: 'eslove_boost',
  },
  {
    id: 'rank_news',
    label: '投稿',
    dailyCap: 5,
    resetHour: 6,
    jobId: 'rank_news',
  },
  {
    id: 'map_wait',
    label: '待機登録',
    dailyCap: null, // 媒体が「登録可能回数 N回」としか出さない（総数の表示なし）
    resetHour: 5,
    jobId: 'map_wait',
  },
  {
    id: 'cocoa_blog',
    /* ★求人ココアの回数は「店長ブログの投稿・編集」の枠。
       画面の「求人ココア 上位表示」ボタンとは別の枠なので、
       ボタンの開け閉てには使わない（jobId なし＝数字を出すだけ）。 */
    label: '求人ココア 店長ブログ',
    dailyCap: 15,
    resetHour: 5,
    jobId: null,
  },
];

export const COUNTER_BY_ID = new Map(COUNTERS.map((c) => [c.id, c]));

/** 読み取りは30分おき。これを過ぎた数字は「古い」＝ボタンは閉めない */
export const STALE_MIN = 75;

/**
 * その数字がまだ信用できるか。
 * ①読んでから STALE_MIN 以上たっていない ②読んだあとに回数リセットをまたいでいない
 * のどちらも満たすときだけ true。＝古い0でボタンを閉めてしまう事故を防ぐ。
 */
export function isFresh(readAt: number, resetHour: number, now = Date.now()): boolean {
  if (!readAt) return false;
  if (now - readAt > STALE_MIN * 60 * 1000) return false;
  return lastResetAt(resetHour, now) <= readAt;
}

/** 直近のリセット時刻（resetHour の today or yesterday）をミリ秒で返す */
export function lastResetAt(resetHour: number, now = Date.now()): number {
  const d = new Date(now);
  const r = new Date(d);
  r.setHours(resetHour, 0, 0, 0);
  if (r.getTime() > now) r.setDate(r.getDate() - 1);
  return r.getTime();
}
