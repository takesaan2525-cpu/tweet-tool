import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { getMergedCasts } from '../casts/route';
import { SHOP, FEES, INTERVAL_MIN as SHOP_INTERVAL_MIN } from '../../shop.config';

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
  token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
});

const KEY = 'growup_reservations';
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '';
// 店(受付)のLINE userId。カンマ区切りで複数指定可（お問い合わせLINE＋管理者など全員に届く）。
const STORE_USER_IDS = (process.env.LINE_STORE_USER_ID ?? '').split(',').map((s) => s.trim()).filter(Boolean);

// SMS確認（Xoxzo）。API情報を環境変数に入れると有効化（未設定なら送らない＝安全）。
// 後で中村様のXoxzoアカウントに移管する時は、この環境変数を差し替えるだけ。
const XOXZO_SID = process.env.XOXZO_SID ?? '';
const XOXZO_TOKEN = process.env.XOXZO_TOKEN ?? '';
const XOXZO_SENDER = process.env.XOXZO_SENDER ?? 'Zero'; // 送信者表示（英数字10文字以内 or 数字15桁以内）
const STORE_NAME = process.env.STORE_NAME ?? SHOP.name;
// 予約が埋まっていた時にお客様を誘導する店の電話番号
const STORE_TEL = process.env.STORE_TEL ?? SHOP.tel;
// 指名料（客タイプで変わる。shop.config に集約）
const NOMINATION_FEE = FEES.nomination;        // 指名料（新規）
const REPEAT_NOMINATION_FEE = FEES.repeatNomination; // 本指名料（リピーター）

// "HH:MM" を分に変換（不正なら null）
function toMin(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((t ?? '').trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
// コース文字列から所要分を抽出（"75分"→75 / 取れなければ既定90分）
function courseMinutes(c: string): number {
  const m = /(\d+)/.exec(c ?? '');
  return m ? Number(m[1]) : 90;
}
// 予約の後ろに付ける移動・準備のインターバル（分）。120分予約なら140分後まで埋まり扱い。
const INTERVAL_MIN = SHOP_INTERVAL_MIN;
// 同一キャスト・同一日で時間帯が重なる既存予約があるか（コース＋インターバルで判定・キャンセル/完了は除く）
function hasConflict(list: Reservation[], r: Reservation): boolean {
  const aS = toMin(r.time); if (aS === null) return false;
  const aE = aS + courseMinutes(r.course) + INTERVAL_MIN;
  return list.some((x) => {
    if (x.cast !== r.cast || x.date !== r.date) return false;
    if (x.status === 'キャンセル' || x.status === '完了') return false;
    const bS = toMin(x.time); if (bS === null) return false;
    const bE = bS + courseMinutes(x.course) + INTERVAL_MIN;
    return aS < bE && bS < aE; // コース＋インターバルの時間帯が少しでも重なる
  });
}

// 日本の電話番号を E.164(+81…) に整形。整形できなければ null。
function toE164JP(raw: string): string | null {
  const d = (raw ?? '').replace(/[^\d+]/g, '');
  if (!d) return null;
  if (d.startsWith('+')) return d;
  if (d.startsWith('0')) return '+81' + d.slice(1);
  return null;
}

// 客へ予約受付の確認SMSを送る（業者未設定なら何もしない）
async function sendSms(r: Reservation) {
  if (!XOXZO_SID || !XOXZO_TOKEN) return;
  const to = toE164JP(r.phone);
  if (!to) return;
  const message =
`【${STORE_NAME}】ご予約を受け付けました。
${r.date} ${r.time}〜 / ${r.course}
ご希望キャスト：${r.cast}
内容確認の上、店舗より折り返しご連絡します。`;
  const form = new URLSearchParams({ recipient: to, sender: XOXZO_SENDER, message });
  await fetch('https://api.xoxzo.com/sms/messages/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${XOXZO_SID}:${XOXZO_TOKEN}`).toString('base64'),
    },
    body: form.toString(),
  }).catch(() => {});
}

export type Reservation = {
  id: string; cast: string; date: string; time: string; course: string;
  name: string; phone: string; note: string; status: string; createdAt: string;
  repeat?: number; // 同じ電話番号での過去予約回数（0=新規、1以上=リピーター）
};

// 電話番号を数字だけにして比較用に正規化
const onlyDigits = (s: string) => (s ?? '').replace(/\D/g, '');

async function pushTo(userId: string, text: string) {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
  }).catch(() => {});
}

// 予約1件あたりの通知に顧客の連絡先を含めるのは店(受付)宛のみ。
// broadcastは「友だち全員＝お客様全員」に届いてしまうため使用禁止。

