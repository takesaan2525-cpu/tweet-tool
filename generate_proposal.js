const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4',
  margin: 50,
  info: {
    Title: 'GrowUP サポート 業務自動化ツール ご提案資料',
    Author: 'GrowUP サポート 小林',
  },
});

const outputPath = path.join(__dirname, 'GrowUP_提案資料.pdf');
doc.pipe(fs.createWriteStream(outputPath));

// 日本語フォント登録
const JP = 'C:\\Windows\\Fonts\\YuGothM.ttc';
const JP_BOLD = 'C:\\Windows\\Fonts\\YuGothB.ttc';
doc.registerFont('jp', JP, 'YuGothic-Medium');
doc.registerFont('jpb', JP_BOLD, 'YuGothic-Bold');

function rect(x, y, w, h, color) {
  doc.save().rect(x, y, w, h).fill(color).restore();
}

// ── ページ1: 表紙 ─────────────────────────────────────────────
rect(0, 0, 595, 842, '#1a1a2e');
rect(0, 300, 595, 4, '#4a9eff');

doc.font('jpb').fontSize(13).fillColor('#4a9eff')
  .text('GrowUP サポート', 50, 120, { align: 'center', width: 495 });

doc.font('jpb').fontSize(26).fillColor('#ffffff')
  .text('業務まるごと自動化ツール', 50, 152, { align: 'center', width: 495 });

doc.font('jp').fontSize(15).fillColor('#cccccc')
  .text('メンズエステ・夜職店舗向け', 50, 198, { align: 'center', width: 495 });

doc.font('jp').fontSize(10).fillColor('#888888')
  .text('予約管理 / キャスト通知 / 給与計算 / SNS集客 / ランキング維持', 50, 232, { align: 'center', width: 495 });

doc.font('jpb').fontSize(22).fillColor('#4a9eff')
  .text('買い切り 40,000円', 50, 328, { align: 'center', width: 495 });

doc.font('jp').fontSize(11).fillColor('#aaaaaa')
  .text('月額なし  /  完全お渡し  /  操作マニュアル付き', 50, 366, { align: 'center', width: 495 });

doc.font('jp').fontSize(10).fillColor('#888888')
  .text('GrowUP サポート　小林', 50, 720, { align: 'center', width: 495, lineBreak: false })
  .text('https://growup-support.netlify.app', 50, 738, { align: 'center', width: 495, lineBreak: false });

// ── ページ2: 7機能一覧 ────────────────────────────────────────
doc.addPage();
rect(0, 0, 595, 842, '#0f0f1a');
rect(0, 0, 595, 70, '#1a1a2e');

doc.font('jpb').fontSize(18).fillColor('#4a9eff')
  .text('できること 7つ', 50, 20, { align: 'center', width: 495 });
doc.font('jp').fontSize(10).fillColor('#888888')
  .text('すべてプランに含まれます', 50, 47, { align: 'center', width: 495 });

const features = [
  {
    num: '01',
    title: '予約・ダブルブッキング防止',
    desc: '専用予約サイトで空き時間をリアルタイム管理\n予約が入った瞬間に他サイトの空きを自動ブロック\nダブルブッキングが物理的に起きない仕組み',
    color: '#4a9eff',
  },
  {
    num: '02',
    title: '女の子への自動共有・通知',
    desc: '予約確定→担当キャストのLINEに即時自動通知\n「〇時に△△様のご予約が入りました」\n前日・当日朝のリマインドも自動送信',
    color: '#7c4dff',
  },
  {
    num: '03',
    title: 'お客様への自動予約確認（SMS/LINE）',
    desc: '予約確定後に自動で確認メッセージ送信\n前日リマインド＋キャンセルリンクも自動添付\n深夜の予約でも無人で対応完結',
    color: '#00c853',
  },
  {
    num: '04',
    title: '給与計算の自動化',
    desc: '勤怠・指名・オプション料金を管理画面に入力\n月末に自動で給与明細を計算・出力\nキャストごとの売上・指名数も見える化',
    color: '#ff6d00',
  },
  {
    num: '05',
    title: 'SNS集客の自動化',
    desc: 'Instagram/X への投稿を事前予約・自動投稿\n出勤情報を入力したら複数SNSに一括投稿\n掲載サイトの更新もワンタップで完了',
    color: '#e91e63',
  },
  {
    num: '06',
    title: 'リピーター集客の自動化',
    desc: '1ヶ月来ていないお客様に自動でクーポンLINE\n誕生日に自動でお祝いメッセージ＋特典送信\n来店回数に応じてVIP特典を自動付与',
    color: '#00bcd4',
  },
  {
    num: '07',
    title: '掲載ランキング自動維持ツール',
    desc: 'エステラブ・グロー等を毎日自動で更新\n毎日更新している店舗ほどランキング上位に\n手動だと毎日10〜30分かかる作業を自動化',
    color: '#ffd600',
  },
];

