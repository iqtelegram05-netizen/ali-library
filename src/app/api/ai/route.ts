import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// ================================================================
//  AI Router — Groq (llama-3.3-70b-versatile)
//  مكتبة openai رسمية — اتصال مباشر وسريع
//  المفتاح: process.env.GROQ_API_KEY
// ================================================================

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const MODEL = 'llama-3.3-70b-versatile';

function getClient(): OpenAI {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY غير موجود في متغيرات Vercel');
  }
  // فحص سريع: مفاتيح Groq تبدأ بـ gsk_
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
    const { action, content, messages } = body;

    let systemPrompt = '';
    let userContent = '';
    let temperature = 0.7;
    let maxTokens = 4096;

    switch (action) {
      case 'thinker':
        systemPrompt = `أنت "المفكر الشيعي AI" - محاور عقائدي وفلسفي متخصص.
خلفيتك:
- إلمام عميق بالفكر الشيعي الإمامي والفلسفة الإسلامية
- معرفة واسعة بالقرآن الكريم والحديث الشريف (من مصادر أهل البيت)
- دراية بالكلام والفلسفة والعرفان الإسلامي
- قدرة على تفكيك الشبهات والرد عليها بالحجة والمنطق
أسلوبك:
- تبدأ بالتحية الإسلامية
- تستشهد بالآيات والأحاديث عند الحاجة
- تحلل المسائل بعمق فكري ووضوح
- تفنّد الشبهات بالدليل والبرهان
- لغتك عربية فصيحة بليغة
- محترم وحكيم في الرد
- تراعي الأدب الإسلامي في الحوار
- استخدم تنسيق Markdown في ردودك: عناوين فرعية، نقاط مرقمة، اقتباسات بالخط العريض، فواصل أفقية عند الحاجة`;
        userContent = typeof content === 'string' ? content : JSON.stringify(content);
        temperature = 0.7;
        break;

      case 'summarize':
        systemPrompt = `أنت ملخص صارم للنصوص الدينية والفكرية.
قاعدة ذهبية: يمنع منعاً باتاً إضافة أي معلومة من عندك.
- التزم حرفياً بما هو مكتوب في النص المرفق فقط
- لا تضف تفسيراً أو شرحاً أو معلومة خارجية إطلاقاً
- لا تضف أي حديث أو آية أو اقتباس غير موجود في النص
- إذا لم يذكر النص معلومة معينة فلا تذكرها أبداً
- استخرج النقاط الرئيسية والمطالب الأساسية فقط
- رتب الأفكار بترتيب منطقي واضح
- احفظ الأحاديث والآيات كما وردت في النص كاملة
- لغتك عربية فصيحة واضحة ومنظمة
- إذا كان النص فارغاً أو قصيراً، قل فقط: النص غير كافٍ للتلخيص
- استخدم Markdown في التلخيص: عناوين فرعية ونقاط مرقمة`;
        userContent = content;
        temperature = 0.3;
        maxTokens = 4000;
        break;

      case 'validate':
        systemPrompt = `أنت مدقق أكاديمي متخصص في البحوث الدينية الإسلامية. مهامك:
1. مراجعة البحث ومقارنته بالمصادر الأصلية
2. تصحيح الأخطاء العلمية والنقلية
3. اقتراح أدلة وقرائن أقوى لتعزيز البحث
4. التحقق من صحة الأحاديث والآيات المذكورة
5. اقتراح تحسينات هيكلية وعلمية
6. الإشارة إلى أي قصور في التوثيق أو الاستدلال
7. تقديم بدائل أكثر قوة للادعاءات الضعيفة
أجب باللغة العربية بطريقة أكاديمية مهنية.
استخدم Markdown لتنظيم الرد: عناوين، نقاط، اقتباسات بالخط العريض، فواصل.`;
        userContent = content;
        temperature = 0.5;
        break;

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
    ];

    if (action === 'thinker' && Array.isArray(messages) && messages.length > 0) {
      apiMessages.push(...messages.map(m => ({ role: m.role, content: m.content })));
    }

    apiMessages.push({ role: 'user', content: userContent });

    // الاستدعاء المباشر — بدون أي انتظار
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
          debug: 'تحقق من متغير GROQ_API_KEY في إعدادات Vercel → Settings → Environment Variables',
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
