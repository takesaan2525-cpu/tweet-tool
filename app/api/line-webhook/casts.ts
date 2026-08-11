// Zero（梅田）キャスト情報 ─ 実データ＋顔写真（zero-esthe.com より）
// ※type/commentは仮。出勤(today)は運用では日次で切り替える。
export type Cast = {
  id?: string; // 安定した内部ID（名前変更しても追跡できる）。DB管理で付与。
  name: string; age: number; height: number; cup: string;
  type: string; comment: string; hours: string; photo: string; today: boolean;
  /* サブ写真。photo（メイン）に続く2枚目以降を駅ちかから取り込んで持つ。
     ★2026-08-11 追加。駅ちかは1人あたり最大8枚もてるのに、うちは1枚しか
       使っておらず、媒体に配れるのも1枚だけだった。
     ★photo とは別に持つ理由＝既存の画面・botは全部 photo を見ているので、
       そこの意味を変えずに増やす（photos[0] は photo と同じものが入る）。 */
  photos?: string[];
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

/* LINEの予約受付AIに渡す在籍一覧。
   🔴★2026-08-12：ここは長いあいだ**コードに書いた初期データ(CASTS)**を返していた。
     ＝LINEのAIはお客様に「ミルク」など今は居ない子を含む6名を案内し、
       出勤時間も古いままだった（実際の在籍は24名）。
     ＝お客様に見せる情報なので、必ず生きた名簿(/api/casts の getCasts)を読む。
   ★出勤時間は castHours の todayHours を使う＝予約ページと同じ出し方にする
     （HPの出勤表が正。cast.hours を直接出さない）。
   ★引数で受けるのは、この層から /api/casts/route を import すると
     循環参照になるため。呼ぶ側（route.ts）が読んで渡す。 */
export function castInfo(list: Cast[] = CASTS, hoursOf: (c: Cast) => string = (c) => c.hours): string {
  return list.map((c) => {
    const size = [c.age && `${c.age}歳`, c.height && `${c.height}cm`, c.cup && `${c.cup}カップ`, c.type]
      .filter(Boolean).join('/');
    return `・${c.name}（${size}）${c.today ? `本日出勤 ${hoursOf(c) || '時間未定'}` : '本日お休み'}`;
  }).join('\n');
}
