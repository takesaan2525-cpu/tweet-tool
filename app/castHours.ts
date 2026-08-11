import type { Cast } from './api/line-webhook/casts';

/* ───────────────────────────────────────────────
   「その子の今日の出勤時間」を1か所で決める（2026-08-12 新設）

   ★なぜ要るか
     出勤時間は2か所に入っている。
       ・cast.hours              … 当日ぶん（昔からある欄。7媒体の出勤botも見る）
       ・cast.schedule['YYYY-MM-DD'] … 週間ぶん（HPの出勤表から読んだもの）
     どちらもHPの同じページ由来なのに、実際に食い違っている子がいた
     （みう：hours=16:00〜翌05:00 / schedule['2026-08-12']=18:00〜翌05:00）。
     ★これは**お客様の予約ページに出る時間**なので、ズレたまま出してはいけない。

   ★決め方＝HPの出勤表（schedule）が絶対。無いときだけ hours を使う。
     API側（/api/casts の syncAttendance）でも hours を schedule に合わせて
     いるので、これは二重の歯止め。片方が古くてもお客様には正しい時間が出る。

   ★schedule に今日のキーが無い場合は hours をそのまま使う＝
     今までどおりの表示になるだけで、悪くはならない。
─────────────────────────────────────────────── */

/** ローカル時計の今日（'YYYY-MM-DD'）。schedule のキーと同じ形式 */
export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** その子の「今日の出勤時間」。HPの出勤表を正とし、無ければ従来の hours。 */
export function todayHours(c: Pick<Cast, 'hours' | 'schedule'>, key = todayKey()): string {
  const fromSchedule = c.schedule?.[key];
  return (fromSchedule && fromSchedule.trim()) || c.hours || '';
}
