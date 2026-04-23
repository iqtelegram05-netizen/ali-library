import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ================================================================
//  AI Router — بدون أي قيود أو انتظار
//  المفكر الشيعي + التدقيق + البحث → Gemini (مكتبة رسمية)
//  الأستاذ (الملخص) → DeepSeek
//  إظهار الخطأ الحقيقي من السيرفر
// ================================================================

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';

async function callDeepSeek(apiKey: string, messages: Array<{role: string; content: string}>, temperature: number = 0.3, maxTokens: number = 4000): Promise<string> {
  const res = await fetch(DEEPSEEK_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    const e = await res.text().catch(() => '');
    throw new Error(`DeepSeek HTTP ${res.status}: ${e.slice(0, 500)}`);
  }
  const d = await res.json();
  return d?.choices?.[0]?.message?.content || '';
}

async function callGemini(apiKey: string, systemPrompt: string, userMessage: string, temperature: number = 0.7, maxTokens: number = 4096): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  });
  const result = await model.generateContent(userMessage);
  const response = result.response;
  return response.text();
}

// استخراج وقت إعادة المحاولة من خطأ 429
function extractRetrySeconds(error: any): number {
  const msg = error?.message || String(error);
  // البحث عن "retry in Xs" أو "retryDelay":"Xs"
  const match1 = msg.match(/retry\s+in\s+([\d.]+)s/i);
  if (match1) return Math.ceil(parseFloat(match1[1]));
  const match2 = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/);
  if (match2) return parseInt(match2[1]);
  const match3 = msg.match(/Please retry in ([\d.]+)s/);
  if (match3) return Math.ceil(parseFloat(match3[1]));
  return 15; // افتراضي
}

export async function POST(req: NextRequest) {
  try {
    const DEEPSEEK_API_KEY = (process.env.DEEPSEEK_API_KEY || '').trim();
    const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

    const body = await req.json();
    const { action, content, messages } = body;

    let systemPrompt = '';
    let userContent = '';
    let temperature = 0.3;
    let maxTokens = 4000;

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
- تراعي الأدب الإسلامي في الحوار`;
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
- إذا كان النص فارغاً أو قصيراً، قل فقط: النص غير كافٍ للتلخيص`;
        userContent = content;
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
أجب باللغة العربية بطريقة أكاديمية مهنية.`;
        userContent = content;
        break;

      case 'search':
        systemPrompt = `أنت محرك بحث موضوعي متقدم يعتمد على المنطق والمعنى.
مهامك:
1. فهم القصد الحقيقي من الاستعلام
2. تقديم نتائج بحث متعلقة بالموضوع المطروح
3. ربط المفاهيم المتقاربة والمنهجية
4. اقتراح مصادر ومراجع ذات صلة
5. تنظيم النتائج في تصنيفات واضحة`;
        userContent = content;
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

    // ================================================================
    //  المفكر الشيعي → Gemini فقط (مكتبة رسمية @google/generative-ai)
    // ================================================================
    if (action === 'thinker') {
      if (!GEMINI_API_KEY) {
        return NextResponse.json({ success: false, error: 'GEMINI_API_KEY فارغ أو غير موجود في متغيرات Vercel' });
      }
      try {
        let promptText = userContent;
        if (Array.isArray(messages) && messages.length > 0) {
          const history = messages.map(m => `${m.role === 'user' ? 'المستخدم' : 'المفكر الشيعي'}: ${m.content}`).join('\n\n');
          promptText = `التاريخ الحواري السابق:\n${history}\n\nالسؤال الأخير: ${content}`;
        }
        const result = await callGemini(GEMINI_API_KEY, systemPrompt, promptText, temperature, maxTokens);
        return NextResponse.json({ success: true, result });
      } catch (e: any) {
        const is429 = (e?.message || '').includes('429') || (e?.message || '').includes('quota');
        const retryAfter = is429 ? extractRetrySeconds(e) : 0;
        console.error('Thinker (Gemini) error:', e);
        return NextResponse.json({
          success: false,
          error: is429 ? `وصلت للحصة المجانية. يرجى الانتظار ${retryAfter} ثانية ثم حاول مرة أخرى.` : `خطأ Gemini: ${e.message}`,
          retryAfter,
          quotaExceeded: is429,
        }, { status: 429 });
      }
    }

    // ================================================================
    //  الأستاذ (الملخص) → DeepSeek فقط
    // ================================================================
    if (action === 'summarize') {
      if (!DEEPSEEK_API_KEY) {
        return NextResponse.json({ success: false, error: 'DEEPSEEK_API_KEY فارغ أو غير موجود في متغيرات Vercel' });
      }
      try {
        const result = await callDeepSeek(DEEPSEEK_API_KEY, [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }], temperature, maxTokens);
        return NextResponse.json({ success: true, result });
      } catch (e: any) {
        console.error('Summarize (DeepSeek) error:', e);
        return NextResponse.json({ success: false, error: `خطأ DeepSeek: ${e.message}` });
      }
    }

    // ================================================================
    //  تدقيق البحث + البحث → Gemini (مكتبة رسمية)
    // ================================================================
    if (action === 'validate' || action === 'search') {
      if (!GEMINI_API_KEY) {
        return NextResponse.json({ success: false, error: 'GEMINI_API_KEY فارغ أو غير موجود في متغيرات Vercel' });
      }
      try {
        const result = await callGemini(GEMINI_API_KEY, systemPrompt, userContent, temperature, maxTokens);
        return NextResponse.json({ success: true, result });
      } catch (e: any) {
        const is429 = (e?.message || '').includes('429') || (e?.message || '').includes('quota');
        const retryAfter = is429 ? extractRetrySeconds(e) : 0;
        console.error(`${action} (Gemini) error:`, e);
        return NextResponse.json({
          success: false,
          error: is429 ? `وصلت للحصة المجانية. يرجى الانتظار ${retryAfter} ثانية ثم حاول مرة أخرى.` : `خطأ Gemini: ${e.message}`,
          retryAfter,
          quotaExceeded: is429,
        }, { status: 429 });
      }
    }

    // ================================================================
    //  التصنيف → DeepSeek أولاً ثم Gemini
    // ================================================================
    if (action === 'categorize') {
      if (DEEPSEEK_API_KEY) {
        try {
          const result = await callDeepSeek(DEEPSEEK_API_KEY, [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }], temperature, maxTokens);
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) return NextResponse.json({ success: true, result: JSON.parse(jsonMatch[0]) });
        } catch (e: any) { console.error('categorize DeepSeek:', e); }
      }
      if (GEMINI_API_KEY) {
        try {
          const result = await callGemini(GEMINI_API_KEY, systemPrompt, userContent, temperature, maxTokens);
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) return NextResponse.json({ success: true, result: JSON.parse(jsonMatch[0]) });
        } catch (e: any) { console.error('categorize Gemini:', e); }
      }
      return NextResponse.json({ success: true, result: { category: 'أخرى', confidence: 0.3 } });
    }

    return NextResponse.json({ success: false, error: `طلب غير معروف: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('AI API fatal:', error);
    return NextResponse.json({ success: false, error: `خطأ داخلي: ${error.message}` });
  }
}
