const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4', margin: 50,
  info: { Title: 'GrowUP サポート ご提案資料（中村様）', Author: 'GrowUP サポート 小林' },
});
const outputPath = path.join(__dirname, 'GrowUP_提案資料_中村様.pdf');
doc.pipe(fs.createWriteStream(outputPath));

doc.registerFont('jp', 'C:\\Windows\\Fonts\\YuGothM.ttc', 'YuGothic-Medium');
doc.registerFont('jpb', 'C:\\Windows\\Fonts\\YuGothB.ttc', 'YuGothic-Bold');
function rect(x, y, w, h, c) { doc.save().rect(x, y, w, h).fill(c).restore(); }

// ── ページ1: 表紙 ──
rect(0, 0, 595, 842, '#1a1a2e');
rect(0, 300, 595, 4, '#4a9eff');

doc.font('jpb').fontSize(13).fillColor('#4a9eff').text('GrowUP サポート', 50, 110, { align: 'center', width: 495 });
doc.font('jpb').fontSize(15).fillColor('#ffffff').text('中村様 へのご提案', 50, 138, { align: 'center', width: 495 });
doc.font('jpb').fontSize(25).fillColor('#ffffff').text('派遣型店舗の業務を', 50, 178, { align: 'center', width: 495 });
doc.font('jpb').fontSize(25).fillColor('#4a9eff').text('まるごと自動化', 50, 210, { align: 'center', width: 495 });
doc.font('jp').fontSize(11).fillColor('#aaaaaa')
  .text('予約 / 受付→キャスト連絡 / 顧客確認 / 掲載更新 / 給与', 50, 250, { align: 'center', width: 495 });

doc.font('jpb').fontSize(22).fillColor('#4a9eff').text('買い切り 40,000円', 50, 328, { align: 'center', width: 495 });
doc.font('jp').fontSize(11).fillColor('#aaaaaa').text('月額なし  /  完全お渡し  /  操作マニュアル付き', 50, 366, { align: 'center', width: 495 });

doc.font('jp').fontSize(10).fillColor('#888888')
  .text('GrowUP サポート　小林', 50, 720, { align: 'center', width: 495, lineBreak: false })
  .text('https://growup-support.netlify.app', 50, 738, { align: 'center', width: 495, lineBreak: false });

// ── ページ2: 派遣型向け機能 ──
doc.addPage();
rect(0, 0, 595, 842, '#0f0f1a');
rect(0, 0, 595, 70, '#1a1a2e');
doc.font('jpb').fontSize(18).fillColor('#4a9eff').text('派遣型店舗のための機能', 50, 20, { align: 'center', width: 495 });
doc.font('jp').fontSize(10).fillColor('#888888').text('すべてプランに含まれます', 50, 47, { align: 'center', width: 495 });

const features = [
  { num: '01', title: '予約・ダブルブッキング防止', color: '#4a9eff',
    desc: 'お客様がキャスト×空き時間を選んでネット予約\n空き状況をリアルタイム管理\n予約が入った瞬間に自動ブロック→重複受付なし' },
  { num: '02', title: '受付→キャストへのLINE自動通知', color: '#7c4dff',
    desc: '予約確定で担当キャストのLINEへ自動連絡\n「〇時 / △△ホテル / お客様情報」を自動共有\n出発リマインドも自動。連絡業務をまるごと削減' },
  { num: '03', title: 'お客様への自動予約確認（SMS/LINE）', color: '#00c853',
    desc: '予約後に確認メッセージを自動送信\n前日・当日リマインドで無断キャンセル防止\n深夜の予約でも無人で対応完結' },
  { num: '04', title: '掲載サイトの自動更新（ランキング維持）', color: '#ffd600',
    desc: 'エステラブ・駅ちか等を毎日自動で更新\n更新忘れゼロ→更新順の上位をキープ\n毎日の手作業（10〜30分×サイト数）がゼロに' },
  { num: '05', title: '給与・指名の自動集計', color: '#ff6d00',
    desc: '指名・オプション料金を入力→給与を自動計算\nキャストごとの売上・指名数も見える化\n月末の集計作業をまるごと自動化' },
];

let y = 90;
features.forEach((f) => {
  rect(50, y, 495, 116, '#1a1a2e');
  rect(50, y, 4, 116, f.color);
  doc.font('jpb').fontSize(10).fillColor(f.color).text(f.num, 66, y + 14);
  doc.font('jpb').fontSize(13).fillColor('#ffffff').text(f.title, 88, y + 12, { width: 445 });
  doc.font('jp').fontSize(9.5).fillColor('#aaaaaa').text(f.desc, 88, y + 40, { width: 445, lineGap: 3 });
  y += 126;
});

// ── ページ3: 料金・デモ・連絡先 ──
doc.addPage();
rect(0, 0, 595, 842, '#0f0f1a');
rect(0, 0, 595, 70, '#1a1a2e');
doc.font('jpb').fontSize(18).fillColor('#4a9eff').text('料金とお問い合わせ', 50, 20, { align: 'center', width: 495 });
doc.font('jp').fontSize(10).fillColor('#888888').text('買い切り / 追加費用なし', 50, 47, { align: 'center', width: 495 });

rect(50, 90, 495, 140, '#1a1a2e'); rect(50, 90, 4, 140, '#4a9eff');
doc.font('jpb').fontSize(14).fillColor('#4a9eff').text('プラン料金', 70, 105);
doc.font('jpb').fontSize(30).fillColor('#ffffff').text('40,000円', 70, 128);
doc.font('jp').fontSize(11).fillColor('#aaaaaa').text('5機能すべて込み  /  買い切り  /  月額なし', 70, 170);
doc.font('jp').fontSize(9).fillColor('#666666').text('※ 追加費用は一切かかりません', 70, 190);

rect(50, 250, 495, 90, '#1a1a2e'); rect(50, 250, 4, 90, '#7c4dff');
doc.font('jpb').fontSize(14).fillColor('#7c4dff').text('デモを触ってみる', 70, 265);
doc.font('jp').fontSize(11).fillColor('#aaaaaa').text('ブラウザから実際に全機能を体験できます', 70, 287);
doc.font('jp').fontSize(12).fillColor('#4a9eff').text('https://tweet-tool-six.vercel.app/demo?v=5', 70, 307);

rect(50, 360, 495, 180, '#1a1a2e'); rect(50, 360, 4, 180, '#00c853');
doc.font('jpb').fontSize(14).fillColor('#00c853').text('含まれるもの', 70, 375);
['Webシステム一式（URLでアクセスして使える）', '操作マニュアル（動画付き）', 'LINE API設定サポート（初回一緒に設定）', '派遣型の運用に合わせてゼロから制作', 'お渡し後の運用サポート不要（買い切り完結）']
  .forEach((item, i) => doc.font('jp').fontSize(11).fillColor('#aaaaaa').text('✓  ' + item, 70, 402 + i * 25));

rect(50, 560, 495, 120, '#1a1a2e'); rect(50, 560, 4, 120, '#ffd600');
doc.font('jpb').fontSize(14).fillColor('#ffd600').text('お問い合わせ', 70, 575);
doc.font('jp').fontSize(11).fillColor('#aaaaaa')
  .text('GrowUP サポート　小林', 70, 600)
  .text('HP：https://growup-support.netlify.app', 70, 622)
  .text('LINE：https://lin.ee/Y4Uq7uP', 70, 644);

doc.font('jp').fontSize(9).fillColor('#555555')
  .text('GrowUP サポート　|　中村様 ご提案資料', 50, 730, { align: 'center', width: 495, lineBreak: false });

doc.end();
console.log('written:', outputPath);
