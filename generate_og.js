const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// OGカード（1200x630比率）。pdf points で作成 → 後でPNG化
const W = 1200, H = 630;
const doc = new PDFDocument({ size: [W, H], margin: 0 });
const pdfPath = path.join(__dirname, 'og-demo.pdf');
doc.pipe(fs.createWriteStream(pdfPath));

doc.registerFont('jp', 'C:\\Windows\\Fonts\\YuGothM.ttc', 'YuGothic-Medium');
doc.registerFont('jpb', 'C:\\Windows\\Fonts\\YuGothB.ttc', 'YuGothic-Bold');

function rect(x, y, w, h, c) { doc.save().rect(x, y, w, h).fill(c).restore(); }

// 背景
rect(0, 0, W, H, '#0f1020');
rect(0, 0, W, 8, '#4a9eff');
rect(0, H - 8, W, 8, '#ffd600');

// ブランド
doc.font('jpb').fontSize(26).fillColor('#4a9eff').text('GrowUP サポート', 60, 56);
doc.font('jp').fontSize(20).fillColor('#9aa0b5').text('メンエス・夜職店舗向け 業務効率化ツール', 60, 92);

// メインタイトル
doc.font('jpb').fontSize(62).fillColor('#ffffff').text('予約・連絡・集客を', 60, 150);
doc.font('jpb').fontSize(62).fillColor('#ffffff').text('まるごと ', 60, 224, { continued: true });
doc.fillColor('#2ecc71').text('自動化');

// 機能チップ
const chips = ['予約管理', 'LINE自動通知', '掲載更新の自動化', '給与計算', 'リピーター集客'];
let cx = 60; const cy = 340;
doc.font('jp').fontSize(22);
chips.forEach((label) => {
  const w = doc.widthOfString(label) + 36;
  rect(cx, cy, w, 46, '#1c1f33');
  doc.fillColor('#cfd3e3').text(label, cx + 18, cy + 11);
  cx += w + 16;
});

// 料金バッジ
rect(60, 430, 520, 110, '#16182b');
rect(60, 430, 6, 110, '#ffd600');
doc.font('jpb').fontSize(22).fillColor('#ffd600').text('買い切り・月額なし', 90, 452);
doc.font('jpb').fontSize(52).fillColor('#ffffff').text('40,000円', 90, 478);

// 右側CTA
doc.font('jp').fontSize(24).fillColor('#9aa0b5').text('実際に触れるデモはこちら ▶', 620, 470, { width: 520 });
doc.font('jpb').fontSize(26).fillColor('#4a9eff').text('tweet-tool-six.vercel.app/demo', 620, 506, { width: 520 });

doc.end();

doc.on('end', () => {});
const stream = fs.createWriteStream; // noop
console.log('PDF written:', pdfPath);
