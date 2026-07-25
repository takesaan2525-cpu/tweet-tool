'use client';

import { useState, useMemo, useEffect, useRef } from 'react';

/* ────────────────────────────────────────────────────────────
   DM・投稿テンプレート
──────────────────────────────────────────────────────────── */
type VarDef = { key: string; label: string; placeholder: string };
type Template = {
  id: number;
  category: string;
  emoji: string;
  title: string;
  type?: 'tweet' | 'dm';
  vars: VarDef[];
  build: (v: Record<string, string>) => string;
};

const TEMPLATES: Template[] = [
  {
    id: 33, category: 'ツール営業', emoji: '🌟', title: 'メンエス向け（実績・差別化版）★新', type: 'dm',
    vars: [],
    build: () => `はじめまして、GrowUPの小林と申します。\n\nメンエス店舗向けの業務システムを作っていて、御店に合わせてゼロから組めます。\n\n■ できること\n・掲載サイトを毎日自動で上位化\n　（エステラブ/ココア/駅ちか/エス魂/MAP など、他の掲載サイトも対応可）\n・お客様用ネット予約／キャストへLINE自動通知／確認SMS\n・キャスト・出勤管理\n・キャスト給与の専用計算機（コース・指名・延長を選ぶだけで自動集計）\n\n■ 料金\n掲載更新だけの他社ツール＝月額2〜3万\nGrowUP＝予約〜管理まで全部入りで買い切り3〜4万・月額0円\n\n実際に触れるデモを用意しています👇\nhttps://growup-tool.vercel.app/demo\n\nよければ「御店ならこう使えます」という簡単なご提案だけ、無料でお送りします。ご検討よろしくお願いします。\n\n——\nGrowUP サポート　小林\nhttps://growup-support.netlify.app`,
  },
  {
    id: 16, category: 'ツール営業', emoji: '🔵', title: 'メンエス向け（短文版）', type: 'dm',
    vars: [],
    build: () => `はじめまして、突然のご連絡失礼いたします。\nGrowUP サポートの小林と申します。\n\n自分もメンエスの事務経験があり、彼女もキャバ嬢をしているので、業界の大変さは近くで感じています。\n\n大阪のメンエス店舗に実際に導入して稼働しているシステムがあり、同じものを御店にも合わせて作れます。\n\n【できること】\n・エステラブ／ココア／駅ちか／エス魂／メンエスMAP の掲載を毎日自動で上位化\n・お客様が空き時間を選べる専用ネット予約\n・予約が入るとキャストへLINE自動通知＋お客様へ確認SMS\n・キャスト管理・出勤・給与計算まで一画面で\n\n掲載更新の専門ツール（他社）は月額2〜3万円ですが、\nうちは予約〜管理まで全部入りで【買い切り3〜4万・月額0円】です。\n\n実際に触って体験できるページ👇\nhttps://growup-tool.vercel.app/demo\n\n「こんなの欲しい」もゼロから対応できます。\nよければ、簡単なご提案だけ無料でお送りしてもよいですか？\n\n——\nGrowUP サポート　小林\nhttps://growup-support.netlify.app`,
  },
  {
    id: 15, category: 'ツール営業', emoji: '🔵', title: 'メンエス向け（詳細版）', type: 'dm',
    vars: [],
    build: () => `はじめまして、突然のご連絡失礼いたします。\nWeb制作・業務ツール制作をしているGrowUP サポートの小林と申します。\n\n自分自身もメンエスの事務やホストのキャッチをやっていたことがあり、彼女もキャバ嬢をしているので、夜職の現場の大変さは肌感覚でわかっているつもりです。\n\nメンズエステの店舗様向けにご連絡しました。\nこんなことでお困りではないですか？\n\n・掲載サイトの更新を毎日手作業でやっている\n・深夜のLINE問い合わせ対応が続いている\n・料金・コース・予約方法を毎回説明している\n・ダブルブッキングが不安\n\nGrowUPでは、大阪のメンエス店舗に実際に導入して稼働中のシステムを、御店に合わせてゼロから作れます。\n\n【主な機能】\n✅ 掲載サイトの自動上位化\n　（エステラブ／ココア／駅ちか／エス魂／メンエスMAP を毎日自動更新）\n✅ お客様が空き時間を選べる専用ネット予約\n✅ 予約確定でキャストへLINE自動通知＋お客様へ確認SMS\n✅ キャスト管理・出勤・給与計算まで一画面で\n\n掲載更新だけの専門ツール（他社）は月額2〜3万円ですが、\nGrowUPは予約〜管理まで全部入りで【買い切り3〜4万・月額0円】。\n掲載サイトはこまめに更新する店舗ほど上位に出るので、その作業を自動化して上位をキープできます。\n\n実際に触れるデモページ👇\nhttps://growup-tool.vercel.app/demo\n\n店舗の状況に合わせてゼロから作るので、既製品では難しいことも対応可能です。\nよければ、簡単なご提案だけ無料でお送りしてもよいですか？\nどうぞよろしくお願いいたします。\n\n——\nGrowUP サポート　小林\nhttps://growup-support.netlify.app`,
  },
  {
    id: 21, category: 'ツール営業', emoji: '💚', title: '予備用（長文版）', type: 'dm',
    vars: [],
    build: () => `はじめまして、突然のご連絡失礼いたします。\nGrowUP サポートの前田大輔と申します。\n\n自分の周りにも夜職・メンエス関係で働いている人がいて、\n予約対応、LINE返信、掲載サイトの更新、キャストさんへの連絡など、\n毎日の細かい作業がかなり大変なのは近くで見て感じています。\n\nそこで現在、メンエス店舗様向けに\n予約管理・LINE通知・掲載更新作業などをまとめて効率化できるツールを作っています。\n\n料金は 30,000〜40,000円の買い切りで、\n月額費用なしで使える形にしているので、他社様よりかなり導入しやすい金額にしています。\n\n例えば、\n\n・お客様が空き時間を選んで予約できる専用予約サイト\n・予約確定時にキャストさんへLINEで自動通知\n・予約一覧、キャスト管理、出勤管理の画面\n・毎日の掲載サイト更新作業の自動化\n・店舗ごとの「こういう機能が欲しい」に合わせたカスタム\n\nこういった仕組みを、お店に合わせて作ることができます。\n\n特にエステラブ等の掲載サイトは、\nこまめに更新している店舗ほど上位に出やすいので、\n毎日10〜30分かかる更新作業を自動化できるだけでも、かなり負担が減ると思います。\n\n実際に触れるデモページも作っています👇\nhttps://growup-tool.vercel.app/demo\n\nまだ大きい会社みたいな綺麗な営業ではないのですが、\nその分、店舗様ごとの悩みに合わせて柔軟に対応できます。\n\nもしよければ、\n「今のお店ならこういう形が合いそうです」くらいの簡単なご提案だけ、無料でお送りしてもよろしいでしょうか？\n\n——\nGrowUP サポート\n前田大輔\nhttps://growup-support.netlify.app`,
  },
  {
    id: 22, category: 'ツール営業', emoji: '💚', title: '予備用（短文版）', type: 'dm',
    vars: [],
    build: () => `はじめまして、突然すみません。\nGrowUP サポートの前田大輔と申します。\n\n自分の周りにも夜職・メンエス関係の人がいて、\n予約対応、LINE返信、掲載サイトの更新、キャストさんへの連絡など、\n毎日の細かい作業が本当に大変なのは近くで見て感じています。\n\n現在、メンエス店舗様向けに\n予約管理・LINE通知・掲載更新などを効率化するツールを作っています。\n\n料金は 30,000〜40,000円の買い切りで、\n月額なしで使える形です。\n\nできることは例えば、\n\n・専用予約サイト\n・予約確定時のキャストLINE自動通知\n・予約一覧、キャスト管理画面\n・掲載サイトの更新作業の自動化\n・店舗に合わせたオリジナル機能の追加\n\nなどです。\n\n実際に触れるデモもあります👇\nhttps://growup-tool.vercel.app/demo\n\nまずは「今のお店ならこういう使い方ができそうです」くらいの簡単な提案だけ無料で送れたらと思っています。\n\nよければ一度、ご提案だけお送りしてもよろしいでしょうか？`,
  },
  {
    id: 24, category: 'ツール営業', emoji: '🚗', title: 'デリヘル店舗向け（短文版）', type: 'dm',
    vars: [],
    build: () => `はじめまして、突然のご連絡失礼いたします。\nGrowUP サポートの小林と申します。\n\n自分自身も夜職の現場に関わっていたことがあり、彼女もキャバ嬢をしているので、業界の忙しさは身近に感じています。\n\nデリヘル店舗様向けに、毎日の掲載更新・予約管理・お客様対応・キャストへの連絡をまるごとシステム化するツールを作っています。\n料金は30,000〜40,000円（買い切り）で、他社より安めにしています。\n\n他社様でも導入が進んでいる\n・予約・指名・本指名のリアルタイム管理\n・受付→キャストへのLINE自動通知（出発時間・場所共有）\n・お客様への自動予約確認＆リマインド（SMS/LINE）\n・複数掲載サイトの更新作業の自動化\nといった仕組みを、店舗に合わせてゼロから作れます。\n\nまたシティヘブン等の掲載サイトは、こまめに更新している店舗ほど上位に表示されやすいので、毎日の更新作業を自動化することでランキング維持にもつながります。\n\nどんなツールか、実際に触って体験できるページを作りました👇\nhttps://growup-tool.vercel.app/demo\n\n「こんなの欲しい」があればゼロから対応できます。\n\nよければ、簡単なご提案だけ無料でお送りしてもよいですか？\n\n——\nGrowUP サポート　小林\nhttps://growup-support.netlify.app`,
  },
  {
    id: 25, category: 'ツール営業', emoji: '🚙', title: 'デリヘル店舗向け（詳細版）', type: 'dm',
    vars: [],
    build: () => `はじめまして、突然のご連絡失礼いたします。\nWeb制作・業務ツール制作をしているGrowUP サポートの小林と申します。\n\n自分自身も夜職の現場に関わっていたことがあり、彼女もキャバ嬢をしているので、現場の大変さはよくわかっているつもりです。\n\nデリヘル・派遣型店舗の方向けにご連絡しました。\n\n以下のようなことでお困りではないですか？\n\n・受付からキャストへの連絡（場所・時間）を毎回電話やLINEでやっている\n・指名・本指名・予約の管理が煩雑\n・深夜のお客様対応に追われている\n・複数の掲載サイト更新を毎日手作業でやっている\n・ダブルブッキングや伝達ミスが不安\n\n他社様でも導入が進んでいる\n・予約・指名のリアルタイム管理画面\n・受付→キャストへのLINE自動通知（出発・場所・時間を共有）\n・お客様への自動予約確認＆前日/当日リマインド\n・複数掲載サイトの更新作業の自動化\n・キャスト給与・指名数の自動集計\nといった仕組みを、GrowUPでは店舗に合わせてゼロから作れます。\n\n✅ 受付・キャスト間の連絡を自動化\n✅ お客様への自動確認で無断キャンセル減\n✅ 掲載更新の自動化でランキング維持\n\n実際に触って体験できるデモページも作っていますので、よければご覧ください👇\nhttps://growup-tool.vercel.app/demo\n\n料金：30,000〜40,000円（買い切り・月額なし）\n他社よりも安めに設定しており、店舗の状況に合わせてゼロから作るので既製品では難しいことも対応可能です。\n\nよければ、簡単なご提案だけ無料でお送りしてもよいですか？\nどうぞよろしくお願いいたします。\n\n——\nGrowUP サポート　小林\nhttps://growup-support.netlify.app`,
  },
  {
    id: 18, category: 'ツール営業', emoji: '🔴', title: '風俗店舗向け（短文版）', type: 'dm',
    vars: [],
    build: () => `はじめまして、突然のご連絡失礼いたします。\nGrowUP サポートの小林と申します。\n\n自分自身もホストのキャッチ経験があり、彼女もキャバ嬢をしているので、夜職の大変さは身近に感じています。\n\n風俗・夜職店舗向けに、毎日の掲載作業・LINE対応・出勤情報の更新などをまるごとシステム化するツールを作っています。\n\n他社様でも導入が進んでいる\n・専用予約サイト（お客様が空き時間を選んで予約）\n・予約確定時のキャストへのLINE自動通知\n・予約一覧・キャスト・シフト管理画面\nといった仕組みを、店舗に合わせてゼロから作れます。\n\nどんなツールか、実際に触って体験できるページを作りました👇\nhttps://growup-tool.vercel.app/demo\n\n「こんな仕組みが欲しい」をゼロから作れるのが強みです。\n\nよければ、簡単なご提案だけ無料でお送りしてもよいですか？\n\n——\nGrowUP サポート　小林\nhttps://growup-support.netlify.app`,
  },
  {
    id: 17, category: 'ツール営業', emoji: '🔴', title: '風俗店舗向け（詳細版）', type: 'dm',
    vars: [],
    build: () => `はじめまして、突然のご連絡失礼いたします。\nWeb制作・業務ツール制作をしているGrowUP サポートの小林と申します。\n\n自分自身もホストのキャッチやメンエスの事務をやっていたことがあり、彼女もキャバ嬢をしているので、夜職の現場の大変さはよくわかっているつもりです。\n\n夜職・風俗店舗の方向けにご連絡しました。\n\n以下のようなことでお困りではないですか？\n\n・新規問い合わせに毎回システム・料金・アクセスを手動で返信している\n・深夜の問い合わせに対応しきれていない\n・毎日の掲載更新・出勤情報の投稿が手間になっている\n・予約・指名の管理が煩雑になっている\n\nGrowUPでは\n\n✅ LINE自動返信（システム・料金・アクセス・予約案内）\n✅ キャスト出勤情報サイト（管理が簡単なもの）\n✅ 予約・問い合わせ管理ツール\n✅ 店舗ホームページ制作\n\nなど、店舗の業務に合わせたツールをゼロから制作しています。\n\n実際に触って体験できるデモページも作っていますので、よければご覧ください👇\nhttps://growup-tool.vercel.app/demo\n\n料金目安：30,000円〜（内容により変動）／月額管理 10,000円〜\n既製品では対応できないことも、ご相談いただければ柔軟に対応します。\n\nよければ、まず無料でヒアリングだけでもさせていただけますか？\nどうぞよろしくお願いいたします。\n\n——\nGrowUP サポート　小林\nhttps://growup-support.netlify.app\nLINE：https://lin.ee/Y4Uq7uP`,
  },
  {
    id: 9, category: 'ツール営業', emoji: '⚙️', title: 'メンエス個人セラピスト向け', type: 'dm',
    vars: [],
    build: () => `はじめまして、突然のご連絡失礼いたします。\nGrowUP サポートの小林と申します。\n\n実は自分自身もメンエスの事務経験があり、彼女もキャバ嬢をしているので、夜職の現場の大変さは身近に感じています。\n\n掲載サイトの更新を毎日手作業でやっていたり、深夜のLINE対応に追われていたりしていませんか？\n\nそういった毎日の作業をまるごと自動化できるツールを、個人セラピストの方向けに作っています。\n\nどんなツールか、実際に触って体験できるページを作りました👇\nhttps://growup-tool.vercel.app/demo\n\n料金は30,000〜40,000円（買い切り）で、できるだけ手を出しやすい価格にしました。\n\nもしよければ、簡単なご提案だけ無料でお送りしてもよいですか？\nお気軽にご返信いただけると嬉しいです。`,
  },
  {
    id: 10, category: 'ツール営業', emoji: '🏪', title: '店舗向け（複数在籍・キャスト管理）', type: 'dm',
    vars: [],
    build: () => `はじめまして、突然のご連絡失礼いたします。\nGrowUP サポートの小林と申します。\n\n自分自身もメンエスの事務やホストのキャッチをやっていた経験があり、夜職の現場がどれだけ忙しいかは実感としてわかっているつもりです。\n\n店舗の運営をされているかと思いますが、こういったことでお困りではないですか？\n\n・掲載サイトの更新を毎日手作業でやっている\n・深夜のLINE問い合わせに対応しきれない\n・ダブルブッキングが不安\n・キャストの出勤・空き状況の管理が煩雑\n\n他社様でも導入が進んでいる\n・専用予約サイト（お客様が空き時間を選んで予約）\n・予約確定時のキャストへのLINE自動通知\n・予約一覧・キャスト・シフト管理画面\nといった仕組みを、店舗に合わせてゼロから作ることができます。\n\nどんなツールか、実際に触って体験できるページを作りました👇\nhttps://growup-tool.vercel.app/demo\n\nまずは無料で簡単なご提案だけお送りしてもよいですか？`,
  },
  {
    id: 11, category: 'ツール営業', emoji: '💆', title: '個人・業務委託セラピスト向け', type: 'dm',
    vars: [],
    build: () => `はじめまして、突然のご連絡失礼いたします。\nGrowUP サポートの小林と申します。\n\n自分自身もメンエスの事務をやっていたことがあり、彼女もキャバ嬢をしているので、個人で働く大変さは身近に感じています。\n\n予約が入るたびに他サイトを手動で更新したり、毎日の掲載作業が地味に時間を取られていたりしていませんか？\n\n予約管理・掲載更新・LINEのリマインドなど、毎日繰り返している作業をまとめて自動化できる仕組みを作っています。\n\n深夜でも自動で対応できるので、返信し忘れや機会損失も減らせます。\n\nどんなツールか、実際に触って体験できるページを作りました👇\nhttps://growup-tool.vercel.app/demo\n\n料金は30,000〜40,000円（買い切り）で、できるだけ始めやすい金額にしています。\n\nもし興味があれば、簡単なご提案だけ無料でお送りしてもよいですか？`,
  },
  {
    id: 12, category: 'ツール営業', emoji: '💬', title: '返信が来た後の説明文', type: 'dm',
    vars: [],
    build: () => `ご返信ありがとうございます！\n\n具体的にはこんなことができます。\n\n① 予約が入ったら掲載サイトの空き更新をワンタップで完了\n② LINEから空き時間の一覧を自動送付 → お客様が選んで予約確定\n③ 前日・当日のリマインドを自動送信\n④ 毎日の掲載作業・更新作業をまるごと自動化\n\n今いちばん手間になっている作業を教えていただければ、そこから優先して解決できます。\n\nよければLINEで少し詳しくお話しできますか？`,
  },
  {
    id: 23, category: 'ツール営業', emoji: '📝', title: 'ヒアリング項目（興味あり返信後）', type: 'dm',
    vars: [],
    build: () => `ご返信ありがとうございます😊\n興味を持っていただけて嬉しいです！\n\nより具体的にご提案したいので、\nよければ何点か教えていただけますか？\n\n①店舗形態\n　→ 店舗型 / 派遣型 / 個人\n\n②在籍キャスト数\n　→ だいたい何名ほどですか？\n\n③今いちばん手間な作業\n　→ 掲載更新 / LINE対応 / 予約管理 /\n　　 給与計算 / キャストへの連絡 など\n\n④今の予約の取り方\n　→ 電話 / LINE / 掲載サイト経由 など\n\n⑤LINE公式アカウントの有無\n　→ お持ちですか？（なくても作れます）\n\n⑥特に「これを自動化したい」という希望\n　→ あれば自由にお書きください！\n\nこの内容に合わせて、最適な形をゼロから\nご提案させていただきます🔥\n\nお時間あるときで大丈夫です😊\n文字が大変でしたら10分ほどお電話でも🙆`,
  },
  {
    id: 26, category: 'ツール営業', emoji: '📞', title: '電話・通話に誘導（ヒアリング回答後）', type: 'dm',
    vars: [],
    build: () => `ありがとうございます！\n内容的に〇〇さんのお店、かなりハマると思います🔥\n\nただ文字だと魅力が3割も伝わらないので、\n画面をお見せしながら10分だけお電話できますか？\n\n今日か明日で、ご都合いい時間ありますか？\n　例：今夜21時 / 明日14時\n\nお話しした方が「あ、こういうことか」と\n一気にイメージ湧くと思います😊`,
  },
  {
    id: 27, category: 'ツール営業', emoji: '🤔', title: '「検討します」への返し（本音を聞く）', type: 'dm',
    vars: [],
    build: () => `ありがとうございます😊\nもし差し支えなければ、今ひっかかってる点って\n「費用」「導入の手間」「効果が出るか」の\nどれが一番大きいですか？\n\nそこをつぶせるかだけ、先にお伝えしておきたくて🙏\n\n無理な営業はしないので、正直なところ教えてもらえると嬉しいです😊`,
  },
  {
    id: 28, category: 'ツール営業', emoji: '🗓️', title: '次回フォローの約束を取る', type: 'dm',
    vars: [],
    build: () => `承知しました🙏\nではいったんご検討ください😊\n\n3日後あたりに一度だけ、ご状況伺ってもいいですか？\nしつこくはしないのでご安心ください🙇\n\nもし途中で「ここだけ聞きたい」が出てきたら、\nいつでも気軽にご連絡くださいね🔥`,
  },
  {
    id: 29, category: 'ツール営業', emoji: '📲', title: '電話誘導＋手間ヒアリング（丁寧版）', type: 'dm',
    vars: [],
    build: () => `ありがとうございます！\n\nできることが色々あるので、先にお店の状況を軽く聞いてから、\n合いそうな使い方だけお伝えできればと思っています。\n\n売り込みというより、\n「今の作業でどこを自動化できるか」を確認するだけなので、\n10分ほどお電話でお話しできれば早いと思います。\n\n本日か明日で、\nご都合よさそうなお時間ありますでしょうか？\n\n難しければ、LINE上で\n① 掲載サイト更新\n② 予約管理\n③ キャストさんへの連絡\n④ SNS投稿\n⑤ 給与計算\nこの中で一番手間なものを教えていただければ、先に文章でご提案します。`,
  },
  {
    id: 30, category: 'ツール営業', emoji: '✍️', title: '「一番手間な作業」を1つ聞く（軽め）', type: 'dm',
    vars: [],
    build: () => `ありがとうございます！\n\nではまず、\n今一番減らしたい作業を1つだけ教えてください。\n\n例だと、\n・毎日の掲載更新\n・予約の確認や空き枠管理\n・キャストさんへの連絡\n・給与計算\n・SNS投稿\nこのあたりです。\n\nそれに合わせて、\n「こういう画面なら作れます」という形で簡単な案を送ります。\n\n必要であれば、そのあと10分だけ通話で説明もできます。`,
  },
  {
    id: 31, category: 'ツール営業', emoji: '☎️', title: '【電話トーク台本】（通話用・読み上げ）', type: 'dm',
    vars: [],
    build: () => `【電話トーク台本】\n\nお世話になります。\nGrowUP サポートの小林です。\n\nお時間いただきありがとうございます。\n今日いきなり売り込みするというより、\n今のお店の作業でどこが一番手間になっているかを聞いて、\n自動化できそうな部分だけ簡単にお伝えできればと思っています。\n\nお時間も長くならないように、10分くらいで大丈夫です。\n\nまず確認なんですが、\n今一番手間になっているのはどれに近いですか？\n\n① 掲載サイトの更新\n② 予約管理・空き枠管理\n③ キャストさんへの連絡\n④ お客様への予約確認\n⑤ 給与計算\n⑥ SNS投稿\n⑦ リピーターへの連絡\n\n──（相手の回答を聞く）──\n\nありがとうございます。\nちなみに今は、その作業って手動でやられてますか？\nそれとも何かツールや管理表を使っていますか？\n\n──\n\nなるほどです。\nそれだと、例えば〇〇の部分は自動化しやすいです。\n具体的には、予約が入ったら自動で一覧に反映して、\nキャストさんにもLINE通知が飛ぶようにしたり、\n掲載更新の作業を毎回手でやらなくても済む形にできます。\n\nお店ごとに運用が違うと思うので、\n最初から大きいシステムを入れるというより、\nまずは一番手間な部分だけ小さく作る形が一番合うと思います。\n\n確認したいのですが、もし作るとしたら一番優先したいのは、\n「時間を減らしたい」のか、\n「予約ミスを減らしたい」のか、\n「集客・更新を強くしたい」のか、\nどれが一番近いですか？\n\n──\n\nありがとうございます。\nでは今日聞いた内容で、お店に合いそうな形を簡単にまとめて送ります。\nその内容を見て、必要そうであれば次にデモ画面や\n具体的な作り方をお見せします。\n\n無理にその場で決めていただかなくて大丈夫です。\nまずは合うかどうかだけ見てもらえればと思います。\n\n本日はお時間ありがとうございます。\nこのあとLINEで簡単にまとめて送ります。`,
  },
  {
    id: 32, category: 'ツール営業', emoji: '📑', title: '制作ヒアリングシート（契約後・記入式）', type: 'dm',
    vars: [],
    build: () => `中村様\n\n制作を進めるにあたって、必要な情報をまとめました。\nお手すきのときに「→」の後に記入して返信いただけると助かります😊\n（全部一度に埋まらなくても大丈夫です）\n\n━━━━━━━━━━\n①店舗の基本情報\n━━━━━━━━━━\n・店名 →\n・エリア（例：大阪/難波）→\n・営業時間 →\n・店舗の連絡先（電話/LINE）→\n・派遣エリア（出張範囲）→\n\n━━━━━━━━━━\n②キャスト情報\n━━━━━━━━━━\n・在籍人数 →\n・源氏名の一覧 →\n・出勤はどう管理してる？（紙/LINE/アプリ等）→\n・キャストへの連絡方法（個別LINE/グループ等）→\n\n━━━━━━━━━━\n③予約の流れ\n━━━━━━━━━━\n・今、予約はどこから入る？（電話/LINE/掲載サイト）→\n・予約時に決めること（時間/コース/指名/場所）→\n・ダブルブッキングは今どう防いでる？→\n\n━━━━━━━━━━\n④掲載サイト（自動更新したいもの）\n━━━━━━━━━━\n※サイトごとに教えてください\n・掲載してるサイト名（例：エステラブ/エステ魂）→\n・各サイトの店舗管理画面ログインURL →\n・ログインID →\n・パスワード →\n・ログイン時に画像認証や数字認証は出る？→\n・毎日やってる更新作業の中身\n　（更新ボタンだけ/写メ日記/出勤更新）→\n\n━━━━━━━━━━\n⑤LINE関連\n━━━━━━━━━━\n・LINE公式アカウントは持ってる？→\n・お客様への予約確認は今どうしてる？→\n\n━━━━━━━━━━\n⑥料金・コース（給与計算用）\n━━━━━━━━━━\n・コースと料金（例：60分○円）→\n・指名料/オプション →\n・キャストのバック率や歩合 →\n\n━━━━━━━━━━\n⑦一番最初に欲しい機能\n━━━━━━━━━━\n・予約管理 / キャスト通知 / 掲載自動更新 /\n　給与計算 のどれから優先したいですか？→\n\n※パスワードはご不安なら、お電話で口頭でも後ほどでも大丈夫です🙆\nまずは分かるところからで大丈夫です🙏\nよろしくお願いします！`,
  },
  {
    id: 20, category: 'ツール営業', emoji: '🔧', title: 'LINE API設定案内（契約後に送る）', type: 'dm',
    vars: [],
    build: () => `LINE APIの連携に必要な設定をお願いしたいのですが、\n手順をまとめましたのでご確認ください！\n\n【STEP 1】LINE公式アカウントを作る\nすでにお持ちの場合はスキップしてください。\n\n👇こちらから無料で作れます\nhttps://www.lycbiz.com/jp/signup/lineoa/\n\n【STEP 2】LINE Developersにログイン\n👇こちらにアクセス\nhttps://developers.line.biz/\n\n右上の「ログイン」からLINEアカウントでログインしてください。\n\n【STEP 3】チャンネルを作成\n① 「プロバイダー」を作成（店舗名でOK）\n② 「新規チャンネル作成」→「Messaging API」を選択\n③ チャンネル名・説明を入力して作成\n\n【STEP 4】2つの情報を教えてください\n\n作成後、以下の2つをコピーして送ってください👇\n\n① Channel Secret\n　→「チャンネル基本設定」タブの下の方にあります\n\n② Channel Access Token\n　→「Messaging API設定」タブの一番下\n　→「発行」ボタンを押して表示されたものをコピー\n\nこの2つがあれば、あとはこちらで全部設定します！\nご不明な点があればお気軽にどうぞ😊`,
  },
  {
    id: 13, category: 'ツール営業', emoji: '↩️', title: '断られた時の返し', type: 'dm',
    vars: [],
    build: () => `ご確認いただきありがとうございます。\n\n今は必要なかったとのこと、承知しました！\nまたタイミングが合うことがあれば、いつでもお気軽にご相談ください。\n\n何か面倒な作業が出てきたときでも、遠慮なくどうぞ😊`,
  },
  {
    id: 14, category: 'ツール営業', emoji: '📅', title: '2日後の追いDM', type: 'dm',
    vars: [],
    build: () => `先日ご連絡させていただいたGrowUP サポートの小林です。\n\nお忙しい中、確認できていなかったらすみません。\nもし毎日の掲載作業や問い合わせ対応でお困りのことがあれば、気軽にご相談ください。\n\nご提案だけなら無料ですので、よければお声がけいただけると嬉しいです。`,
  },
  {
    id: 19, category: 'ツール営業', emoji: '✅', title: '返信来た後の説明（ツール営業）', type: 'dm',
    vars: [],
    build: () => `ご返信いただきありがとうございます！\n\n例えばこんなことが実現できます。\n\n・「料金は？」と来たら自動で料金表を送る\n・「予約したい」と来たら空き時間の一覧を自動送付\n・キャストの出勤情報を管理画面から更新したら自動で反映されるサイト\n・複数の掲載サイトへの更新リマインドをLINEに自動通知\n\n料金目安：\n・LINE自動返信　30,000〜50,000円\n・予約管理ツール　60,000円〜\n・出勤情報サイト　80,000〜100,000円\n・月額管理　10,000円〜\n（内容により変動・まずはご相談ください）\n\nまず「今いちばん大変な作業は何ですか？」を教えていただければ、それに合わせた提案をさせていただきます。\n\nよければLINEでお話しできますか？\nhttps://lin.ee/Y4Uq7uP`,
  },
  {
    id: 1, category: '実績', emoji: '🏆', title: '制作実績を報告する',
    vars: [{ key: '業種', label: 'お客様の業種', placeholder: '例：美容室、整体院、ネイルサロン' }],
    build: (v) => `【制作実績 ✨】\n${v['業種'] || '[業種]'}様のホームページが完成しました！\n\n📱 スマホ対応デザイン\n📞 LINE・電話・地図リンク\n💴 料金表・サービス紹介\n\n初期費用6万円・月額1万円で\n集客に使えるHPが持てます。\n\n無料相談→ https://lin.ee/Y4Uq7uP\n\n#ホームページ制作 #個人事業主 #${v['業種'] || '格安HP'}`,
  },
  {
    id: 2, category: '実績', emoji: '📸', title: 'ビフォー→アフター紹介',
    vars: [
      { key: '業種', label: 'お客様の業種', placeholder: '例：整体院' },
      { key: 'before', label: 'Before（制作前の状況）', placeholder: '例：SNSのみで集客' },
      { key: 'after', label: 'After（制作後の変化）', placeholder: '例：問い合わせが月3件→10件に' },
    ],
    build: (v) => `【Before → After 🔄】\n\n${v['業種'] || '[業種]'}様の事例です\n\n▶ Before\n${v['before'] || 'SNSのみで集客'}\n\n▶ After\n${v['after'] || 'ホームページから問い合わせが増えた'}\n\n1ページのHPでここまで変わります。\n\n初期6万円・月1万円〜\n無料相談→ https://lin.ee/Y4Uq7uP\n\n#ホームページ制作 #${v['業種'] || '個人事業主'}`,
  },
  {
    id: 3, category: '豆知識', emoji: '💡', title: 'Googleマップだけでは損してる話',
    vars: [],
    build: () => `【知ってほしい事実】\n\nGoogleマップに載っていても\n公式HPがないと、お客様の\n離脱率がぐっと上がります📉\n\n名刺代わりの1ページだけでいい。\n料金・予約・LINE・地図がまとまればOK。\n\n初期6万円・月1万円で作れます✨\n\n#個人事業主 #集客 #HP制作`,
  },
  {
    id: 4, category: '豆知識', emoji: '📱', title: 'インスタだけ集客の限界',
    vars: [],
    build: () => `Instagramで集客してる人へ\n\n❌ 料金表が投稿に流れていく\n❌ 予約方法が毎回DMで手間\n❌ プロフィール欄がごちゃごちゃ\n\n→ ホームページ1枚あれば全部解決\n\nしかも6万円・月1万円で作れます💡\n\nお気軽にLINEどうぞ👇\nhttps://lin.ee/Y4Uq7uP\n\n#Instagram集客 #個人事業主`,
  },
  {
    id: 5, category: '営業', emoji: '📣', title: '料金・サービス紹介',
    vars: [],
    build: () => `個人事業主・店舗オーナーさんへ\n\n「ホームページ、高くて後回し...」\nそんな悩みを解決します。\n\n✅ 初期制作費 60,000円\n✅ 月額管理費 10,000円\n✅ スマホ対応・いつでも解約OK\n\nLINE・地図・料金表を1ページに。\n無料相談はこちら👇\nhttps://lin.ee/Y4Uq7uP\n\n#個人事業主 #HP制作 #格安`,
  },
  {
    id: 6, category: '営業', emoji: '🎁', title: '無料ページ案の告知',
    vars: [{ key: '業種', label: 'ターゲット業種（任意）', placeholder: '例：美容室、整体院' }],
    build: (v) => `${v['業種'] ? `【${v['業種']}さん向け】` : '【無料プレゼント】'}\n\nホームページの\nページ案を無料で作ります！\n\n・現状ヒアリング\n・構成案の提案\n・料金のご説明\n\n全部LINEで完結、費用0円、勧誘なし。\n\n「HP相談」とLINEで送ってください👇\nhttps://lin.ee/Y4Uq7uP\n\n#${v['業種'] || '個人事業主'} #無料相談 #HP制作`,
  },
  {
    id: 7, category: '共感', emoji: '🤝', title: 'HPへの疑問に共感',
    vars: [],
    build: () => `「HPって本当に必要？」\n\n正直、SNSだけでも\n集客できてる人は多い。\n\nただ、こんな悩みはありませんか？\n\n→「予約方法が分からない」と言われる\n→ Googleで検索した人が離脱する\n→ 料金を毎回DMで説明している\n\n1ページHPで全部解決します。\n月1万円から。\n\n#個人事業主 #集客 #ホームページ`,
  },
  {
    id: 8, category: 'DM', emoji: '📨', title: 'はじめまして営業DM', type: 'dm',
    vars: [{ key: '業種', label: '相手の業種（任意）', placeholder: '例：美容室、エステサロン' }],
    build: (v) => `はじめまして！\n個人事業主様${v['業種'] ? `・${v['業種']}様` : ''}や中小企業様のホームページ制作をしているGrowUPの小林と申します。\n\nホームページがあると\n・Google検索から新規のお客様が来るので予約率が上昇\n・インスタに誘導できる\n・24時間予約受付ができる\n・お店の安心感\n・他サロンとの差別化\n・サイトに全てのリンクを収められる\n\nなどメリットは上げたらきりがないです。\n\nこんなページが作れます👇\nhttps://growup-support.netlify.app/lumiere\n\n他社だと制作費100〜200万・月3万が相場ですが\nGrowUPは制作費60,000円・月1万円で管理もお任せできます。\nもちろん月単位で解約可能です。\nもし興味あれば気軽にご相談ください😊`,
  },
];

