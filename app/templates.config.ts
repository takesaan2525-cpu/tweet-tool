/* ═══════════════════════════════════════════════════════════
   画面から直せる投稿文面の定義（2026-10-13 新規）
   ───────────────────────────────────────────────────────────
   ここに載せた文面だけが /times ページで編集できるようになる。

   仕組み：/times で編集 → /api/templates（Supabase）に保存
          → 店のPCの scraper/times_sync.js が1分おきに取りに行き、
            scraper/venrey_templates.json の該当テンプレを書き換える
          → 各botは今までどおりローカルのJSONを読んで投稿する

   ＝botは1行も変えずに済み、ネットが切れても最後に届いた文面で回り続ける。
     時刻表（times.config.ts）とまったく同じ考え方。

   ★ templates は scraper/venrey_templates.json の TemplateName と
     **完全一致**していること。名前が照合キーなので、1文字違うと配られない。
     （過去に文字化けで「の」が1文字変わり、投稿が飛んだ事故がある）
   ★ ここの並びは times.config.ts の ESLOVE_NEW / ESLOVE_WORK と同じものを指す。
     片方だけ増やしても無視されるだけで事故にはならない（安全のため二重管理）。
═══════════════════════════════════════════════════════════ */

export type TemplateDef = {
  /** テンプレ名＝照合キー。編集させない */
  name: string;
  /** タイトルの上限文字数（媒体の画面に出ている数字） */
  titleMax: number;
  /** 本文の上限文字数（同上） */
  bodyMax: number;
};

export type TemplateSet = {
  id: string;
  name: string;        // 画面に出す名前
  desc: string;        // 何が起きるかの一言（中村さんが読む）
  titleMax: number;
  bodyMax: number;
  /** 写真についての案内（媒体の画面に書いてある推奨サイズなど） */
  photoHint?: string;
  templates: string[];
};

/* ★上限はエステラブの新着情報編集画面の実物から取っている（2026-10-13 確認）：
     タイトル「28 / 40文字」／内容「288 / 500文字」
   ★写真も同じ画面にある（jpgのみ・横420px×縦315px推奨）が、
     写真の差し替えは既に /photos ページで動いているのでそちらに任せる。 */
export const TEMPLATE_SETS: TemplateSet[] = [
  {
    id: 'eslove_shinchaku',
    name: 'エステラブ 新着情報の文面',
    desc: '新着情報に出るタイトルと本文です。直すと次の投稿から反映されます',
    titleMax: 40,
    bodyMax: 500,
    photoHint: '写真はjpgのみ・横420×縦315（4:3の横長）が推奨です',
    templates: [
      'エステラブだけのフリーイベント！！',
      '【エステラブ限定割】追加なしでキワ◎MB施術大満足確定♪',
      '指名してこの価格！？マジお得です！！！',
    ],
  },
  {
    id: 'eslove_work',
    name: 'エステラブ 求人の文面',
    desc: '求人の最新投稿に出るタイトルと本文です',
    titleMax: 40,
    bodyMax: 500,
    photoHint: '写真はjpgのみ・横420×縦315（4:3の横長）が推奨です',
    templates: [
      '《求人①》【驚異の還元率×爆速集客】本日も満員御礼！入店即、最高額バックをお約束♪',
      '《求人②》【エリア最高水準】1日8万超えも通過点。貴女の価値を「最高の報酬」で形にします',
      '《求人③》【即日体験OK】毎回笑顔で帰れる/嘘偽りなしの「高額バック」を♪',
    ],
  },
];

/** 名前 → 上限。/api/templates の検査に使う */
export const TEMPLATE_BY_NAME: Map<string, TemplateDef> = new Map(
  TEMPLATE_SETS.flatMap((s) =>
    s.templates.map((name) => [name, { name, titleMax: s.titleMax, bodyMax: s.bodyMax }] as const),
  ),
);

/** その時刻表コンテンツに紐づく文面セット（/times の画面で並べるため） */
export const TEMPLATE_SET_BY_TIMES_ID: Map<string, TemplateSet> =
  new Map(TEMPLATE_SETS.map((s) => [s.id, s]));