let y = 85;
features.forEach((f) => {
  rect(50, y, 495, 82, '#1a1a2e');
  rect(50, y, 4, 82, f.color);

  doc.font('jpb').fontSize(9).fillColor(f.color)
    .text(f.num, 65, y + 11);
  doc.font('jpb').fontSize(12).fillColor('#ffffff')
    .text(f.title, 86, y + 9, { width: 445 });
  doc.font('jp').fontSize(8.5).fillColor('#aaaaaa')
    .text(f.desc, 86, y + 30, { width: 445, lineGap: 2 });

  y += 90;
});

// ── ページ3: 料金・デモ・連絡先 ──────────────────────────────
doc.addPage();
rect(0, 0, 595, 842, '#0f0f1a');
rect(0, 0, 595, 70, '#1a1a2e');

doc.font('jpb').fontSize(18).fillColor('#4a9eff')
  .text('料金とお問い合わせ', 50, 20, { align: 'center', width: 495 });
doc.font('jp').fontSize(10).fillColor('#888888')
  .text('買い切り / 追加費用なし', 50, 47, { align: 'center', width: 495 });

// 料金ボックス
rect(50, 90, 495, 140, '#1a1a2e');
rect(50, 90, 4, 140, '#4a9eff');

doc.font('jpb').fontSize(14).fillColor('#4a9eff')
  .text('プラン料金', 70, 105);
doc.font('jpb').fontSize(30).fillColor('#ffffff')
  .text('40,000円', 70, 128);
doc.font('jp').fontSize(11).fillColor('#aaaaaa')
  .text('7機能すべて込み  /  買い切り  /  月額なし', 70, 170);
doc.font('jp').fontSize(9).fillColor('#666666')
  .text('※ サーバー代（月1,000〜2,000円程度）はお客様負担となります', 70, 190);

// デモ
rect(50, 250, 495, 90, '#1a1a2e');
rect(50, 250, 4, 90, '#7c4dff');

doc.font('jpb').fontSize(14).fillColor('#7c4dff')
  .text('デモを触ってみる', 70, 265);
doc.font('jp').fontSize(11).fillColor('#aaaaaa')
  .text('ブラウザから実際に全機能を体験できます', 70, 287);
doc.font('jp').fontSize(12).fillColor('#4a9eff')
  .text('https://tweet-tool-six.vercel.app/demo', 70, 307);

// 対応内容
rect(50, 360, 495, 180, '#1a1a2e');
rect(50, 360, 4, 180, '#00c853');

doc.font('jpb').fontSize(14).fillColor('#00c853')
  .text('含まれるもの', 70, 375);

const included = [
  'Webシステム一式（URLでアクセスして使える）',
  '操作マニュアル（動画付き）',
  'LINE API設定サポート（初回一緒に設定）',
  '店舗に合わせてゼロから制作',
  'お渡し後の運用サポート不要（買い切り完結）',
];

included.forEach((item, i) => {
  doc.font('jp').fontSize(11).fillColor('#aaaaaa')
    .text('✓  ' + item, 70, 402 + i * 25);
});

// 連絡先
rect(50, 560, 495, 120, '#1a1a2e');
rect(50, 560, 4, 120, '#ffd600');

doc.font('jpb').fontSize(14).fillColor('#ffd600')
  .text('お問い合わせ', 70, 575);
doc.font('jp').fontSize(11).fillColor('#aaaaaa')
  .text('GrowUP サポート　小林', 70, 600)
  .text('HP：https://growup-support.netlify.app', 70, 622)
  .text('LINE：https://lin.ee/Y4Uq7uP', 70, 644);

doc.font('jp').fontSize(9).fillColor('#555555')
  .text('GrowUP サポート　|　https://growup-support.netlify.app', 50, 730, { align: 'center', width: 495, lineBreak: false });

doc.end();
console.log('PDF generated: ' + outputPath);
