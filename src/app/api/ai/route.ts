import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// ================================================================
//  AI Router — نظام التدوير الذكي (Key Rotation)
//  مكتبة openai رسمية ↔ DeepSeek
//  3 مفاتيح: DEEPSEEK_KEY_1 / DEEPSEEK_KEY_2 / DEEPSEEK_KEY_3
//  انتقال تلقائي عند: 401 / 402 / 429 / timeout
// ================================================================

const DEEPSEEK_BASE = 'https://api.deepseek.com';
const MODEL = 'deepseek-chat';

// مؤشر التدوير
let keyIdx = 0;

// ---------------------------------------------------------------
//  جلب مصفوفة المفاتيح من Vercel + Debug
// ---------------------------------------------------------------
function getKeys(): { key: string; label: string }[] {
  const env = process.env;

  const k1 = (env.DEEPSEEK_KEY_1 || '').trim();
  const k2 = (env.DEEPSEEK_KEY_2 || '').trim();
  const k3 = (env.DEEPSEEK_KEY_3 || '').trim();

  const raw: { key: string; label: string }[] = [
    { key: k1, label: 'DEEPSEEK_KEY_1' },
    { key: k2, label: 'DEEPSEEK_KEY_2' },
    { key: k3, label: 'DEEPSEEK_KEY_3' },
  ];

  // Debug: طباعة حالة كل مفتاح
  for (const item of raw) {
    if (!item.key) {
      console.warn(`[Key Debug] المفتاح ${item.label} غير موجود في إعدادات Vercel`);
    } else {
      console.log(`[Key Debug] ${item.label} موجود (${item.key.slice(0, 8)}...${item.key.slice(-4)})`);
    }
  }

  const valid = raw.filter(item => item.key.length > 0);
  if (valid.length === 0) {
    console.error('[Key Debug] لا يوجد أي مفتاح DeepSeek صالح في متغيرات Vercel!');
  }

  return valid;
}

// ---------------------------------------------------------------
//  إنشاء عميل OpenAI مرتبط بمفتاح معين
// ---------------------------------------------------------------
function createClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: DEEPSEEK_BASE,
  });
}

// ---------------------------------------------------------------
//  استدعاء DeepSeek بمفتاح واحد
// ---------------------------------------------------------------
async function callWithKey(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.7,
  maxTokens: number = 4096
): Promise<string> {
  const client = createClient(apiKey);

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: messages as any,
    temperature,
    max_tokens: maxTokens,
  });

  return response.choices[0]?.message?.content || '';
}

// ---------------------------------------------------------------
//  استدعاء ذكي مع تدوير تلقائي
// ---------------------------------------------------------------
async function callSmart(
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.7,
  maxTokens: number = 4096
): Promise<{ result: string; keyLabel: string }> {
  const keys = getKeys();

  if (keys.length === 0) {
    throw new Error('لا توجد مفاتيح DeepSeek. أضف DEEPSEEK_KEY_1 في متغيرات Vercel.');
  }

  const totalKeys = keys.length;
  let attempts = 0;

  while (attempts < totalKeys) {
    const current = keys[(keyIdx + attempts) % totalKeys];
    try {
      console.log(`[Key Rotation] تجربة ${current.label} (محاولة ${attempts + 1}/${totalKeys})`);
      const result = await callWithKey(current.key, messages, temperature, maxTokens);
      keyIdx = (keyIdx + attempts + 1) % totalKeys; // تحريك المؤشر
      console.log(`[Key Rotation] نجاح عبر ${current.label}`);
      return { result, keyLabel: current.label };
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error(`[Key Rotation] ${current.label} فشل: ${msg.slice(0, 300)}`);

      // فحص نوع الخطأ: هل ننتقل للمفتاح التالي؟
      const isRetryable =
        msg.includes('401') ||
        msg.includes('402') ||
        msg.includes('Insufficient') ||
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('rate') ||
        msg.includes('timeout') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('fetch failed');

      if (isRetryable && attempts < totalKeys - 1) {
        console.log(`[Key Rotation] الانتقال للمفتاح التالي...`);
        attempts++;
      } else if (attempts < totalKeys - 1) {
        // أخطاء غير معروفة — نحاول المفتاح التالي أيضاً
        console.log(`[Key Rotation] خطأ غير متوقع، تجربة المفتاح التالي...`);
        attempts++;
      } else {
        // آخر مفتاح فشل
        throw new Error(`${current.label} فشل: ${msg.slice(0, 200)}`);
      }
    }
  }

  throw new Error('جميع المفاتيح فشلت.');
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
أجب باللغة العربية بطريقة أكاديمية مهنية.`;
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
5. تنظيم النتائج في تصنيفات واضحة`;
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

    // الاستدعاء الذكي مع التدوير
    try {
      const { result, keyLabel } = await callSmart(apiMessages, temperature, maxTokens);

      if (action === 'categorize') {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return NextResponse.json({ success: true, result: JSON.parse(jsonMatch[0]), keyLabel });
        }
        return NextResponse.json({ success: true, result: { category: 'أخرى', confidence: 0.3 }, keyLabel });
      }

      return NextResponse.json({ success: true, result, keyLabel });
    } catch (e: any) {
      console.error(`[${action}] فشل النهائي:`, e.message);
      return NextResponse.json({ success: false, error: e.message });
    }
  } catch (error: any) {
    console.error('AI API fatal:', error);
    return NextResponse.json({ success: false, error: `خطأ داخلي: ${error.message}` });
  }
}
