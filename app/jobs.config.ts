/* ═══════════════════════════════════════════════════════════
   手動実行できる仕事の一覧（ベンリーの「コンテンツ一覧」に相当）
   ───────────────────────────────────────────────────────────
   ここに載せたものが /status ページに「今すぐ実行」ボタンとして並ぶ。

   仕組み：ページで押す → /api/jobs にキューが1件積まれる
          → 店のPCで動く scraper/runner.js が拾って実際のbotを実行
          → 結果をここに書き戻して画面に出る

   ★ script は scraper/ 配下のファイル名。runner.js 側のホワイトリストと
     一致していないと実行されない（安全のため二重管理）。
═══════════════════════════════════════════════════════════ */

export type JobKind = 'attend' | 'boost' | 'post' | 'cast';

/* ═══ 媒体キーの正 ═══════════════════════════════════════════
   scraper/ 各スクリプトの --site= に渡すキー。ここに無いキーは
   /api/jobs が受け取らない（＝鍵なしで押せるページから任意の文字列が
   スクリプトに流れ込むのを防ぐホワイトリスト）。
   ★scraper 側の ADAPTERS のキーと一致していること。 */
export const SITES = [
  { key: 'deki',    label: '駅ちか' },
  { key: 'mensest', label: 'じゃぱん' },
  { key: 'refle',   label: 'リフナビ' },
  { key: 'map',     label: 'MAP' },
  { key: 'rank',    label: 'ランキング' },
  { key: 'estama',  label: 'エス魂' },
  { key: 'eslove',  label: 'エステラブ' },
] as const;

export type SiteKey = (typeof SITES)[number]['key'];

export const SITE_KEYS: string[] = SITES.map((s) => s.key);
export const SITE_LABEL: Record<string, string> =
  Object.fromEntries(SITES.map((s) => [s.key, s.label]));

/** そのジョブが受け取れる引数の宣言。書いていないジョブは引数を一切受け取らない。 */
export type JobParams = {
  /** --only=名前,名前 を受け取る（値は在籍名簿にある名前だけ通す） */
  only?: boolean;
  /** --site=キー,キー を受け取る。ここに書いたキーだけが選択肢になる。
      ★スクリプトが実際に対応している媒体だけ書くこと。対応していない
        キーを渡すと黙って何もしない＝「押したのに入らない」になる。 */
  sites?: SiteKey[];
};

export type JobDef = {
  id: string;
  name: string;      // 画面に出す名前
  desc: string;      // 何が起きるかの一言説明（中村さんが読む）
  kind: JobKind;
  script: string;    // scraper/ 配下のスクリプト（runner.js のホワイトリストと一致必須）
  /** 連打防止のクールダウン（秒）。回数を消費するものは長めにする。 */
  cooldownSec: number;
  /** スクリプトに渡す引数。runner.js 側で --site= / --only= の形だけ通す。 */
  args?: string[];
  /** 書き込む系は true。runner.js が CONFIRM=1 を付ける（無い＝DRYで安全に空振り） */
  confirm?: boolean;
  /** 取り消せない操作。画面で名前を打たせてから実行する。 */
  danger?: boolean;
  /** 「この子だけ・この媒体だけ」を画面から受け取れるようにする宣言。
      ★宣言が無いジョブは引数を無視する＝ボタンに勝手な引数を足せない。 */
  params?: JobParams;
  /** 画面のいちばん上に出す（＝ふだん押すのはこれだけ）。
      ★2026-08-09：ボタンが17個並んで「どれを押せばいいか分からない」状態だったので、
        よく使う3つだけ出して残りは「詳しい操作」に畳んだ。消してはいない。
        どれを表に出すかはここを付け替えるだけで変えられる。 */
  primary?: boolean;
  /** 1回の実行に許す時間（秒）。省略＝DEFAULT_TIMEOUT_SEC。
      ★媒体ごとにブラウザを開き直すジョブは実時間が長い。ここを短くすると
        「動いているのに時間切れで打ち切られる」＝直っていないように見える。 */
  timeoutSec?: number;
};

