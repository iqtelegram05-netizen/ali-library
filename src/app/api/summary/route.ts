import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  نظام الملخص — DeepSeek-V3
//  ملخص صارم يلتزم بالنص حرفياً — لا يضيف أي معلومة خارجية
// ================================================================

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = 'sk-dbbe1b253b454598b3d7a5294701a96a';

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
- إذا كان النص فارغاً أو قصيراً، قل فقط: النص غير كافٍ للتلخيص
- استخدم Markdown: عناوين فرعية ونقاط مرقمة لتنظيم التلخيص`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, url } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: false, error: 'يجب تقديم نص للتلخيص' });
    }

    const userMessage = url
      ? `النص مأخوذ من: ${url}\n\nقم بتلخيص النص التالي:\n\n---\n${text.trim()}\n---`
      : `قم بتلخيص النص التالي:\n\n---\n${text.trim()}\n---`;

    const response = await fetch(DEEPSEEK_BASE, {
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
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Summary API] DeepSeek error:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: `خطأ من DeepSeek API: ${response.status}`,
      });
    }

    const data = await response.json();
    const summary = data?.choices?.[0]?.message?.content || '';

    if (!summary) {
      return NextResponse.json({ success: false, error: 'DeepSeek رد بنتيجة فارغة' });
    }

    return NextResponse.json({
      success: true,
      summary,
      source: url || null,
      originalLength: text.length,
      summaryLength: summary.length,
    });
  } catch (error: any) {
    console.error('[Summary API] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ داخلي' });
  }
}
