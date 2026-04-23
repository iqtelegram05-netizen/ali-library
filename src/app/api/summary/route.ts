import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  نظام الأستاذ (الملخص) — DeepSeek فقط — بدون قيود
// ================================================================

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';

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

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: false, error: 'يجب تقديم نص للتلخيص' });
    }

    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json({ success: false, error: 'DEEPSEEK_API_KEY فارغ أو غير موجود في متغيرات Vercel' });
    }

    const userMessage = url
      ? `النص مأخوذ من: ${url}\n\nقم بتلخيص النص التالي:\n\n---\n${text.trim()}\n---`
      : `قم بتلخيص النص التالي:\n\n---\n${text.trim()}\n---`;

    const res = await fetch(DEEPSEEK_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMessage }],
        temperature: 0.3,
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      console.error('DeepSeek summary error:', res.status, errorBody);
      return NextResponse.json({ success: false, error: `خطأ DeepSeek HTTP ${res.status}: ${errorBody.slice(0, 500)}` });
    }

    const d = await res.json();
    const summary = d?.choices?.[0]?.message?.content || '';

    if (!summary) {
      return NextResponse.json({ success: false, error: 'DeepSeek رد بنتيجة فارغة' });
    }

    return NextResponse.json({ success: true, summary, source: url || null, originalLength: text.length, summaryLength: summary.length });
  } catch (error: any) {
    console.error('Summary API fatal:', error);
    return NextResponse.json({ success: false, error: `خطأ داخلي: ${error.message}` });
  }
}
