/* ═══════════════════════════════════════════════════════════
   店舗設定マスタ（1店舗ぶんの固有値を全部ここに集約）
   ───────────────────────────────────────────────────────────
   2店舗目を作るときは、原則このファイルの値を書き換えるだけでOK。
   （＋ Vercelの環境変数 STORE_TEL / STORE_NAME / RESERVE_URL / LINE_* 等）

   ★ここに入れないもの（意図的に除外）
   - 秘密情報（ADMIN_KEY / IMPORT_SECRET / LINE_* / CRON_SECRET / KV_*）→ 環境変数のまま
   - キャスト名簿・写真（growup_casts / zero-esthe.com 写真）→ Redis・取込由来
   - 出勤同期元 → scraper/hp_attendance.js が店の公式HP(zero-esthe.com/schedule)を読む
     ＝scraper側の設定。2店舗目はそのHPのURLを差し替える。
═══════════════════════════════════════════════════════════ */

// ── 店舗の基本情報 ─────────────────────────────
export const SHOP = {
  name: 'Zero（梅田）',          // 表示・SMS・通知の店名
  nameLong: 'Zero（大阪・梅田）', // AI接客プロンプト用の正式名
  tel: '07017404019',            // 予約が埋まった時・問い合わせ誘導先（env STORE_TEL で上書き可）
  hours: '13:00〜翌5:00',         // 営業時間
  area: '大阪・梅田エリア',        // エリア案内
  reserveUrl: 'https://zero-umeda.vercel.app/reserve', // env RESERVE_URL で上書き可
};

// ── コース料金（種別 → 時間ごとの料金）公式HP system 準拠 ──
export const COURSE_MENU: { type: string; prices: Record<number, number> }[] = [
  { type: '通常', prices: { 75: 12000, 90: 15000, 120: 20000, 150: 25000, 180: 30000 } },
  { type: 'Zero', prices: { 75: 17000, 90: 20000, 120: 25000, 150: 30000, 180: 35000 } },
  { type: '極',   prices: { 75: 25000, 90: 28000, 120: 33000 } },
];

export const courseLabel = (type: string, min: number, price: number) =>
  `${type} ${min}分 ${price.toLocaleString('ja-JP')}円`;

// フラットな文字列一覧（LINE AI接客などで使用）
export const COURSES = COURSE_MENU.flatMap((c) =>
  Object.entries(c.prices).map(([m, p]) => courseLabel(c.type, Number(m), p))
);

// ── 指名料（客タイプで変わる。zero-esthe.com/system 準拠）──
export const FEES = {
  nomination: 1000,        // 指名料（新規）
  repeatNomination: 2000,  // 本指名料（リピーター）
};

// ── 予約ルール ─────────────────────────────
// 予約の後ろに付ける移動・準備インターバル（分）。コース分＋これだけ埋まり扱い。
export const INTERVAL_MIN = 20;

// ── 給与計算（この店固有の金額表。2店舗目は必ず見直す）──
export const PAYROLL = {
  // 基本給与：コース(分) × 客タイプ
  rate: {
    '75':  { 'フリー': 5000,  '指名': 6000,  'リピーター': 7000 },
    '90':  { 'フリー': 8000,  '指名': 9000,  'リピーター': 10000 },
    '120': { 'フリー': 11000, '指名': 12000, 'リピーター': 13000 },
    '150': { 'フリー': 14000, '指名': 15000, 'リピーター': 16000 },
    '180': { 'フリー': 17000, '指名': 18000, 'リピーター': 19000 },
  } as Record<string, Record<string, number>>,
  extFee: 5000,            // 延長30分（一律）
  up: { 'なし': 0, 'ZERO (+5000)': 5000, '極 (+11000)': 11000 } as Record<string, number>,
  event: { '100分ｲﾍﾞﾝﾄ': 6000, '130分ｲﾍﾞﾝﾄ': 10000 } as Record<string, number>,
  courseKeys: ['75', '90', '120', '150', '180'],
  eventKeys: ['100分ｲﾍﾞﾝﾄ', '130分ｲﾍﾞﾝﾄ'],
  typeKeys: ['フリー', '指名', 'リピーター'],
  upKeys: ['なし', 'ZERO (+5000)', '極 (+11000)'],
  // 手動予約登録で選べるコース（実料金表に合わせて 75/90/120/150/180）
  manualCourses: ['75分', '90分', '120分', '150分', '180分'],
};

// ── 掲載サイト（ready:false は自動更新の実体がまだ無い＝準備中）──
/* soloLogin＝1アカウントで同時に1人しかログインできないサイト。
   人が管理画面を触る前にボットを止めないと取り合いになるので、
   ダッシュボードに「自分で操作する（○分止める）」ボタンを出す。 */
export const SITES_DEFAULT: { id: string; name: string; auto: boolean; last: string; ready: boolean; soloLogin?: boolean }[] = [
  { id: 'eslove', name: 'エステラブ', auto: true, last: '—', ready: true, soloLogin: true },
  { id: 'cocoa', name: '求人ココア（上位表示・店長ブログ）', auto: true, last: '—', ready: true },
  { id: 'deki', name: '駅ちか', auto: true, last: '—', ready: true },
  { id: 'refle', name: 'リフナビ（出勤同期）', auto: true, last: '—', ready: true },
  { id: 'mesmap', name: 'メンエスマップ', auto: true, last: '—', ready: true },
  { id: 'mensest', name: 'メンエスじゃぱん（出勤同期）', auto: true, last: '—', ready: true },
  { id: 'estama_realtime', name: 'エス魂（10分自動投稿）', auto: true, last: '—', ready: true },
  // ※全国メンズエステランキング(esthe-ranking.jp)は順位がアクセス集計型で
  //   bot投稿では上げられないため、自動更新の対象に含めない。
];
