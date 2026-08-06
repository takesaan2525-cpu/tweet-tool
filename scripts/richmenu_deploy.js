/* リッチメニューをLINEに作成→画像アップ→デフォルト適用
   予約(リンク)/料金(テキスト送信)/営業時間(テキスト送信) の3ボタン */
const fs = require('fs');
const path = require('path');
const https = require('https');

// .env.line からトークン読み込み
const envPath = path.join(__dirname, '..', '.env.line');
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const RESERVE_URL = process.env.RESERVE_URL || 'https://zero-umeda.vercel.app/reserve';
if (!TOKEN) { console.error('LINE_CHANNEL_ACCESS_TOKEN が無い'); process.exit(1); }

function req(host, pathname, method, body, contentType) {
  return new Promise((resolve, reject) => {
    const data = body instanceof Buffer ? body : Buffer.from(body || '');
    const r = https.request({ host, path: pathname, method, headers: {
      Authorization: 'Bearer ' + TOKEN,
      'Content-Type': contentType || 'application/json',
      'Content-Length': data.length,
    } }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d })); });
    r.on('error', reject); r.write(data); r.end();
  });
}

const W = 2500, H = 843;
const menu = {
  size: { width: W, height: H },
  selected: true,
  name: 'Zero メイン',
  chatBarText: 'メニュー',
  areas: [
    { bounds: { x: 0, y: 0, width: 833, height: H }, action: { type: 'uri', uri: RESERVE_URL } },
    { bounds: { x: 833, y: 0, width: 834, height: H }, action: { type: 'message', text: '料金' } },
    { bounds: { x: 1667, y: 0, width: 833, height: H }, action: { type: 'message', text: '営業時間' } },
  ],
};

(async () => {
  // 既存のデフォルトメニューを消す（作り直し対応）
  const existing = await req('api.line.me', '/v2/bot/richmenu/list', 'GET', '');
  try {
    const list = JSON.parse(existing.body).richmenus || [];
    for (const m of list) { await req('api.line.me', '/v2/bot/richmenu/' + m.richMenuId, 'DELETE', ''); }
    if (list.length) console.log('既存メニュー削除:', list.length, '件');
  } catch {}

  // 1. メニュー作成
  const created = await req('api.line.me', '/v2/bot/richmenu', 'POST', JSON.stringify(menu));
  if (created.status !== 200) { console.error('作成失敗:', created.status, created.body); process.exit(1); }
  const id = JSON.parse(created.body).richMenuId;
  console.log('メニュー作成:', id);

  // 2. 画像アップロード
  const img = fs.readFileSync(path.join(__dirname, 'richmenu.png'));
  const up = await req('api-data.line.me', `/v2/bot/richmenu/${id}/content`, 'POST', img, 'image/png');
  if (up.status !== 200) { console.error('画像アップ失敗:', up.status, up.body); process.exit(1); }
  console.log('画像アップOK');

  // 3. デフォルト適用（全ユーザー）
  const set = await req('api.line.me', `/v2/bot/user/all/richmenu/${id}`, 'POST', '');
  if (set.status !== 200) { console.error('適用失敗:', set.status, set.body); process.exit(1); }
  console.log('✅ デフォルト適用完了。全ユーザーに表示されます。');
})();