const CATEGORIES = ['すべて', 'ツール営業', 'DM', '実績', '豆知識', '営業', '共感'];
const MAX_CHARS = 280;

/* ────────────────────────────────────────────────────────────
   リスト管理
──────────────────────────────────────────────────────────── */
type Status = '未送信' | '送信済み' | '返信あり' | '成約' | '断られた';
type TargetPlatform = 'X' | 'Instagram' | 'LINE' | 'その他';
type Target = { id: string; name: string; lineId: string; platform: TargetPlatform; status: Status; memo: string; createdAt: string };

const STATUS_COLORS: Record<Status, string> = {
  '未送信': 'bg-zinc-700 text-zinc-300',
  '送信済み': 'bg-blue-700 text-blue-100',
  '返信あり': 'bg-yellow-600 text-yellow-100',
  '成約': 'bg-green-700 text-green-100',
  '断られた': 'bg-red-900 text-red-300',
};
const STATUSES: Status[] = ['未送信', '送信済み', '返信あり', '成約', '断られた'];

const PLATFORMS: TargetPlatform[] = ['X', 'Instagram', 'LINE', 'その他'];
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function parseCsvLine(line: string): string[] {
  const result: string[] = []; let cur = ''; let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQuote && line[i + 1] === '"') { cur += '"'; i++; } else { inQuote = !inQuote; } }
    else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function csvToTargets(text: string): { imported: Target[]; skipped: number } {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  // ヘッダー行からフォーマット判定（エリア列あり=5列, なし=4列）
  const headerLine = lines.find((l) => { const c = l.replace(/^﻿/, ''); return c.startsWith('ID,') || c.startsWith('"ID"'); }) ?? '';
  const hasAreaCol = headerLine.includes('エリア');
  const dataLines = lines.filter((l) => { const c = l.replace(/^﻿/, ''); return !c.startsWith('ID,') && !c.startsWith('"ID"'); });
  const imported: Target[] = []; let skipped = 0;
  for (const line of dataLines) {
    const cols = parseCsvLine(line.replace(/^﻿/, ''));
    let name: string, lineId: string, area: string, url: string;
    if (hasAreaCol) {
      // 5列フォーマット: ID, エリア, 店舗名, LINE情報, URL
      area = cols[1]?.trim() ?? '';
      name = cols[2]?.trim() || cols[0]?.trim();
      lineId = cols[3]?.trim() ?? '';
      url = cols[4]?.trim() ?? '';
    } else {
      // 4列フォーマット: ID, 店舗名, LINE情報, URL
      area = '';
      name = cols[1]?.trim() || cols[0]?.trim();
      lineId = cols[2]?.trim() ?? '';
      url = cols[3]?.trim() ?? '';
    }
    if (!name) { skipped++; continue; }
    const memo = [area ? `エリア:${area}` : '', url ? `掲載: ${url}` : ''].filter(Boolean).join(' | ');
    imported.push({ id: uid(), name, lineId, platform: 'その他', status: '未送信', memo, createdAt: new Date().toLocaleDateString('ja-JP') });
  }
  return { imported, skipped };
}

