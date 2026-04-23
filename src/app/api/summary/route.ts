import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  نظام الملخص — DeepSeek مباشرة
// ================================================================

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `أنت مساعد في مكتبة العلي الرقمية. وظيفتك التلخيص فقط بناءً على النص المزود إليك أدناه. يمنع منعاً باتاً إضافة أي معلومة خارجية أو تاريخية ليست موجودة في النص المرفق. إذا لم تجد الإجابة في النص، قل: المعلومات غير متوفرة في هذا المصدر.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, url } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'يجب تقديم نص للتلخيص' }, { status: 400 });
    }
    if (text.trim().length < 50) {
      return NextResponse.json({ error: 'النص قصير جداً' }, { status: 400 });
    }

    let userMessage = `قم بتلخيص النص التالي بشكل مختصر ومنظم:\n\n---\n${text.trim()}\n---`;
    if (url) userMessage = `النص مأخوذ من: ${url}\n\n${userMessage}`;

    // DeepSeek مباشرة
    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: 'مفتاح DeepSeek غير مضبوط. أضف DEEPSEEK_API_KEY في متغيرات البيئة.' }, { status: 500 });
    }

    const res = await fetch(DEEPSEEK_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMessage }], temperature: 0.3, max_tokens: 2048 }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) { const e = await res.text().catch(() => ''); return NextResponse.json({ error: `DeepSeek error ${res.status}: ${e.slice(0, 200)}` }, { status: 500 }); }
    const d = await res.json();
    const summary = d?.choices?.[0]?.message?.content || '';

    return NextResponse.json({ success: true, summary, source: url || null, originalLength: text.length, summaryLength: summary.length });
  } catch (error: any) {
    console.error('Summary API Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ' }, { status: 500 });
  }
}
