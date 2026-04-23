import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  AI Router — نظام التدوير الذكي (Key Rotation)
//  3 مفاتيح DeepSeek تعمل بالتناوب مع انتقال تلقائي عند الفشل
//  بدون أي انتظار أو تأخير — اتصال مباشر وسريع
// ================================================================

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// مؤشر التدوير — يتغير مع كل طلب تلقائياً
let keyIndex = 0;

// جلب مصفوفة المفاتيح من Vercel Env
function getKeys(): string[] {
  const k1 = (process.env.DEEPSEEK_KEY_1 || '').trim();
  const k2 = (process.env.DEEPSEEK_KEY_2 || '').trim();
  const k3 = (process.env.DEEPSEEK_KEY_3 || '').trim();
  return [k1, k2, k3].filter(k => k.length > 0);
}

// اختيار المفتاح التالي بالتناوب (Round-Robin)
function getNextKey(): string | null {
  const keys = getKeys();
  if (keys.length === 0) return null;
  keyIndex = keyIndex % keys.length;
  const key = keys[keyIndex];
  keyIndex++;
  return key;
}

// استدعاء DeepSeek بمفتاح محدد
async function callDeepSeekWithKey(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.7,
  maxTokens: number = 4096
): Promise<string> {
  const res = await fetch(DEEPSEEK_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`DeepSeek HTTP ${res.status}: ${errorBody.slice(0, 500)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

// استدعاء ذكي مع تدوير المفاتيح — ينتقل للمفتاح التالي تلقائياً عند الفشل
async function callDeepSeekSmart(
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.7,
  maxTokens: number = 4096
): Promise<{ result: string; keyUsed: string }> {
  const keys = getKeys();
  if (keys.length === 0) {
    throw new Error('لا توجد مفاتيح DeepSeek. تأكد من إضافة DEEPSEEK_KEY_1 في متغيرات Vercel');
  }

  // حفظ مؤشر البداية لمنع الحلقة اللانهائية
  const startIndex = keyIndex % keys.length;
  let currentKey = getNextKey();
  let attempts = 0;

  while (attempts < keys.length) {
    try {
      const result = await callDeepSeekWithKey(currentKey!, messages, temperature, maxTokens);
      return { result, keyUsed: `KEY_${(keyIndex + attempts) % keys.length + 1}` };
    } catch (error: any) {
      const errMsg = error?.message || '';
      console.error(`[Key Rotation] المفتاح ${(keyIndex + attempts) % keys.length + 1} فشل: ${errMsg.slice(0, 200)}`);

      // إذا كان الخطأ 401 (مفتاح غير صالح) أو 429 (تجاوز الحصة)، انتقل للمفتاح التالي
      if (errMsg.includes('401') || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('rate')) {
        currentKey = getNextKey();
        attempts++;
        if (attempts < keys.length) {
          console.log(`[Key Rotation] الانتقال للمفتاح التالي... (محاولة ${attempts + 1}/${keys.length})`);
        }
      } else {
        // أخطاء أخرى (شبكة، timeout) — أعد المحاولة بالمفتاح التالي أيضاً
        currentKey = getNextKey();
        attempts++;
        if (attempts < keys.length) {
          console.log(`[Key Rotation] خطأ شبكة، الانتقال للمفتاح التالي... (محاولة ${attempts + 1}/${keys.length})`);
        }
      }
    }
  }

  throw new Error(`جميع المفاتيح (${keys.length}) فشلت. حاول لاحقاً.`);
}

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

    // ================================================================
    //  بناء الرسائل
    // ================================================================
    const apiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // إضافة التاريخ الحواري للمفكر الشيعي
    if (action === 'thinker' && Array.isArray(messages) && messages.length > 0) {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      apiMessages.push(...history);
    }

    apiMessages.push({ role: 'user', content: userContent });

    // ================================================================
    //  الاستدعاء الذكي مع التدوير
    // ================================================================
    try {
      const { result, keyUsed } = await callDeepSeekSmart(apiMessages, temperature, maxTokens);

      if (action === 'categorize') {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return NextResponse.json({
            success: true,
            result: JSON.parse(jsonMatch[0]),
            keyUsed,
          });
        }
        return NextResponse.json({ success: true, result: { category: 'أخرى', confidence: 0.3 }, keyUsed });
      }

      return NextResponse.json({ success: true, result, keyUsed });
    } catch (e: any) {
      console.error(`[${action}] جميع المفاتيح فشلت:`, e.message);
      return NextResponse.json({
        success: false,
        error: e.message,
      });
    }
  } catch (error: any) {
    console.error('AI API fatal:', error);
    return NextResponse.json({ success: false, error: `خطأ داخلي: ${error.message}` });
  }
}
