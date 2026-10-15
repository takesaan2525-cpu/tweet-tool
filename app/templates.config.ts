/* ═══════════════════════════════════════════════════════════
   画面から直せる投稿文面の定義（2026-10-13 新規／同日 全国ランキングを追加）
   ───────────────────────────────────────────────────────────
   ここに載せた文面だけが /times ページで編集できるようになる。

   仕組み：/times で編集 → /api/templates（Supabase）に保存
          → 店のPCの scraper/templates_sync.js が1分おきに取りに行き、
            scraper/ 配下の該当JSONを書き換える
          → 各botは今までどおりローカルのJSONを読んで投稿する

   ＝botは1行も変えずに済み、ネットが切れても最後に届いた文面で回り続ける。
     時刻表（times.config.ts）とまったく同じ考え方。

   ★ key は「保存の宛名」。**絶対に変えない**。
     変えると、保存済みの文面と結びつかなくなって迷子になる。
     エステラブは key＝TemplateName（scraper/venrey_templates.json の照合キー）に
     そろえてあるので、名前を1文字でも変えたら配られなくなる。
   ★ file / shape はPC側 templates_sync.js と一致していないと反映されない
     （安全のため二重管理。片方だけ増やしても無視されるだけ）。
═══════════════════════════════════════════════════════════ */

/** 文面がどんな形でローカルJSONに入っているか
 *  - 'venrey' … venrey_templates.json の配列。TemplateName で1件を探し、Title と本文(TEXTAREA)を直す
 *  - 'single' … 設定JSONが投稿を1つだけ持つ（{ post: { title, content } }）。それを直す
 *  - 'list'   … 設定JSONが投稿を複数持ち、順番に使う（site_contents.json の deki.items[]）。
 *               宛名は**並び順**で決める（title を宛名にすると、直した瞬間に迷子になる）
 */
export type TemplateShape = 'venrey' | 'single' | 'list';

export type TemplateDef = {
  /** 保存の宛名。変えない */
  key: string;
  titleMax: number;
  bodyMax: number;
  shape: TemplateShape;
  /** scraper/ 配下のファイル名 */
  file: string;
  /** 本文が空でもよいか（駅ちかのニュースは「タイトルだけ」が正しい姿） */
  bodyOptional?: boolean;
};

export type TemplateSet = {
  id: string;          // 対応する times.config.ts のコンテンツID（画面で並べる位置）
  name: string;        // 画面に出す名前
  desc: string;        // 何が起きるかの一言（中村さんが読む）
  titleMax: number;
  bodyMax: number;
  shape: TemplateShape;
  file: string;
  /** 本文が空でもよいか */
  bodyOptional?: boolean;
  /** 写真についての案内（媒体の画面に書いてある推奨サイズなど） */
  photoHint?: string;
  /** { key, label } の並び。label は画面に出す見出し */
  templates: { key: string; label: string }[];
};

/* ★上限はエステラブの新着情報編集画面の実物から取っている（2026-10-13 確認）：
     タイトル「28 / 40文字」／内容「288 / 500文字」
   ★写真も同じ画面にあるが、差し替えは既に /photos ページで動いているのでそちらに任せる。 */
export const TEMPLATE_SETS: TemplateSet[] = [
  {
    id: 'eslove_shinchaku',
    name: 'エステラブ 新着情報の文面',
    desc: '新着情報に出るタイトルと本文です。直すと次の投稿から反映されます',
    titleMax: 40,
    bodyMax: 500,
    shape: 'venrey',
    file: 'venrey_templates.json',
    photoHint: '写真はjpgのみ・横420×縦315（4:3の横長）が推奨です',
    templates: [
      'エステラブだけのフリーイベント！！',
      '【エステラブ限定割】追加なしでキワ◎MB施術大満足確定♪',
      '指名してこの価格！？マジお得です！！！',
    ].map((n) => ({ key: n, label: n })),
  },
  {
    id: 'eslove_work',
    name: 'エステラブ 求人の文面',
    desc: '求人の最新投稿に出るタイトルと本文です',
    titleMax: 40,
    bodyMax: 500,
    shape: 'venrey',
    file: 'venrey_templates.json',
    photoHint: '写真はjpgのみ・横420×縦315（4:3の横長）が推奨です',
    templates: [
      '《求人①》【驚異の還元率×爆速集客】本日も満員御礼！入店即、最高額バックをお約束♪',
      '《求人②》【エリア最高水準】1日8万超えも通過点。貴女の価値を「最高の報酬」で形にします',
      '《求人③》【即日体験OK】毎回笑顔で帰れる/嘘偽りなしの「高額バック」を♪',
    ].map((n) => ({ key: n, label: n })),
  },
  /* ★2026-10-13 追加（中村さんの要望「全国ランキングもお願いします」）。
     エステラブと違い、**文面は1つだけ**で rank_news_config.json の post に入っている。
     key は中身と関係ない固定の宛名にする（タイトルを直しても迷子にならないように）。
     ★上限は媒体の画面で未確認。エステラブに合わせて仮置きしている。
       実物を見て違っていたらここを直すこと（長すぎて弾かれるのを防ぐ側の数字なので、
       短めに置いておくほうが安全）。 */
  {
    id: 'rank_news',
    name: '全国ランキング ニュースの文面',
    desc: 'ニュース投稿に出るタイトルと本文です。文面は1つだけです',
    titleMax: 40,
    bodyMax: 500,
    shape: 'single',
    file: 'rank_news_config.json',
    templates: [{ key: 'rank_news:post', label: 'ニュース投稿の文面' }],
  },
  /* ★2026-10-14 追加（中村さんの要望「駅チカのニュースの変更もできるように」）。
     駅ちかは文面が3つあり、投稿のたびに順番に使われる（site_contents.json の deki.items）。
     ★本文は3つとも**空が正しい姿**（媒体の設定が「タイトルのみ」）。
       なので bodyOptional。ここを必須にすると、まったく保存できなくなる。
     ★カテゴリ（速報NEWS／激アツ割引情報／イベント速報）は**編集させない**。
       投稿先がどこになるかを決める値で、打ち間違えると別の欄に出てしまう。
       見出しに添えて「どれがどのカテゴリか」だけ分かるようにしてある。
     ★宛名は並び順。タイトルを直しても迷子にならない。 */
  {
    id: 'deki_news',
    name: '駅ちか ニュースの文面',
    desc: '駅ちかのお知らせに出る文面です。3つを順番に使います',
    titleMax: 40,
    bodyMax: 500,
    shape: 'list',
    file: 'site_contents.json',
    bodyOptional: true,
    templates: [
      { key: 'site_contents:deki:0', label: '1つ目（速報NEWS）' },
      { key: 'site_contents:deki:1', label: '2つ目（激アツ割引情報）' },
      { key: 'site_contents:deki:2', label: '3つ目（イベント速報）' },
    ],
  },
];

/** key → 定義。/api/templates の検査に使う */
export const TEMPLATE_BY_NAME: Map<string, TemplateDef> = new Map(
  TEMPLATE_SETS.flatMap((s) =>
    s.templates.map((t) => [t.key, {
      key: t.key, titleMax: s.titleMax, bodyMax: s.bodyMax,
      shape: s.shape, file: s.file, bodyOptional: s.bodyOptional,
    }] as const),
  ),
);

/** その時刻表コンテンツに紐づく文面セット（/times の画面で並べるため） */
export const TEMPLATE_SET_BY_TIMES_ID: Map<string, TemplateSet> =
  new Map(TEMPLATE_SETS.map((s) => [s.id, s]));
