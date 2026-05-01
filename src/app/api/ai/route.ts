import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// ================================================================
//  AI Router — Groq (llama-3.3-70b-versatile)
//  مكتبة openai رسمية — اتصال مباشر وسريع
//  المفتاح: process.env.GROQ_API_KEY
//  الإجراءات المتاحة: search, categorize
// ================================================================

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const MODEL = 'llama-3.3-70b-versatile';

function getClient(): OpenAI {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY غير موجود في متغيرات Vercel');
  }
  if (!apiKey.startsWith('gsk_')) {
    console.warn(`[Groq] تحذير: المفتاح لا يبدأ بـ gsk_ — يبدأ بـ: ${apiKey.substring(0, 7)}...`);
  }
  console.log(`[Groq] المفتاح موجود، الطول: ${apiKey.length} حرف، البداية: ${apiKey.substring(0, 7)}...`);
  return new OpenAI({ apiKey, baseURL: GROQ_BASE });
}

async function callGroq(
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.7,
  maxTokens: number = 4096
): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: messages as any,
    temperature,
    max_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content || '';
}

// ================================================================
//  POST Handler
// ================================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, content } = body;

    let systemPrompt = '';
    let userContent = '';
    let temperature = 0.7;
    let maxTokens = 4096;

    switch (action) {
      case 'search':
        systemPrompt = `أنت محرك بحث موضوعي متقدم يعتمد على المنطق والمعنى.
مهامك:
1. فهم القصد الحقيقي من الاستعلام
2. تقديم نتائج بحث متعلقة بالموضوع المطروح
3. ربط المفاهيم المتقاربة والمنهجية
4. اقتراح مصادر ومراجع ذات صلة
5. تنظيم النتائج في تصنيفات واضحة
استخدم Markdown لتنظيم النتائج بشكل واضح ومنظم.`;
        userContent = content;
        temperature = 0.5;
        break;

      case 'categorize':
        systemPrompt = `أنت مصنّف كتب إسلامية ذكي. صنّف الكتاب التالي إلى أحد الأقسام التالية: تفسير، عقائد، فقه، منطق، فلسفة، تاريخ، أدعية، أخرى.
أجب بصيغة JSON فقط: {"category": "القسم", "confidence": 0.9}`;
        userContent = content;
        temperature = 0.1;
        maxTokens = 100;
        break;

      default:
        return NextResponse.json({ success: false, error: `طلب غير معروف: ${action}` }, { status: 400 });
    }

    // بناء الرسائل
    const apiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    try {
      const result = await callGroq(apiMessages, temperature, maxTokens);

      if (action === 'categorize') {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return NextResponse.json({ success: true, result: JSON.parse(jsonMatch[0]) });
        }
        return NextResponse.json({ success: true, result: { category: 'أخرى', confidence: 0.3 } });
      }

      return NextResponse.json({ success: true, result });
    } catch (e: any) {
      const status = e?.status || e?.statusCode;
      console.error(`[${action}] Groq error [${status}]:`, e.message);

      if (status === 401) {
        return NextResponse.json({
          success: false,
          error: 'مفتاح Groq غير صالح. تأكد أن المفتاح في Vercel يبدأ بـ gsk_ وليس فيه مسافات.',
        });
      }

      if (status === 429) {
        return NextResponse.json({
          success: false,
          error: 'تم تجاوز حد الطلبات. انتظر قليلاً وأعد المحاولة.',
        });
      }

      return NextResponse.json({ success: false, error: e.message });
    }
  } catch (error: any) {
    console.error('AI API fatal:', error);
    return NextResponse.json({ success: false, error: `خطأ داخلي: ${error.message}` });
  }
}
