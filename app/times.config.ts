/* ═══════════════════════════════════════════════════════════
   投稿時刻表（ベンリーの「コンテンツごとの時刻設定」に相当）の定義
   ───────────────────────────────────────────────────────────
   ここに載せたものが /times ページで編集できるようになる。

   仕組み：/times で編集 → /api/times（Redis）に保存
          → 店のPCの scraper/times_sync.js が1分おきに取りに行き、
            scraper/ 配下の時刻表JSONに書き戻す
          → 各botは今までどおりローカルのJSONを読んで撃つ

   ＝botは1行も変えずに済み、ネットが切れても最後に届いた時刻表で回り続ける。

   ★ file / shape はPC側 times_sync.js のテーブルと一致していないと反映されない
     （安全のため二重管理。片方だけ増やしても事故らない）。
═══════════════════════════════════════════════════════════ */

export type TimesShape =
  /** { times: ["10:01", …] } 形式。文面のローテは無いか、位置で決まる */
  | 'times'
  /** { schedule: [{time, template}, …] } 形式。枠ごとに文面を選ぶ */
  | 'schedule'
  /** { times: [...], assign: [0,1,2,…] } 形式。枠ごとに投稿(posts)を選ぶ */
  | 'times+assign';

export type TimesContent = {
  id: string;
  name: string;        // 画面に出す名前
  desc: string;        // 何が起きるかの一言（中村さんが読む）
  file: string;        // scraper/ 配下のファイル名（PC側と一致必須）
  shape: TimesShape;
  /** 1日の回数リセット時刻（この時刻をまたぐと新しい1日）。表示にだけ使う */
  resetHour: number;
  /** 媒体側の1日の上限回数（分かっているものだけ）。上限を超える件数は保存できない */
  dailyCap?: number;
  /** 枠ごとに選べる文面。shape が times のものは空 */
  choices: { value: string; label: string }[];
  note?: string;
};

/** エステラブのテンプレ名（scraper/venrey_templates.json の TemplateName と完全一致必須） */
const ESLOVE_NEW = [
  'エステラブだけのフリーイベント！！',
  '【エステラブ限定割】追加なしでキワ◎MB施術大満足確定♪',
  '指名してこの価格！？マジお得です！！！',
];
const ESLOVE_WORK = [
  '《求人①》【驚異の還元率×爆速集客】本日も満員御礼！入店即、最高額バックをお約束♪',
  '《求人②》【エリア最高水準】1日8万超えも通過点。貴女の価値を「最高の報酬」で形にします',
  '《求人③》【即日体験OK】毎回笑顔で帰れる/嘘偽りなしの「高額バック」を♪',
];
/** 求人ココアの投稿（scraper/cocoa_blog_config.json の posts の並び順＝この index） */
const COCOA_POSTS = [
  '18:00～ラストの間で自由にご出勤していただけます。',
  '日給8万円～',
  'オープニングセラピスト大募集☆彡',
];

const asChoices = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));

export const TIMES_CONTENTS: TimesContent[] = [
  {
    id: 'deki_joui',
    name: '駅ちか 上位表示',
    desc: '設定した時刻に、駅ちかの掲載順を1つ上げます',
    file: 'venrey_deki_joui_times.json',
    shape: 'times',
    resetHour: 0,
    dailyCap: 40,
    choices: [],
    note: '文章は出ません（順位を上げるだけ）',
  },
  {
    id: 'eslove_shinchaku',
    name: 'エステラブ 新着情報',
    desc: '設定した時刻に、新着情報を選んだ文面に差し替えて上位に押し上げます',
    file: 'venrey_eslove_shinchaku_times.json',
    shape: 'schedule',
    resetHour: 0,
    dailyCap: 10,
    choices: asChoices(ESLOVE_NEW),
  },
  {
    id: 'eslove_work',
    name: 'エステラブ 求人（最新投稿）',
    desc: '設定した時刻に、求人の投稿を選んだ文面に差し替えて上位に押し上げます',
    file: 'venrey_eslove_work_times.json',
    shape: 'schedule',
    resetHour: 0,
    dailyCap: 10,
    choices: asChoices(ESLOVE_WORK),
  },
  {
    id: 'cocoa_blog',
    name: '求人ココア 店長ブログ',
    desc: '設定した時刻に、選んだ内容で店長ブログを1本投稿します（写真も内容ごとに変わります）',
    file: 'cocoa_blog_config.json',
    shape: 'times+assign',
    resetHour: 5,
    dailyCap: 15,
    choices: COCOA_POSTS.map((label, i) => ({ value: String(i), label })),
    note: '投稿と編集を合わせて1日15回まで。上限に近いときは回数切れで最後の枠が飛びます',
  },
  {
    id: 'rank_news',
    name: '全国ランキング ニュース',
    desc: '設定した時刻に、全国メンズエステランキングのニュースを1本投稿します',
    file: 'rank_news_config.json',
    shape: 'times',
    resetHour: 6,
    dailyCap: 5,
    choices: [],
    note: '文面は1種類だけです',
  },
  {
    id: 'map_news',
    name: 'メンエスMAP お知らせ',
    desc: '設定した時刻に、いちばん新しいお知らせを複製して投稿し直します（＝上に戻します）',
    file: 'map_news_config.json',
    shape: 'times',
    resetHour: 6,
    dailyCap: 3,
    choices: [],
    note: '文章はMAPの管理画面のお知らせをそのまま使います（ここでは変えられません）',
  },
];

export const TIMES_BY_ID = new Map(TIMES_CONTENTS.map((c) => [c.id, c]));

/** 保存できる枠数の上限（cap未設定のものの保険） */
export const MAX_SLOTS = 60;
