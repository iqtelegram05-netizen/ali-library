import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  نظام الأستاذ (الملخص) — DeepSeek فقط
//  بدون z-ai-web-dev-sdk — مفتاح Vercel فقط
//  حد أقصى: طلب واحد كل 3 ثوانٍ
// ================================================================

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';

// === حد أقصى طلب واحد كل 3 ثوانٍ ===
const lastRequest: Record<string, number> = {};
const COOLDOWN_MS = 3000;

const SYSTEM_PROMPT = `أنت ملخص صارم للنصوص الدينية والفكرية.
قاعدة ذهبية: يمنع منعاً باتاً إضافة أي معلومة من عندك.
- التزم حرفياً بما هو مكتوب في النص المرفق فقط
- لا تضف تفسيراً أو شرحاً أو معلومة خارجية إطلاقاً
- لا تضف أي حديث أو آية أو اقتباس غير موجود في النص
- إذا لم يذكر النص معلومة معينة فلا تذكرها أبداً
- استخرج النقاط الرئيسية والمطالب الأساسية فقط
- رتب الأفكار بترتيب منطقي واضح
- احفظ الأحاديث والآيات كما وردت في النص كاملة بدون زيادة أو نقصان
- لغتك عربية فصيحة واضحة ومنظمة
- إذا كان النص فارغاً أو قصيراً، قل فقط: النص غير كافٍ للتلخيص`;

export async function POST(req: NextRequest) {
  try {
    const DEEPSEEK_API_KEY = (process.env.DEEPSEEK_API_KEY || '').trim();

    const body = await req.json();
    const { text, url } = body;

    // === منع الطلبات الفارغة ===
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'يرجى كتابة نص أو رفع ملف قبل التلخيص' }, { status: 400 });
    }
    if (text.trim().length < 50) {
      return NextResponse.json({ error: 'النص قصير جداً. الصق نصاً أطول لكي يتم تلخيصه.' }, { status: 400 });
    }

    // === فاصل زمني 3 ثوانٍ ===
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'global';
    const now = Date.now();
    const last = lastRequest[`summary:${ip}`] || 0;
    if (now - last < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
      return NextResponse.json({ error: `يرجى المحاولة بعد ${waitSec} ثوانٍ، النظام قيد المعالجة`, cooldown: true }, { status: 429 });
    }
    lastRequest[`summary:${ip}`] = now;

    // === التحقق من مفتاح DeepSeek ===
    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: 'مفتاح DeepSeek غير مضبوط. أضف DEEPSEEK_API_KEY في إعدادات Vercel.' }, { status: 500 });
    }

    const userMessage = `قم بتلخيص النص التالي بشكل مختصر ومنظم:\n\n---\n${text.trim()}\n---`;
    const finalMessage = url ? `النص مأخوذ من: ${url}\n\n${userMessage}` : userMessage;

    const res = await fetch(DEEPSEEK_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: finalMessage }],
        temperature: 0.3,
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (res.status === 429) {
      return NextResponse.json({ error: 'يرجى المحاولة بعد لحظات، النظام قيد المعالجة', cooldown: true }, { status: 429 });
    }
    if (!res.ok) {
      console.error('DeepSeek summary error:', res.status);
      return NextResponse.json({ error: 'يرجى المحاولة بعد لحظات، النظام قيد المعالجة' }, { status: 500 });
    }

    const d = await res.json();
    const summary = d?.choices?.[0]?.message?.content || '';

    if (!summary) {
      return NextResponse.json({ error: 'يرجى المحاولة بعد لحظات، النظام قيد المعالجة' }, { status: 500 });
    }

    return NextResponse.json({ success: true, summary, source: url || null, originalLength: text.length, summaryLength: summary.length });
  } catch (error: any) {
    console.error('Summary API Error:', error);
    return NextResponse.json({ error: 'يرجى المحاولة بعد لحظات، النظام قيد المعالجة' }, { status: 500 });
  }
}
