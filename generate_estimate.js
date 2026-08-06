const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ★ ここを書き換えるだけ
const CLIENT = '中村 様';                 // 宛名
const ISSUE_DATE = '2026年6月21日';
const ESTIMATE_NO = 'GU-20260621-001';
const VALID = '発行日より30日間';

const doc = new PDFDocument({ size: 'A4', margin: 50 });
const out = path.join(__dirname, 'GrowUP_見積書.pdf');
doc.pipe(fs.createWriteStream(out));

doc.registerFont('jp', 'C:\\Windows\\Fonts\\YuGothM.ttc', 'YuGothic-Medium');
doc.registerFont('jpb', 'C:\\Windows\\Fonts\\YuGothB.ttc', 'YuGothic-Bold');

const ACC = '#1a5fb4';
function line(x1, y1, x2, y2, c, w = 1) { doc.save().moveTo(x1, y1).lineTo(x2, y2).lineWidth(w).strokeColor(c).stroke().restore(); }
function rect(x, y, w, h, c) { doc.save().rect(x, y, w, h).fill(c).restore(); }

// タイトル
doc.font('jpb').fontSize(28).fillColor('#222').text('御 見 積 書', 0, 56, { align: 'center' });
line(220, 96, 375, 96, ACC, 1.5);

// 宛名
doc.font('jpb').fontSize(16).fillColor('#222').text(CLIENT, 50, 130);
line(50, 156, 300, 156, '#888', 0.8);

// 右上：発行日・番号
doc.font('jp').fontSize(10).fillColor('#444')
  .text(`発行日：${ISSUE_DATE}`, 350, 130, { width: 195, align: 'right' })
  .text(`見積番号：${ESTIMATE_NO}`, 350, 146, { width: 195, align: 'right' });

// リード文
doc.font('jp').fontSize(11).fillColor('#333')
  .text('下記の通りお見積り申し上げます。ご検討のほどよろしくお願いいたします。', 50, 178);

// 合計金額バー
rect(50, 208, 495, 46, '#f0f4fa');
rect(50, 208, 5, 46, ACC);
doc.font('jpb').fontSize(13).fillColor('#333').text('お見積金額（税込）', 70, 224);
doc.font('jpb').fontSize(22).fillColor(ACC).text('¥40,000 -', 300, 218, { width: 230, align: 'right' });

// 明細テーブル
const tx = 50, tw = 495;
let y = 280;
rect(tx, y, tw, 26, ACC);
doc.font('jpb').fontSize(10).fillColor('#fff')
  .text('品目', tx + 12, y + 8)
  .text('数量', tx + 300, y + 8, { width: 50, align: 'center' })
  .text('単価', tx + 350, y + 8, { width: 65, align: 'right' })
  .text('金額', tx + 420, y + 8, { width: 63, align: 'right' });
y += 26;

const rows = [
  ['業務自動化ツール 一式（派遣型向け）', '1式', '40,000', '40,000'],
  ['　・予約サイト＋ダブルブッキング防止', '', '', ''],
  ['　・受付→キャストへのLINE自動通知', '', '', ''],
  ['　・お客様への自動予約確認（SMS/LINE）', '', '', ''],
  ['　・掲載サイトの更新自動化', '', '', ''],
  ['　・給与／指名の自動集計', '', '', ''],
  ['　・操作マニュアル／初期設定サポート込み', '', '', ''],
];
doc.font('jp').fontSize(9.5).fillColor('#333');
rows.forEach((r, i) => {
  const rh = 22;
  if (i % 2 === 1) rect(tx, y, tw, rh, '#f7f9fc');
  doc.fillColor('#333')
    .text(r[0], tx + 12, y + 6, { width: 285 })
    .text(r[1], tx + 300, y + 6, { width: 50, align: 'center' })
    .text(r[2], tx + 350, y + 6, { width: 65, align: 'right' })
    .text(r[3], tx + 420, y + 6, { width: 63, align: 'right' });
  y += rh;
});
// 空行で高さ調整
for (let k = 0; k < 2; k++) { const rh = 22; if ((rows.length + k) % 2 === 1) rect(tx, y, tw, rh, '#f7f9fc'); y += rh; }
line(tx, y, tx + tw, y, '#ccc', 0.8);

// 合計欄
const sy = y + 6;
doc.font('jp').fontSize(10).fillColor('#333');
doc.text('小計', tx + 300, sy, { width: 110, align: 'right' });
doc.text('40,000', tx + 420, sy, { width: 63, align: 'right' });
doc.text('消費税', tx + 300, sy + 20, { width: 110, align: 'right' });
doc.text('—', tx + 420, sy + 20, { width: 63, align: 'right' });
rect(tx + 300, sy + 40, 183, 28, '#eef3fb');
doc.font('jpb').fontSize(12).fillColor(ACC)
  .text('合計', tx + 300, sy + 48, { width: 110, align: 'right' })
  .text('¥40,000', tx + 415, sy + 48, { width: 68, align: 'right' });

// 備考
const by = sy + 90;
doc.font('jpb').fontSize(10).fillColor('#222').text('【備考】', 50, by);
doc.font('jp').fontSize(9).fillColor('#444')
  .text('・買い切り（月額なし）でのご提供です。追加費用は一切かかりません。', 50, by + 16)
  .text('・店舗の運用に合わせてゼロから制作いたします。仕様はご相談のうえ調整可能です。', 50, by + 31)
  .text('・掲載サイトの自動更新は、管理画面の仕様により対応可否が変わる場合があります。', 50, by + 46)
  .text(`・本見積の有効期限：${VALID}`, 50, by + 61);

// 発行者
const fy = by + 110;
line(310, fy, 545, fy, '#888', 0.8);
doc.font('jpb').fontSize(11).fillColor('#222').text('GrowUP サポート', 310, fy + 8);
doc.font('jp').fontSize(9.5).fillColor('#444')
  .text('担当：小林', 310, fy + 26)
  .text('HP：https://growup-support.netlify.app', 310, fy + 41)
  .text('LINE：https://lin.ee/Y4Uq7uP', 310, fy + 56);

doc.end();
console.log('written:', out);
