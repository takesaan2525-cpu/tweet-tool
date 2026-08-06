/* リッチメニュー画像を生成（2500x843・3ボタン：予約/料金/営業時間） */
const sharp = require('sharp');
const path = require('path');

const W = 2500, H = 843, COL = W / 3;
const label = (x, icon, title, sub) => `
  <g>
    ${icon}
    <text x="${x}" y="560" text-anchor="middle" font-family="Yu Gothic UI, Meiryo, MS Gothic, sans-serif" font-size="76" font-weight="700" fill="#ffffff">${title}</text>
    <text x="${x}" y="640" text-anchor="middle" font-family="Yu Gothic UI, Meiryo, sans-serif" font-size="40" fill="#c9d4e6">${sub}</text>
  </g>`;

// シンプルなアイコン（線画）
const cx1 = COL * 0.5, cx2 = COL * 1.5, cx3 = COL * 2.5;
const calIcon = `<g stroke="#8fb4ff" stroke-width="7" fill="none">
  <rect x="${cx1-70}" y="300" width="140" height="120" rx="14"/>
  <line x1="${cx1-70}" y1="345" x2="${cx1+70}" y2="345"/>
  <line x1="${cx1-40}" y1="290" x2="${cx1-40}" y2="315"/>
  <line x1="${cx1+40}" y1="290" x2="${cx1+40}" y2="315"/></g>`;
const yenIcon = `<g stroke="#ffd68f" stroke-width="7" fill="none" stroke-linecap="round">
  <path d="M ${cx2-45} 300 L ${cx2} 360 L ${cx2+45} 300"/>
  <line x1="${cx2}" y1="360" x2="${cx2}" y2="425"/>
  <line x1="${cx2-45}" y1="378" x2="${cx2+45}" y2="378"/>
  <line x1="${cx2-45}" y1="405" x2="${cx2+45}" y2="405"/></g>`;
const clockIcon = `<g stroke="#a8f0c8" stroke-width="7" fill="none" stroke-linecap="round">
  <circle cx="${cx3}" cy="360" r="70"/>
  <line x1="${cx3}" y1="360" x2="${cx3}" y2="315"/>
  <line x1="${cx3}" y1="360" x2="${cx3+40}" y2="378"/></g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#141b2e"/><stop offset="1" stop-color="#0e1420"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <line x1="${COL}" y1="120" x2="${COL}" y2="723" stroke="#2a3450" stroke-width="3"/>
  <line x1="${COL*2}" y1="120" x2="${COL*2}" y2="723" stroke="#2a3450" stroke-width="3"/>
  ${label(cx1, calIcon, 'ご予約', 'ネット予約はこちら')}
  ${label(cx2, yenIcon, '料金・コース', 'コース料金を見る')}
  ${label(cx3, clockIcon, '営業時間', '13:00〜翌5:00')}
</svg>`;

(async () => {
  const out = path.join(__dirname, 'richmenu.png');
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log('生成:', out);
})();