// 新規予約をLINE通知。
// ・本日出勤＆LINE連携済みのキャスト → その子へ直接push
// ・別日/お休み/未連携 → 店(受付)へ通知
async function notify(r: Reservation) {
  if (!TOKEN) return;
  const casts = await getMergedCasts();
  const cast = casts.find((c) => c.name === r.cast);
  const toGirl = cast?.today && cast.lineUserId;

  // リピーター表示（料金・給与に関わるので目立たせる）
  const visit = r.repeat && r.repeat > 0
    ? `🔁 リピーター（${r.repeat + 1}回目・過去${r.repeat}回のご利用）`
    : '🆕 新規のお客様';
  // 指名料（店の通知のみに表示。キャスト本人のLINEには出さない）
  const feeNote = r.repeat && r.repeat > 0
    ? `💰 本指名料 ¥${REPEAT_NOMINATION_FEE.toLocaleString('ja-JP')}（＋コース料金＋交通費）`
    : `💰 指名料 ¥${NOMINATION_FEE.toLocaleString('ja-JP')}（＋コース料金＋交通費）`;

  // 本日出勤＆LINE連携済みなら、そのキャスト本人にも通知
  if (toGirl) {
    const text =
`【あなたに新規予約です🔔】

🗓 ${r.date} ${r.time}〜
⏱ コース：${r.course}
${visit}
🙍 お客様：${r.name}様（${r.phone}）${r.note ? `\n📝 ${r.note}` : ''}

対応できるか確認して、店へ返信してください🙏`;
    await pushTo(cast!.lineUserId!, text);
  }

  // 店(受付/管理者)へは必ずコピーを送る（キャスト連携の有無に関わらず全予約を把握）
  const reason = cast && !cast.today ? '（別日・お休みのキャスト指名）' : toGirl ? '（キャスト本人にも通知済み）' : '';
  const text =
`【新規予約が入りました🔔】${reason}

🗓 ${r.date} ${r.time}〜
💁 ご希望キャスト：${r.cast}
⏱ コース：${r.course}
${visit}
${feeNote}
🙍 お客様：${r.name}様（${r.phone}）${r.note ? `\n📝 ${r.note}` : ''}

確認をお願いします🙏`;
  if (STORE_USER_IDS.length) await Promise.all(STORE_USER_IDS.map((id) => pushTo(id, text)));
  else console.error('LINE_STORE_USER_ID 未設定のため店舗通知を送れませんでした（予約は保存済み）');
}

// 予約POSTの連投防止（同一IP: 10分で5回、全体: 1時間で60回）。SMS/LINE課金の燃焼を防ぐ。
async function rateLimited(req: Request): Promise<boolean> {
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  try {
    const ipKey = `rl:resv:ip:${ip}`;
    const allKey = 'rl:resv:all';
    const [ipN, allN] = await Promise.all([redis.incr(ipKey), redis.incr(allKey)]);
    if (ipN === 1) await redis.expire(ipKey, 600);
    if (allN === 1) await redis.expire(allKey, 3600);
    return ipN > 5 || allN > 60;
  } catch { return false; } // Redis障害時は予約を止めない
}

export async function POST(req: Request) {
  if (await rateLimited(req)) {
    return NextResponse.json({ ok: false, error: '送信が多すぎます。しばらくしてからお試しください' }, { status: 429 });
  }
  const b = await req.json().catch(() => ({}));
  if (!b?.cast || !b?.date || !b?.time || !b?.name) {
    return NextResponse.json({ ok: false, error: '必須項目が足りません' }, { status: 400 });
  }
  const r: Reservation = {
    id: 'r' + Date.now(),
    cast: String(b.cast), date: String(b.date), time: String(b.time),
    course: String(b.course ?? ''), name: String(b.name), phone: String(b.phone ?? ''),
    note: String(b.note ?? ''), status: '新規', createdAt: new Date().toISOString(),
  };
  const list = (await redis.get<Reservation[]>(KEY)) ?? [];
  // 予約が被っていたら保存せず、電話へ誘導（機会損失を電話でひろう）
  if (hasConflict(list, r)) {
    return NextResponse.json(
      { ok: false, conflict: true, tel: STORE_TEL,
        message: 'この時間は埋まりかけています。お急ぎの場合はお電話ください。' },
      { status: 409 },
    );
  }
  // リピーター判定：同じ電話番号での過去予約数（現行リスト＋アーカイブ）を数える
  const arc = (await redis.get<Reservation[]>(KEY + '_archive')) ?? [];
  const myPhone = onlyDigits(r.phone);
  r.repeat = myPhone ? [...list, ...arc].filter((x) => onlyDigits(x.phone) === myPhone).length : 0;

  list.unshift(r);
  // 500件を超えた古い予約は捨てずにアーカイブへ退避（給与・売上集計の元データを守る）
  const overflow = list.slice(500);
  if (overflow.length) {
    await redis.set(KEY + '_archive', JSON.stringify([...overflow, ...arc]));
  }
  await redis.set(KEY, JSON.stringify(list.slice(0, 500)));
  await notify(r);   // 店/キャストへLINE通知
  await sendSms(r);  // 客へ確認SMS（業者設定時のみ）
  return NextResponse.json({ ok: true, id: r.id });
}

export async function GET() {
  const list = (await redis.get<Reservation[]>(KEY)) ?? [];
  return NextResponse.json(list);
}

// 予約を「完了」にしてリストから外す（消さずにアーカイブへ退避＝売上/給与集計の元データは残す）。
// middlewareにより管理者Cookieが無いと届かない（POST以外は保護）。
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  const list = (await redis.get<Reservation[]>(KEY)) ?? [];
  const target = list.find((x) => x.id === id);
  const next = list.filter((x) => x.id !== id);
  if (target) {
    const arc = (await redis.get<Reservation[]>(KEY + '_archive')) ?? [];
    await redis.set(KEY + '_archive', JSON.stringify([{ ...target, status: '完了' }, ...arc]));
  }
  await redis.set(KEY, JSON.stringify(next));
  return NextResponse.json({ ok: true });
}
