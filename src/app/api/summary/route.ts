import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  نظام الأستاذ (الملخص) — DeepSeek مع تدوير المفاتيح
//  اتصال مباشر وسريع بدون أي تأخير
// ================================================================

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

let keyIndex = 0;

function getKeys(): string[] {
  const k1 = (process.env.DEEPSEEK_KEY_1 || '').trim();
  const k2 = (process.env.DEEPSEEK_KEY_2 || '').trim();
  const k3 = (process.env.DEEPSEEK_KEY_3 || '').trim();
  return [k1, k2, k3].filter(k => k.length > 0);
}

function getNextKey(): string | null {
  const keys = getKeys();
  if (keys.length === 0) return null;
  keyIndex = keyIndex % keys.length;
  const key = keys[keyIndex];
  keyIndex++;
  return key;
}

async function callDeepSeekWithKey(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.3,
  maxTokens: number = 2048
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
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`DeepSeek HTTP ${res.status}: ${errorBody.slice(0, 500)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callDeepSeekSmart(
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.3,
  maxTokens: number = 2048
): Promise<{ result: string; keyUsed: string }> {
  const keys = getKeys();
  if (keys.length === 0) {
    throw new Error('لا توجد مفاتيح DeepSeek. تأكد من إضافة DEEPSEEK_KEY_1 في متغيرات Vercel');
  }

  const startIndex = keyIndex % keys.length;
  let currentKey = getNextKey();
  let attempts = 0;

  while (attempts < keys.length) {
    try {
      const result = await callDeepSeekWithKey(currentKey!, messages, temperature, maxTokens);
      return { result, keyUsed: `KEY_${(keyIndex + attempts) % keys.length + 1}` };
    } catch (error: any) {
      const errMsg = error?.message || '';
      console.error(`[Summary Key Rotation] المفتاح ${(keyIndex + attempts) % keys.length + 1} فشل: ${errMsg.slice(0, 200)}`);

      currentKey = getNextKey();
      attempts++;
      if (attempts < keys.length) {
        console.log(`[Summary Key Rotation] الانتقال للمفتاح التالي... (محاولة ${attempts + 1}/${keys.length})`);
      }
    }
  }

  throw new Error(`جميع المفاتيح (${keys.length}) فشلت. حاول لاحقاً.`);
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
- إذا كان النص فارغاً أو قصيراً، قل فقط: النص غير كافٍ للتلخيص`;

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

    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ];

    try {
      const { result, keyUsed } = await callDeepSeekSmart(apiMessages, 0.3, 2048);

      if (!result) {
        return NextResponse.json({ success: false, error: 'DeepSeek رد بنتيجة فارغة' });
      }

      return NextResponse.json({
        success: true,
        summary: result,
        source: url || null,
        originalLength: text.length,
        summaryLength: result.length,
        keyUsed,
      });
    } catch (e: any) {
      console.error('Summary API all keys failed:', e.message);
      return NextResponse.json({ success: false, error: e.message });
    }
  } catch (error: any) {
    console.error('Summary API fatal:', error);
    return NextResponse.json({ success: false, error: `خطأ داخلي: ${error.message}` });
  }
}