/* ────────────────────────────────────────────────────────────
   メインコンポーネント
──────────────────────────────────────────────────────────── */
const PASSCODE = '2580'; // ★パスワード（変えたいときはここを書き換え）

export default function Page() {
  // ── パスワードロック ──
  const [unlocked, setUnlocked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('gu_auth') === PASSCODE) setUnlocked(true);
    setAuthChecked(true);
  }, []);
  function tryUnlock() {
    if (pwInput === PASSCODE) {
      localStorage.setItem('gu_auth', PASSCODE);
      setUnlocked(true); setPwError(false);
    } else { setPwError(true); }
  }

  const [tab, setTab] = useState<'dm' | 'list'>('dm');

  // ── DM/投稿タブ state ──
  const [activeCategory, setActiveCategory] = useState('すべて');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({});

  // ── リストタブ state ──
  const [targets, setTargets] = useState<Target[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Status | 'すべて'>('すべて');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleteKeyword, setBulkDeleteKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; dupes: number } | null>(null);
  const [targetForm, setTargetForm] = useState<Omit<Target, 'id' | 'createdAt'>>({ name: '', lineId: '', platform: 'X', status: '未送信', memo: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  // リストタブを開いたときにAPIから取得
  useEffect(() => {
    if (tab !== 'list') return;
    setListLoading(true);
    fetch('/api/targets')
      .then((r) => r.json())
      .then((data) => setTargets(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, [tab]);

  // ── DM/投稿 ──
  // 営業フロー順の並び（①初回DM → ②返信後ヒアリング → ③電話 → ④クロージング/フォロー → ⑤契約後 → その他）
  const orderedTemplates = useMemo(() => {
    const order = [
      // ① 初回DM（送る相手別）
      33, 16, 15, 9, 11, 10, 24, 25, 18, 17, 21, 22,
      // ② 返信が来たら：ヒアリング
      23, 29, 30, 12, 19,
      // ③ 電話
      26, 31,
      // ④ クロージング／フォロー
      27, 28, 13, 14,
      // ⑤ 契約後
      32, 20,
      // その他カテゴリ
      1, 2, 3, 4, 5, 6, 7, 8,
    ];
    return [...TEMPLATES].sort((a, b) => {
      const ia = order.indexOf(a.id); const ib = order.indexOf(b.id);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, []);
  const filtered = useMemo(() => activeCategory === 'すべて' ? orderedTemplates : orderedTemplates.filter((t) => t.category === activeCategory), [activeCategory, orderedTemplates]);
  const selected = TEMPLATES.find((t) => t.id === selectedId) ?? null;
  const tweetText = selected ? selected.build(vars) : '';
  const isDM = selected?.type === 'dm';
  const charCount = [...tweetText].length;
  const charColor = isDM ? 'text-zinc-400' : charCount > MAX_CHARS ? 'text-red-400' : charCount > 240 ? 'text-yellow-400' : 'text-zinc-400';
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
  function selectTemplate(id: number) { if (selectedId === id) { setSelectedId(null); setVars({}); } else { setSelectedId(id); setVars({}); } }

  // ── リスト ──
  function saveTargets(list: Target[]) {
    setTargets(list);
    fetch('/api/targets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(list) }).catch(() => {});
  }
  function resetForm() { setTargetForm({ name: '', lineId: '', platform: 'X', status: '未送信', memo: '' }); setEditId(null); setShowForm(false); }
  function submitForm() {
    if (!targetForm.name.trim()) return;
    if (editId) { saveTargets(targets.map((t) => t.id === editId ? { ...t, ...targetForm } : t)); }
    else { saveTargets([{ id: uid(), createdAt: new Date().toLocaleDateString('ja-JP'), ...targetForm }, ...targets]); }
    resetForm();
  }
  function startEdit(t: Target) { setTargetForm({ name: t.name, lineId: t.lineId, platform: t.platform, status: t.status, memo: t.memo }); setEditId(t.id); setShowForm(true); }
  function updateStatus(id: string, status: Status) { saveTargets(targets.map((t) => t.id === id ? { ...t, status } : t)); }
  function deleteTarget(id: string) { if (confirm('削除しますか？')) saveTargets(targets.filter((t) => t.id !== id)); }
  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { imported, skipped } = csvToTargets(ev.target?.result as string);
      const existingLineIds = new Set(targets.map((t) => t.lineId).filter(Boolean));
      const fresh = imported.filter((t) => !t.lineId || !existingLineIds.has(t.lineId));
      saveTargets([...fresh, ...targets]);
      setImportResult({ imported: fresh.length, skipped, dupes: imported.length - fresh.length });
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }
  const filteredTargets = targets
    .filter((t) => filterStatus === 'すべて' || t.status === filterStatus)
    .filter((t) => {
      if (!searchKeyword.trim()) return true;
      const kw = searchKeyword.toLowerCase();
      return t.name.toLowerCase().includes(kw) || t.memo.toLowerCase().includes(kw) || t.lineId.toLowerCase().includes(kw);
    });
  const counts = STATUSES.reduce((acc, s) => { acc[s] = targets.filter((t) => t.status === s).length; return acc; }, {} as Record<Status, number>);

  // ── ロック画面 ──
  if (!authChecked) return <div className="min-h-screen bg-zinc-950" />;
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-xs text-center">
          <div className="text-blue-400 font-black text-2xl mb-1">GrowUP</div>
          <div className="text-zinc-400 text-sm mb-6">関係者用ツール</div>
          <input
            type="password"
            value={pwInput}
            onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') tryUnlock(); }}
            placeholder="パスワードを入力"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-center outline-none focus:border-blue-500"
          />
          {pwError && <div className="text-red-400 text-sm mt-2">パスワードが違います</div>}
          <button
            onClick={tryUnlock}
            className="w-full mt-3 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold"
          >
            開く
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-16">

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-50 bg-zinc-900/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-blue-400 font-black text-lg">GrowUP</span>
            <span className="text-zinc-400 text-sm ml-2">{tab === 'dm' ? 'X投稿・DMツール' : 'ターゲットリスト'}</span>
          </div>
          {tab === 'dm' ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
              {TEMPLATES.length}テンプレート
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setShowBulkDelete(true)} className="bg-red-900 hover:bg-red-800 text-white text-sm font-bold px-3 py-1.5 rounded-lg transition-colors">🗑️ 一括削除</button>
              <button onClick={() => setShowImport(true)} className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg transition-colors">📥 CSV</button>
              <button onClick={() => { setShowForm(true); setEditId(null); setTargetForm({ name: '', lineId: '', platform: 'X', status: '未送信', memo: '' }); }} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg transition-colors">＋ 追加</button>
            </div>
          )}
        </div>
      </header>

      {/* ── DM・投稿タブ ── */}
      {tab === 'dm' && (
        <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => { setActiveCategory(cat); setSelectedId(null); setVars({}); }}
                className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {filtered.map((tmpl) => {
              const isSelected = selectedId === tmpl.id;
              return (
                <div key={tmpl.id} className="rounded-2xl overflow-hidden">
                  <button onClick={() => selectTemplate(tmpl.id)}
                    className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-all ${isSelected ? 'bg-blue-600' : 'bg-zinc-900 hover:bg-zinc-800'}`}>
                    <span className="text-2xl">{tmpl.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-blue-500/50 text-blue-100' : 'bg-zinc-800 text-zinc-400'}`}>{tmpl.category}</span>
                      </div>
                      <p className="font-bold text-sm leading-snug">{tmpl.title}</p>
                    </div>
                    <svg className={`w-5 h-5 text-zinc-400 transition-transform shrink-0 ${isSelected ? 'rotate-180 text-white' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isSelected && (
                    <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-5 space-y-4">
                      {tmpl.vars.length > 0 && (
                        <div className="space-y-3">
                          {tmpl.vars.map((v) => (
                            <div key={v.key}>
                              <label className="block text-xs font-bold text-zinc-400 mb-1">{v.label}</label>
                              <input type="text" value={vars[v.key] ?? ''} onChange={(e) => setVars((prev) => ({ ...prev, [v.key]: e.target.value }))} placeholder={v.placeholder}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors" />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="bg-black rounded-xl p-4 border border-zinc-800">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-700" />
                          <div><div className="text-xs font-bold">GrowUP サポート</div><div className="text-xs text-zinc-500">@growup_support</div></div>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-100">{tweetText}</p>
                        <div className={`text-xs mt-3 text-right font-mono ${charColor}`}>
                          {charCount} / {isDM ? '—' : MAX_CHARS}
                          {isDM && <span className="ml-2 text-zinc-600">DM用</span>}
                        </div>
                      </div>
                      {isDM ? (
                        <>
                          <button onClick={async () => { await navigator.clipboard.writeText(tweetText); alert('コピーしました！DMに貼り付けて送信してください'); }}
                            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-black text-lg bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all">
                            📋 コピーしてDMに貼り付ける
                          </button>
                          <p className="text-center text-xs text-zinc-600">コピー後、Instagram・X・LINEのDMに貼り付けてください</p>
                        </>
                      ) : (
                        <>
                          <a href={tweetUrl} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl font-black text-lg transition-all ${charCount > MAX_CHARS ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed pointer-events-none' : 'bg-black border-2 border-zinc-600 hover:border-zinc-400 hover:bg-zinc-900 active:scale-95'}`}>
                            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            Xで投稿する
                          </a>
                          <button onClick={async () => { await navigator.clipboard.writeText(tweetText); alert('コピーしました！'); }}
                            className="w-full py-2.5 rounded-xl text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
                            📋 テキストをコピー
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-center text-xs text-zinc-700 pb-4">GrowUP サポート — HP制作 営業ツール</div>
        </div>
      )}

      {/* ── リストタブ ── */}
      {tab === 'list' && (
        <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
          {importResult && (
            <div className="bg-green-900/50 border border-green-700 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="text-sm">
                <span className="font-black text-green-300">{importResult.imported}件</span>
                <span className="text-green-400">をインポートしました</span>
                {importResult.dupes > 0 && <span className="text-zinc-500 ml-2">（重複{importResult.dupes}件スキップ）</span>}
              </div>
              <button onClick={() => setImportResult(null)} className="text-zinc-500 hover:text-white text-lg leading-none">✕</button>
            </div>
          )}
          <div className="grid grid-cols-5 gap-2">
            {STATUSES.map((s) => (
              <div key={s} className="bg-zinc-900 rounded-xl p-2 text-center">
                <div className="text-lg font-black">{counts[s]}</div>
                <div className="text-[10px] text-zinc-500 leading-tight mt-0.5">{s}</div>
              </div>
            ))}
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="🔍 店舗名・エリアで検索..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600"
            />
            {searchKeyword && (
              <button onClick={() => setSearchKeyword('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-lg">✕</button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(['未送信', 'すべて', '送信済み', '返信あり', '成約', '断られた'] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filterStatus === s ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                {s}{s !== 'すべて' && <span className="ml-1 opacity-60">{counts[s]}</span>}
              </button>
            ))}
          </div>
          {listLoading ? (
            <div className="text-center text-zinc-600 py-16">
              <div className="text-2xl mb-3 animate-spin">⟳</div>
              <div className="text-sm">読み込み中...</div>
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="text-center text-zinc-600 py-16">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-sm">まだターゲットが登録されていません</div>
              <button onClick={() => setShowImport(true)} className="mt-4 text-xs text-blue-400 hover:text-blue-300 underline">CSVからインポートする</button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTargets.map((t) => (
                <div key={t.id} className="bg-zinc-900 rounded-2xl px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-sm truncate">{t.name}</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{t.platform}</span>
                      </div>
                      {t.lineId && (
                        <a href={t.lineId.startsWith('http') ? t.lineId : `https://line.me/ti/p/${t.lineId}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-green-400 hover:text-green-300 underline mb-1 block truncate">
                          LINE: {t.lineId}
                        </a>
                      )}
                      {t.memo && <div className="text-xs text-zinc-500 truncate">{t.memo}</div>}
                      <div className="text-[10px] text-zinc-700 mt-1">{t.createdAt}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(t)} className="text-xs text-zinc-500 hover:text-white px-2 py-1 rounded bg-zinc-800 transition-colors">編集</button>
                        <button onClick={() => deleteTarget(t.id)} className="text-xs text-zinc-600 hover:text-red-400 px-2 py-1 rounded bg-zinc-800 transition-colors">✕</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {STATUSES.filter((s) => s !== t.status).map((s) => (
                      <button key={s} onClick={() => updateStatus(t.id, s)}
                        className="text-[10px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-white transition-colors">
                        → {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ボトムナビ ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800">
        <div className="max-w-xl mx-auto flex">
          <button onClick={() => setTab('dm')}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${tab === 'dm' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-[10px] font-bold">DM・投稿</span>
          </button>
          <button onClick={() => setTab('list')}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${tab === 'list' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-[10px] font-bold">リスト {targets.length > 0 && <span className="text-blue-300">{targets.length}</span>}</span>
          </button>
        </div>
      </nav>

      {/* ── 一括削除モーダル ── */}
      {showBulkDelete && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowBulkDelete(false); setBulkDeleteKeyword(''); } }}>
          <div className="bg-zinc-900 rounded-2xl w-full max-w-xl p-5 space-y-4">
            <h2 className="font-black text-base">🗑️ 一括削除</h2>
            <p className="text-xs text-zinc-400">エリア名や店舗名のキーワードで絞り込んで一括削除できます</p>
            <input
              type="text"
              value={bulkDeleteKeyword}
              onChange={(e) => setBulkDeleteKeyword(e.target.value)}
              placeholder="例：千葉、神奈川、エリア:千葉"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-500"
            />
            {bulkDeleteKeyword.trim() && (() => {
              const kw = bulkDeleteKeyword.trim().toLowerCase();
              const matched = targets.filter((t) =>
                t.name.toLowerCase().includes(kw) ||
                t.memo.toLowerCase().includes(kw)
              );
              return (
                <div className="space-y-3">
                  <div className="bg-zinc-800 rounded-xl px-4 py-3 text-sm">
                    <span className="text-red-400 font-black">{matched.length}件</span>
                    <span className="text-zinc-400">が該当します</span>
                  </div>
                  {matched.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm(`「${bulkDeleteKeyword}」を含む${matched.length}件を削除しますか？`)) {
                          saveTargets(targets.filter((t) =>
                            !t.name.toLowerCase().includes(kw) &&
                            !t.memo.toLowerCase().includes(kw)
                          ));
                          setShowBulkDelete(false);
                          setBulkDeleteKeyword('');
                        }
                      }}
                      className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-sm transition-colors"
                    >
                      {matched.length}件を削除する
                    </button>
                  )}
                </div>
              );
            })()}
            <button onClick={() => { setShowBulkDelete(false); setBulkDeleteKeyword(''); }} className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-sm hover:bg-zinc-700 transition-colors">キャンセル</button>
          </div>
        </div>
      )}

      {/* ── CSVインポートモーダル ── */}
      {showImport && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowImport(false); }}>
          <div className="bg-zinc-900 rounded-2xl w-full max-w-xl p-5 space-y-4">
            <h2 className="font-black text-base">📥 CSVインポート</h2>
            <div className="bg-zinc-800 rounded-xl p-4 space-y-1 text-xs text-zinc-400">
              <div className="font-bold text-zinc-300 mb-2">対応フォーマット</div>
              <div>スクレイパー出力CSVをそのまま読み込めます</div>
              <div className="font-mono text-zinc-500 text-[10px] mt-2">ID, 店舗名, LINE情報, URL</div>
              <div className="mt-2 text-zinc-500">※ 重複（同じLINE情報）は自動でスキップされます</div>
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-4 rounded-xl border-2 border-dashed border-zinc-600 hover:border-blue-500 text-zinc-400 hover:text-blue-400 font-bold transition-all text-sm">
              ファイルを選択してインポート
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { handleFileImport(e); setShowImport(false); }} />
            <button onClick={() => setShowImport(false)} className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-sm hover:bg-zinc-700 transition-colors">キャンセル</button>
          </div>
        </div>
      )}

      {/* ── 追加・編集モーダル ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="bg-zinc-900 rounded-2xl w-full max-w-xl p-5 space-y-4">
            <h2 className="font-black text-base">{editId ? 'ターゲットを編集' : 'ターゲットを追加'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">アカウント名・源氏名 <span className="text-red-400">*</span></label>
                <input type="text" value={targetForm.name} onChange={(e) => setTargetForm({ ...targetForm, name: e.target.value })} placeholder="例：@めい_メンエス"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">LINE ID / LINE@</label>
                <input type="text" value={targetForm.lineId} onChange={(e) => setTargetForm({ ...targetForm, lineId: e.target.value })} placeholder="例：@mei_mens / https://lin.ee/..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">プラットフォーム</label>
                  <select value={targetForm.platform} onChange={(e) => setTargetForm({ ...targetForm, platform: e.target.value as TargetPlatform })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                    {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">ステータス</label>
                  <select value={targetForm.status} onChange={(e) => setTargetForm({ ...targetForm, status: e.target.value as Status })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">メモ</label>
                <input type="text" value={targetForm.memo} onChange={(e) => setTargetForm({ ...targetForm, memo: e.target.value })} placeholder="例：グロービー掲載・返信遅め"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-sm hover:bg-zinc-700 transition-colors">キャンセル</button>
              <button onClick={submitForm} disabled={!targetForm.name.trim()} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {editId ? '更新する' : '追加する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
