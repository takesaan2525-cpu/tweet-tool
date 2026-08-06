import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { castInfo, COURSES, COURSE_MENU } from './casts';
import { SHOP } from '../../shop.config';

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
  token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
});

const USERS_KEY = 'growup_line_users';
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '';
const anthropic = new Anthropic(); // ANTHROPIC_API_KEY を環境変数から読む

// AIキーがあればAI接客、無ければ予約ページ案内（自動切替）。カード無しでも動く。
const HAS_AI = !!process.env.ANTHROPIC_API_KEY;
const RESERVE_URL = process.env.RESERVE_URL ?? SHOP.reserveUrl;
// 店の電話番号（詳しい相談はここへ誘導）。表示用にハイフン整形。
const STORE_TEL = (process.env.STORE_TEL ?? SHOP.tel).replace(/[^\d]/g, '');
const STORE_TEL_VIEW = STORE_TEL.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3');

const HOURS = SHOP.hours;
const AREA = SHOP.area;

// コース料金の表示テキスト
function courseMenuText(): string {
  return COURSE_MENU.map((c) =>
    `【${c.type}】` + Object.entries(c.prices).map(([m, p]) => `${m}分 ${Number(p).toLocaleString('ja-JP')}円`).join(' / ')
  ).join('\n');
}

// AI無し時のデフォルト返信（予約ページへ誘導）
function templateReply(): string {
  return `メッセージありがとうございます🌙

ご予約は下記ページから、空いているお時間を選ぶだけで承れます。
▶ ${RESERVE_URL}

コース・料金やキャストのご相談も、お気軽にメッセージください。スタッフが確認して折り返しご案内いたします😊`;
}

// AI無しでも、よくある質問にキーワードで自動応答する
function keywordReply(text: string): string {
  const t = text.toLowerCase();
  const has = (...ws: string[]) => ws.some((w) => text.includes(w) || t.includes(w.toLowerCase()));

  // 予約・当日今すぐ
  if (has('予約', 'よやく', '取りたい', 'とりたい', '入りたい', '空き', 'あき', '当日', '今から', '今すぐ', 'これから', '本日'))
    return `ご予約はこちらのページから、空いているお時間を選ぶだけで完了します😊\n▶ ${RESERVE_URL}\n\nご希望のキャスト・お時間が決まっていればメッセージでも承ります。当日・直前のご予約も歓迎です🌙`;

  // 料金・コース・延長・オプション
  if (has('料金', '値段', 'いくら', 'コース', '価格', 'ねだん', '金額', '円', '延長', 'オプション'))
    return `コース料金のご案内です💁\n\n${courseMenuText()}\n\n詳しい内容やご不明点は、店舗まで直接お電話ください📞\n▶ ${STORE_TEL_VIEW}\n\n※ご予約はこちら\n▶ ${RESERVE_URL}`;

  // 営業時間・定休
  if (has('営業', '何時', '時間', 'やってる', 'やってます', '開い', '空いて', '定休', '今日やって'))
    return `営業時間は ${HOURS} です🌙（年中無休で営業しております）\nご予約はこちらから承っております。\n▶ ${RESERVE_URL}`;

  // 場所・アクセス・駐車
  if (has('場所', 'どこ', 'アクセス', '住所', 'エリア', '最寄', '駅', '駐車', 'マップ', '地図'))
    return `${AREA}のお店です📍\n詳しい場所・アクセスは、ご予約確定後に個別でご案内しております（プライバシー保護のため）。まずはこちらからご予約ください😊\n▶ ${RESERVE_URL}`;

  // キャスト・出勤・写真・指名・タイプ
  if (has('キャスト', '女の子', 'だれ', '誰', '出勤', 'おすすめ', 'セラピスト', '人気', '在籍', '写真', '画像', 'どんな子', '指名', '新人', '巨乳', '癒し', '小柄', 'スレンダー', 'グラマー'))
    return `本日の出勤キャストは、こちらのページで写真付きでご確認いただけます👇（そのままご予約もOK）\n▶ ${RESERVE_URL}\n\n「癒し系」「小柄な子」「グラマー」などのご希望があれば、メッセージで教えてください。合う子をご提案します😊`;

  // 初めて・システム・流れ
  if (has('初め', 'はじめて', '初回', '新規', 'システム', '流れ', 'どうやって', 'やり方', 'どうすれば', 'メンエス', 'メンズエステ'))
    return `はじめての方も安心してご利用いただけます😊\n\n【ご利用の流れ】\n① 下記ページでキャスト・お時間を選んでご予約\n② スタッフが確認のご連絡\n③ 当日、ご案内\n\n▶ ${RESERVE_URL}\n\nご不明な点はお気軽にメッセージください。`;

  // 支払い方法
  if (has('支払', '現金', 'カード', 'クレジット', 'クレカ', 'ペイペイ', '電子マネー', '会計'))
    return `お支払い方法につきましては、確実なご案内のため店舗スタッフより折り返しご連絡いたします🙏\nお急ぎの場合はその旨お書き添えください。`;

  // キャンセル・変更・遅刻
  if (has('キャンセル', '変更', 'ずらし', 'ずらせ', '遅れ', '遅刻', 'リスケ', '取り消し'))
    return `ご予約のキャンセル・変更、当日の遅れなどは、このままメッセージでお知らせください🙏\nスタッフが確認して対応いたします。`;

  // 割引・クーポン・イベント
  if (has('割引', 'クーポン', 'イベント', 'キャンペーン', '安く', '特典', 'お得'))
    return `お得な情報は随時このLINEでご案内しております🎁\n現在のご予約はこちらから承っております。\n▶ ${RESERVE_URL}`;

  // お礼
  if (has('ありがとう', 'サンキュー', '感謝'))
    return `こちらこそありがとうございます😊\nまたのご利用を心よりお待ちしております🌙\n▶ ${RESERVE_URL}`;

  // 求人
  if (has('求人', '採用', '働', '面接', '応募', 'バイト', '入店'))
    return `お問い合わせありがとうございます。求人につきましては、店舗スタッフより折り返しご連絡いたします🙏`;

  // 挨拶・その他 → デフォルト案内
  return templateReply();
}

