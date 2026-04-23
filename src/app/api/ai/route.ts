import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  AI Router — يعمل مباشرة مع DeepSeek و Gemini
//  مع z-ai-web-dev-sdk كاحتياطي مضمون
// ================================================================

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

/**
 * استدعاء DeepSeek-V3
 */
async function callDeepSeek(messages: Array<{role: string; content: string}>, temperature: number = 0.3, maxTokens: number = 4000): Promise<string> {
  if (!DEEPSEEK_API_KEY) throw new Error('مفتاح DeepSeek غير مضبوط');
  
  const res = await fetch(DEEPSEEK_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`DeepSeek API error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('لم يتم الحصول على رد من DeepSeek');
  return text;
}

/**
 * استدعاء Gemini 1.5 Pro
 */
async function callGemini(systemPrompt: string, userMessage: string, temperature: number = 0.7, maxTokens: number = 4096): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('مفتاح Gemini غير مضبوط');

  const res = await fetch(`${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('لم يتم الحصول على رد من Gemini');
  return text;
}

/**
 * استدعاء عبر z-ai-web-dev-sdk (احتياطي مضمون)
 */
async function callZAI(messages: Array<{role: string; content: string}>, temperature: number = 0.7, maxTokens: number = 4000): Promise<string> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      temperature,
      max_tokens: maxTokens,
    });
    const text = completion?.choices?.[0]?.message?.content;
    if (!text) throw new Error('لم يتم الحصول على رد من z-ai-web-dev-sdk');
    return text;
  } catch (e: any) {
    throw new Error(`z-ai-web-dev-sdk error: ${e.message}`);
  }
}

/**
 * استدعاء ذكي — يحاول DeepSeek أولاً ثم Gemini ثم z-ai-web-dev-sdk
 */
async function callAI(systemPrompt: string, userMessage: string, temperature: number = 0.7, maxTokens: number = 4000): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  // محاولة DeepSeek أولاً
  if (DEEPSEEK_API_KEY) {
    try {
      return await callDeepSeek(messages, temperature, maxTokens);
    } catch (e: any) {
      console.warn('DeepSeek failed, trying Gemini:', e.message);
    }
  }
  // محاولة Gemini ثانياً
  if (GEMINI_API_KEY) {
    try {
      return await callGemini(systemPrompt, userMessage, temperature, maxTokens);
    } catch (e: any) {
      console.warn('Gemini failed, trying z-ai-web-dev-sdk:', e.message);
    }
  }
  // محاولة z-ai-web-dev-sdk كاحتياطي مضمون
  try {
    return await callZAI(messages, temperature, maxTokens);
  } catch (e: any) {
    console.warn('z-ai-web-dev-sdk failed:', e.message);
  }

  throw new Error('فشل في الاتصال بخدمات الذكاء الاصطناعي. تأكد من ضبط مفاتيح API.');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, content, messages } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    let systemPrompt = '';
    let userContent = '';
    let temperature = 0.3;
    let maxTokens = 4000;

    switch (action) {
      case 'summarize':
        systemPrompt = `أنت أستاذ متخصص في التلخيص الأكاديمي. تلخص النصوص الدينية والفكرية بدقة عالية.
قواعدك:
1. استخرج النقاط الرئيسية والمطالب الأساسية فقط
2. حافظ على المعنى الأصلي دون تحريف
3. رتب الأفكار منطقياً
4. استخدم لغة عربية فصيحة واضحة
5. اذكر الأدلة والشواهد المهمة
6. إذا كان النص يحتوي على أحاديث أو آيات، احفظها كاملة
النص المراد تلخيصه:`;
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
أجب باللغة العربية بطريقة أكاديمية مهنية.

البحث المراد تدقيقه:`;
        userContent = content;
        break;

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

      case 'search':
        systemPrompt = `أنت محرك بحث موضوعي متقدم يعتمد على المنطق والمعنى وليس مجرد الكلمات.
مهامك:
1. فهم القصد الحقيقي من الاستعلام
2. تقديم نتائج بحث متعلقة بالموضوع المطروح
3. ربط المفاهيم المتقاربة والمنهجية
4. اقتراح مصادر ومراجع ذات صلة
5. تنظيم النتائج في تصنيفات واضحة
أجب باللغة العربية وبشكل منظم وبحثي علمي.

استعلام البحث:`;
        userContent = content;
        break;

      case 'categorize':
        systemPrompt = `أنت مصنّف كتب إسلامية ذكي. صنّف الكتاب التالي إلى أحد الأقسام التالية: تفسير، عقائد، فقه، منطق، فلسفة، تاريخ، أدعية، أخرى.
أجب بصيغة JSON فقط: {"category": "القسم", "confidence": 0.9}
اسم الكتاب:`;
        userContent = content;
        temperature = 0.1;
        maxTokens = 100;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // للمفكر: استخدام سجل المحادثة
    if (action === 'thinker' && Array.isArray(messages) && messages.length > 0) {
      const apiMessages: Array<{role: string; content: string}> = [
        { role: 'system', content: systemPrompt }
      ];
      messages.forEach((msg: {role: string; content: string}) => {
        apiMessages.push({ role: msg.role, content: msg.content });
      });

      // محاولة DeepSeek أولاً (يدعم رسائل متعددة)
      if (DEEPSEEK_API_KEY) {
        try {
          const result = await callDeepSeek(apiMessages, temperature, maxTokens);
          return NextResponse.json({ success: true, result });
        } catch (e: any) {
          console.warn('DeepSeek thinker failed, trying Gemini:', e.message);
        }
      }

      // Gemini — تحويل السجل إلى رسالة واحدة
      if (GEMINI_API_KEY) {
        try {
          const conversationHistory = messages.map(m => `${m.role === 'user' ? 'المستخدم' : 'المفكر الشيعي'}: ${m.content}`).join('\n\n');
          const userMessage = `التاريخ الحواري السابق:\n${conversationHistory}\n\nالسؤال الأخير: ${content}`;
          const result = await callGemini(systemPrompt, userMessage, temperature, maxTokens);
          return NextResponse.json({ success: true, result });
        } catch (e: any) {
          console.warn('Gemini thinker failed, trying z-ai-web-dev-sdk:', e.message);
        }
      }

      // z-ai-web-dev-sdk كاحتياطي (يدعم سجل المحادثة)
      try {
        const result = await callZAI(apiMessages, temperature, maxTokens);
        return NextResponse.json({ success: true, result });
      } catch (e: any) {
        console.warn('z-ai-web-dev-sdk thinker failed:', e.message);
      }

      return NextResponse.json({ error: 'فشل في الاتصال بخدمات الذكاء الاصطناعي' }, { status: 500 });
    }

    // باقي الأقسام
    const result = await callAI(systemPrompt, userContent, temperature, maxTokens);

    // معالجة خاصة لتصنيف الكتب
    if (action === 'categorize') {
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ success: true, result: parsed });
        }
      } catch {
        return NextResponse.json({ success: true, result: { category: 'أخرى', confidence: 0.3 } });
      }
    }

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error('AI API Error:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ في معالجة الطلب' },
      { status: 500 }
    );
  }
}
