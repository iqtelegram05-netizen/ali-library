import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// ================================================================
//  نظام الأستاذ (الملخص) — DeepSeek + مكتبة openai + تدوير المفاتيح
//  اتصال مباشر وسريع بدون أي تأخير
// ================================================================

const DEEPSEEK_BASE = 'https://api.deepseek.com';
const MODEL = 'deepseek-chat';

let keyIdx = 0;

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

  for (const item of raw) {
    if (!item.key) {
      console.warn(`[Summary Key Debug] المفتاح ${item.label} غير موجود في إعدادات Vercel`);
    } else {
      console.log(`[Summary Key Debug] ${item.label} موجود (${item.key.slice(0, 8)}...${item.key.slice(-4)})`);
    }
  }

  return raw.filter(item => item.key.length > 0);
}

function createClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: DEEPSEEK_BASE,
  });
}

async function callWithKey(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.3,
  maxTokens: number = 2048
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

async function callSmart(
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.3,
  maxTokens: number = 2048
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
      console.log(`[Summary Rotation] تجربة ${current.label} (محاولة ${attempts + 1}/${totalKeys})`);
      const result = await callWithKey(current.key, messages, temperature, maxTokens);
      keyIdx = (keyIdx + attempts + 1) % totalKeys;
      console.log(`[Summary Rotation] نجاح عبر ${current.label}`);
      return { result, keyLabel: current.label };
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error(`[Summary Rotation] ${current.label} فشل: ${msg.slice(0, 300)}`);

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
        console.log(`[Summary Rotation] الانتقال للمفتاح التالي...`);
        attempts++;
      } else if (attempts < totalKeys - 1) {
        console.log(`[Summary Rotation] خطأ غير متوقع، تجربة المفتاح التالي...`);
        attempts++;
      } else {
        throw new Error(`${current.label} فشل: ${msg.slice(0, 200)}`);
      }
    }
  }

  throw new Error('جميع المفاتيح فشلت.');
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
      const { result, keyLabel } = await callSmart(apiMessages, 0.3, 2048);

      if (!result) {
        return NextResponse.json({ success: false, error: 'DeepSeek رد بنتيجة فارغة' });
      }

      return NextResponse.json({
        success: true,
        summary: result,
        source: url || null,
        originalLength: text.length,
        summaryLength: result.length,
        keyLabel,
      });
    } catch (e: any) {
      console.error('Summary all keys failed:', e.message);
      return NextResponse.json({ success: false, error: e.message });
    }
  } catch (error: any) {
    console.error('Summary API fatal:', error);
    return NextResponse.json({ success: false, error: `خطأ داخلي: ${error.message}` });
  }
}
