import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  نظام الملخص — DeepSeek-V3 للتلخيص الدقيق
//  يُلخِّص محتوى الكتب بناءً على النص المزود فقط
//  يمنع إضافة أي معلومة خارجية
//  مع z-ai-web-dev-sdk كاحتياطي مضمون
// ================================================================

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `أنت مساعد في مكتبة العلي الرقمية. وظيفتك التلخيص فقط بناءً على النص المزود إليك أدناه. يمنع منعاً باتاً إضافة أي معلومة خارجية أو تاريخية ليست موجودة في النص المرفق. إذا لم تجد الإجابة في النص، قل: المعلومات غير متوفرة في هذا المصدر.`;

/**
 * استدعاء DeepSeek-V3 API
 */
async function callDeepSeek(userMessage: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) throw new Error('مفتاح DeepSeek غير مضبوط');

  const res = await fetch(DEEPSEEK_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`DeepSeek API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('لم يتم الحصول على رد من DeepSeek');
  return text;
}

/**
 * استدعاء عبر z-ai-web-dev-sdk (احتياطي مضمون)
 */
async function callZAI(userMessage: string): Promise<string> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });
    const text = completion?.choices?.[0]?.message?.content;
    if (!text) throw new Error('لم يتم الحصول على رد');
    return text;
  } catch (e: any) {
    throw new Error(`z-ai-web-dev-sdk error: ${e.message}`);
  }
}

// === MAIN HANDLER ===
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, url } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'يجب تقديم نص للتلخيص' },
        { status: 400 }
      );
    }

    if (text.trim().length < 50) {
      return NextResponse.json(
        { error: 'النص قصير جداً — يرجى توفير محتوى كافٍ للتلخيص (50 حرف على الأقل)' },
        { status: 400 }
      );
    }

    // Build prompt
    let userMessage = `قم بتلخيص النص التالي بشكل مختصر ومنظم:\n\n---\n${text.trim()}\n---`;

    // If URL is provided, add context
    if (url) {
      userMessage = `النص التالي مأخوذ من المصدر: ${url}\n\nقم بتلخيص النص التالي بشكل مختصر ومنظم:\n\n---\n${text.trim()}\n---`;
    }

    // Try DeepSeek first, then z-ai-web-dev-sdk
    let summary = '';
    if (DEEPSEEK_API_KEY) {
      try {
        summary = await callDeepSeek(userMessage);
      } catch (e: any) {
        console.warn('DeepSeek summary failed, falling back to z-ai-web-dev-sdk:', e.message);
      }
    }

    if (!summary) {
      summary = await callZAI(userMessage);
    }

    return NextResponse.json({
      success: true,
      summary,
      source: url || null,
      originalLength: text.length,
      summaryLength: summary.length,
    });

  } catch (error: any) {
    console.error('Summary API Error:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ في معالجة الطلب' },
      { status: 500 }
    );
  }
}