type LineUser = { userId: string; name: string; at: string };
type Turn = { role: 'user' | 'assistant'; content: string };

const SYSTEM = `あなたはメンズエステ店「${SHOP.nameLong}」の予約受付AIアシスタントです。
LINEでお客様からの問い合わせ・予約を受け付けます。

# 在籍キャスト
${castInfo()}

# コース料金
${COURSES.join(' / ')}
営業時間：${SHOP.hours}

# あなたの役割
- お客様の希望を聞いて、ぴったりのキャストを提案する
- 「巨乳の子」「癒し系」「小柄な子」みたいな曖昧な要望でも、上のキャスト情報から合う子を提案する
- 予約に必要な「①希望キャスト ②希望日時 ③コース」を自然な会話で聞き出す
- 3つ揃ったら「内容を確認してスタッフから折り返します」と伝えてまとめる

# 話し方
- フレンドリーで親しみやすく、絵文字を1〜2個使う
- 1回の返信は短め（3〜4行）。長文にしない
- 下品になりすぎず、でも固すぎない接客トーン

# 注意
- キャスト情報に無いことは「確認します」と答える（嘘をつかない）
- 料金や在籍にない無茶な要望は、やんわり案内する
- 確定予約はあなたではなくスタッフが最終確認する旨を伝える
- 最終的な返答だけを書く。思考や前置きは書かない。`;

async function getProfile(userId: string): Promise<string> {
  try {
    const r = await fetch('https://api.line.me/v2/bot/profile/' + userId, {
      headers: { Authorization: 'Bearer ' + TOKEN },
    });
    if (!r.ok) return '';
    const j = (await r.json()) as { displayName?: string };
    return j.displayName ?? '';
  } catch { return ''; }
}

async function reply(replyToken: string, text: string) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  });
}

async function register(userId: string): Promise<string> {
  const name = await getProfile(userId);
  const list = (await redis.get<LineUser[]>(USERS_KEY)) ?? [];
  if (!list.some((u) => u.userId === userId)) {
    list.push({ userId, name, at: new Date().toISOString() });
    await redis.set(USERS_KEY, JSON.stringify(list));
  }
  return name;
}

// AIで返答を生成（会話履歴つき）
async function aiReply(userId: string, text: string): Promise<string> {
  const histKey = 'line_conv:' + userId;
  const history = (await redis.get<Turn[]>(histKey)) ?? [];
  const messages = [...history, { role: 'user' as const, content: text }];

  let answer = 'ありがとうございます！担当者から折り返しご連絡しますね😊';
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: SYSTEM,
      messages,
    });
    answer = res.content.find((b) => b.type === 'text')?.text ?? answer;
  } catch (e) {
    console.error('AI error', e);
  }

  // 履歴を保存（直近10往復に制限）
  const updated = [...messages, { role: 'assistant' as const, content: answer }].slice(-20);
  await redis.set(histKey, JSON.stringify(updated));
  return answer;
}

// LINEサーバーからの本物のリクエストか署名で検証（channel secretでHMAC-SHA256）。
// LINE_CHANNEL_SECRET はLINE Developersの「チャネル基本設定」にある値。未設定なら受信拒否。
async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = process.env.LINE_CHANNEL_SECRET ?? '';
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = Buffer.from(mac).toString('base64');
  return expected === signature;
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!(await verifySignature(raw, req.headers.get('x-line-signature')))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: { events?: any[] } = {};
  try { body = JSON.parse(raw); } catch { /* noop */ }
  const events = body?.events ?? [];

  for (const ev of events) {
    const userId = ev?.source?.userId;
    if (!userId) continue;

    if (ev.type === 'follow') {
      // 友だち追加時のあいさつは LINE公式の「あいさつメッセージ」機能で出す。
      // ここでは userId の登録のみ（webhookからのあいさつ返信はしない＝二重防止）。
      await register(userId);
    } else if (ev.type === 'message' && ev.message?.type === 'text') {
      await register(userId);
      // AIキーがあればAI接客、無ければキーワード自動応答
      const answer = HAS_AI ? await aiReply(userId, ev.message.text) : keywordReply(ev.message.text);
      if (ev.replyToken) await reply(ev.replyToken, answer);
    }
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const list = (await redis.get<LineUser[]>(USERS_KEY)) ?? [];
  return NextResponse.json(list);
}
