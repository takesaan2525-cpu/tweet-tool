// Zero（梅田）キャスト情報 ─ 実データ＋顔写真（zero-esthe.com より）
// ※type/commentは仮。出勤(today)は運用では日次で切り替える。
export type Cast = {
  id?: string; // 安定した内部ID（名前変更しても追跡できる）。DB管理で付与。
  name: string; age: number; height: number; cup: string;
  type: string; comment: string; hours: string; photo: string; today: boolean;
  // 週間出勤。キー='YYYY-MM-DD'、値='20:00〜翌2:00'（時間が読めない日は空文字）。
  // キーが有る日＝出勤、無い日＝休み。today/hours は当日ぶんの後方互換として残す
  // （7媒体の出勤botとStaffPanelが today を見ているため、こちらは消さない）。
  schedule?: Record<string, string>;
  // その子がLINE公式アカウントを友だち追加したら、ここにLINEのuserId(Uxxxx...)を入れる。
  // 入っていれば本日出勤の予約はこの子へ直接push。空なら店(受付)へ通知。
  lineUserId?: string;
};

const photo = (id: number) => `https://zero-esthe.com/photos/${id}/raw_${id}.jpg`;

export const CASTS: Cast[] = [
  { name: 'さくらこ', age: 26, height: 160, cup: 'C', type: 'お姉さん',        comment: '', hours: '20:00〜翌2:00', photo: photo(12),  today: true,  lineUserId: '' },
  { name: 'ななみ',   age: 24, height: 149, cup: 'B', type: '小柄・スレンダー', comment: '', hours: '20:00〜翌5:00', photo: photo(197), today: true,  lineUserId: '' },
  { name: 'まな',     age: 21, height: 144, cup: 'C', type: 'ロリ・小柄',      comment: '', hours: '21:00〜翌3:00', photo: photo(114), today: true,  lineUserId: '' },
  { name: 'ゆうか',   age: 30, height: 161, cup: 'D', type: 'お姉さん・癒し',  comment: '', hours: '22:00〜翌5:00', photo: photo(14),  today: true,  lineUserId: '' },
  { name: 'ミルク',   age: 21, height: 158, cup: 'D', type: '若手・人気',      comment: '', hours: '23:00〜翌5:00', photo: photo(204), today: true,  lineUserId: '' },
  { name: '伊織',     age: 22, height: 155, cup: 'E', type: 'グラマー',        comment: '', hours: '本日お休み',    photo: photo(9),   today: false, lineUserId: '' },
];

// コース料金は店舗マスタ(shop.config)に集約。ここからは再エクスポート（既存importを維持）。
export { COURSE_MENU, COURSES, courseLabel } from '../../shop.config';

export function castInfo(): string {
  return CASTS.map((c) =>
    `・${c.name}（${c.age}歳/${c.height}cm/${c.cup}カップ/${c.type}）${c.today ? `本日出勤 ${c.hours}` : '本日お休み'}`
  ).join('\n');
}
