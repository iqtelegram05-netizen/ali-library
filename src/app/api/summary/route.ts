import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// ================================================================
//  نظام الأستاذ (الملخص) — Groq (llama-3.3-70b-versatile)
//  اتصال مباشر وسريع بدون أي تأخير
// ================================================================

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const MODEL = 'llama-3.3-70b-versatile';

function getClient(): OpenAI {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY غير موجود في متغيرات Vercel');
  }
  return new OpenAI({ apiKey, baseURL: GROQ_BASE });
}

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

    const client = getClient();

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ] as any,
      temperature: 0.3,
      max_tokens: 2048,
    });

    const summary = response.choices[0]?.message?.content || '';

    if (!summary) {
      return NextResponse.json({ success: false, error: 'Groq رد بنتيجة فارغة' });
    }

    return NextResponse.json({
      success: true,
      summary,
      source: url || null,
      originalLength: text.length,
      summaryLength: summary.length,
    });
  } catch (error: any) {
    console.error('Summary API error:', error.message);
    return NextResponse.json({ success: false, error: error.message });
  }
}