/** timeoutSec を書いていないジョブの既定値（8分） */
export const DEFAULT_TIMEOUT_SEC = 8 * 60;

/** そのジョブに許す秒数 */
export const timeoutSecOf = (j?: JobDef) => j?.timeoutSec ?? DEFAULT_TIMEOUT_SEC;

export const JOBS: JobDef[] = [
  // ── 出勤まわり（回数を消費しない＝気軽に押せる）────────────
  {
    id: 'attend_all',
    name: '出勤を今すぐ反映',
    desc: 'HPの出勤表を読み込んで、掲載7媒体すべてに出勤を反映します（上げ・下げ両方）',
    kind: 'attend',
    script: 'run_attend_all.js',
    cooldownSec: 120,
    primary: true,
  },
  {
    id: 'attend_fetch',
    name: 'HPの出勤を取り込むだけ',
    desc: 'HPの出勤表を読み込んでシステムに反映します（媒体にはまだ送りません）',
    kind: 'attend',
    script: 'hp_attendance.js',
    cooldownSec: 60,
  },

  // ── 上位化（残り回数を消費する＝押しすぎ注意）──────────────
  {
    id: 'deki_joui',
    name: '駅ちか 上位表示',
    desc: '駅ちかの掲載順を1つ上げます。1日の残り回数を1回消費します',
    kind: 'boost',
    script: 'deki_joui.js',
    cooldownSec: 300,
  },
  {
    id: 'deki_sokuhime',
    name: '駅ちか 即ヒメ枠',
    desc: '駅ちかの「即ヒメ」枠を、いま出勤中の子で埋めます',
    kind: 'boost',
    script: 'deki_sokuhime.js',
    cooldownSec: 300,
  },
  {
    id: 'map_wait',
    name: 'メンエスMAP 待機更新',
    desc: 'メンエスMAPの待機状況を更新して掲載順を上げます。残り回数を1回消費します',
    kind: 'boost',
    script: 'map_wait.js',
    cooldownSec: 300,
  },
  {
    id: 'cocoa_boost',
    name: '求人ココア 上位表示',
    desc: '求人ココアの掲載順を上げます',
    kind: 'boost',
    script: 'cocoa_boost.js',
    cooldownSec: 300,
  },

  // ── 投稿（公開される文章が出る＝いちばん慎重に）──────────────
  {
    id: 'deki_news',
    name: '駅ちか ニュース投稿',
    desc: '駅ちかのニュース欄に、設定済みの文章を1本投稿します',
    kind: 'post',
    script: 'deki_boost.js',
    cooldownSec: 600,
  },
  {
    id: 'eslove_boost',
    name: 'エステラブ 新着・求人',
    desc: 'エステラブの新着情報／求人の文面を差し替えて上位に押し上げます',
    kind: 'post',
    script: 'eslove_boost.js',
    cooldownSec: 600,
  },
  {
    id: 'rank_news',
    name: '全国ランキング ニュース投稿',
    desc: '全国メンズエステランキングのニュースを1本投稿します',
    kind: 'post',
    script: 'rank_news.js',
    cooldownSec: 600,
  },

  // ── キャスト（新人・卒業）──────────────────────────
  {
    id: 'cast_roster',
    name: '登録状況を確認',
    desc: '在籍キャストが7媒体それぞれに載っているかを見て、抜けがあれば教えます（見るだけ・何も変えません）',
    kind: 'cast',
    script: 'cast_roster.js',
    cooldownSec: 60,
  },
  {
    id: 'cast_sync',
    name: '新人をサイトに登録',
    /* ★2026-08-06：エステラブもこのボタンに含めた（cast_sync_all の③）。
       常駐が自動で入れてはいたが、押した人からは入ったか分からず、
       2つのボタンを押し分ける必要があった。残る手動は駅ちかだけ。 */
    /* ★2026-08-09：プロフ反映まで含めた（登録→写真→エステラブ→プロフ）。
       それまでは「これを押す→終わるまで待つ→プロフを各媒体に配るを押す」と
       2回押す必要があり、中村さんから面倒だと指摘があった。
       ★プロフは今回登録できた新人だけに絞る（全員だと25分かかるため）。 */
    desc: 'キャスト一覧にいて媒体に載っていない子を、じゃぱん・リフナビ・MAP・ランキング・エス魂・エステラブに登録し、写真とプロフまで入れます（駅ちかだけ手動）',
    kind: 'cast',
    script: 'cast_sync_all.js',
    cooldownSec: 300,
    confirm: true,
    primary: true,
    /* ★登録5媒体＋写真4媒体＝ブラウザを9回開き直すので実時間が長い。
       2026-08-04 に8分で打ち切られ、登録は全部通ったのにMAPとエス魂の写真だけ
       入らなかった（1名でこれ）。人数ぶん伸びるので余裕を持たせる。
       ★2026-08-09：プロフ工程を足したぶん 25→35分。実測の内訳＝写真だけで
         26名×4媒体が440秒。プロフは新人だけに絞ってあるので数分。 */
    timeoutSec: 35 * 60,
  },
  {
    /* ★2026-08-06 追加。写真だけを入れ直したいとき用。
       「新人をサイトに登録」でも写真は入るが、あれは登録から全部やるので長い。
       cast_photo.js は写真がある子を飛ばすので、何度押しても二重にならない。 */
    id: 'cast_photo',
    name: '写真を入れる',
    desc: '登録済みの子で写真が抜けているところに、HPの写真を入れます（じゃぱん・ランキング・エス魂・MAP／すでに入っている子は触りません）',
    kind: 'cast',
    script: 'cast_photo_all.js',
    cooldownSec: 300,
    confirm: true,
    timeoutSec: 20 * 60, // 4媒体ぶんブラウザを開き直す。人数ぶん伸びる
  },
  {
    /* ★2026-08-06 追加。駅ちかを「正」として本人情報をそろえる。
       中村さんが駅ちかに貼った紹介文を、他媒体へ配るのがこのボタン。
       ★エステラブは含めていない。あちらは「密着」「下着」が伏せ字になっており
         （25名中12名が該当）、駅ちかで上書きすると規約違反になりかねない。
         中村さんに意図を確認できるまで外してある。 */
    id: 'cast_profile',
    name: 'プロフを各媒体に配る',
    desc: '駅ちかの紹介文・趣味・得意な施術を、じゃぱん・リフナビ・MAP・ランキング・エス魂に反映します（駅ちかが空の項目は触りません／エステラブは対象外）',
    kind: 'cast',
    script: 'cast_profile_push.js',
    cooldownSec: 300,
    confirm: true,
    primary: true,
    timeoutSec: 25 * 60, // 5媒体 × 人数ぶん編集画面を開く
    /* ★2026-08-09：「1人だけ直したい」のに26名×5媒体が毎回走るのをやめるため、
       画面から子と媒体を選べるようにした。エステラブと駅ちかはこのスクリプトに
       アダプタが無いので選択肢に出さない（cast_profile_push.js の ADAPTERS が正）。 */
    params: { only: true, sites: ['mensest', 'refle', 'map', 'rank', 'estama'] },
  },
  {
    /* エステラブは1アカウント1ログイン制で「新人をサイトに登録」からは触れない。
       ふだんは常駐(eslove_session)が2分おきに自動で入れるが、
       「今すぐ入れたい・入ったか確かめたい」時のための入口。
       中身は 一時停止→常駐の回が終わるのを待つ→登録→必ず再開。 */
    id: 'eslove_cast_add',
    name: 'エステラブに新人を今すぐ登録',
    desc: 'ふだんは自動で入りますが、すぐ入れたいときに押してください。自動更新を一度止めて登録し、終わったら自動で元に戻します（2〜3分かかります）',
    kind: 'cast',
    script: 'eslove_cast_add_now.js',
    cooldownSec: 180,
    confirm: true,
    timeoutSec: 8 * 60, // 常駐の回が終わるのを最大4分待つので長めに
  },
  {
    /* ★2026-08-06 追加。まず「見るだけ」で現状を出す入口。
       この日の実測では7媒体中6つがHPと一致、じゃぱんだけ「ひより」が末尾だった。 */
    id: 'order_check',
    name: '並び順を確認',
    desc: '各媒体のセラピスト一覧の並びが、HPと同じ順になっているかを見ます（見るだけ・何も変えません）',
    kind: 'cast',
    script: 'order_check.js',
    cooldownSec: 60,
  },
  {
    /* ★2026-08-07：エス魂専用ボタンから全媒体まとめに作り替えた。
       「並び順を揃える」と書いてあるのに1媒体しか直さないのは分かりにくいため。
       中身の sort_all.js が、全媒体を見て → ズレていて直す道具がある媒体だけ直し
       → 直せない媒体は理由つきで報告する。ズレが無ければ何もしない。
       ★並べ替えの道具があるのは駅ちかとエス魂だけ。他4媒体は今そろっているので
         作っていない（ズレたら作る）。じゃぱんは媒体側に機能が無く直せない。 */
    id: 'sort_all',
    name: '並び順をHPに揃える',
    desc: '各媒体のセラピスト一覧の並びを、HPと同じ順番に直します（ズレていない媒体は触りません／直す前に今の並びを控えます）',
    kind: 'cast',
    script: 'sort_all.js',
    cooldownSec: 300,
    confirm: true,
    timeoutSec: 15 * 60, // 媒体ごとにブラウザを開き直すので長めに
  },
  {
    /* ★取り消せる操作（非表示）だけを行う。削除はしない。
       danger:true なので「今すぐ実行」一覧には出さず、キャスト管理の各行から実行する。
       ★2026-08-09：画面のボタンは cast_delete（削除）に差し替えた。
         こちらは「非表示にした子を戻す」道具として残してある（--undo が使える）。 */
    id: 'cast_remove',
    name: '卒業（サイトから下げる）',
    desc: 'じゃぱん・リフナビ・MAP・ランキングで非表示にします（消さずに隠すので元に戻せます）。駅ちか・エス魂・エステラブは手動です',
    kind: 'cast',
    script: 'cast_remove.js',
    cooldownSec: 60,
    confirm: true,
    danger: true,
  },
  {
    /* ★★2026-08-09 追加：卒業＝「各媒体から削除」。取り消せない。
       中村さんの運用が「辞めた子は媒体から消す」なので、非表示ではなくこちらを
       キャスト管理の黄色いボタンに割り当てた。駅ちかだけは手作業のまま。
       danger:true ＝「今すぐ実行」一覧には出さない（鍵つきのキャスト管理からのみ）。
       ★歯止めはスクリプト側にもある：1回1人／在籍名簿と完全一致／削除前に控え／
         削除後に一覧を開き直して実値で確認／cast_removed.json に記録して再登録を防ぐ。 */
    id: 'cast_delete',
    name: '卒業（各サイトから削除）',
    desc: 'じゃぱん・リフナビ・MAP・ランキング・エス魂・エステラブから削除します（★取り消せません）。駅ちかは手動です',
    kind: 'cast',
    script: 'cast_delete.js',
    cooldownSec: 60,
    confirm: true,
    danger: true,
    /* ★エステラブは常駐を止めて回が終わるのを待つ（最大4分）＋75秒待つ。
       そのぶん他5媒体より長い。6媒体ぶんブラウザを開き直すので余裕を持たせる。 */
    timeoutSec: 20 * 60,
  },
];

export const JOB_BY_ID = new Map(JOBS.map((j) => [j.id, j]));

export const KIND_LABEL: Record<JobKind, string> = {
  attend: '出勤',
  boost: '上位表示',
  post: '投稿',
  cast: 'キャスト',
};
