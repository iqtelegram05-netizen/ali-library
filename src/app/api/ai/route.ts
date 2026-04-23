import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  AI Router
//  المفكر الشيعي → Gemini فقط
//  الأستاذ/التدقيق/البحث → DeepSeek فقط
//  بدون z-ai-web-dev-sdk — مفاتيح Vercel فقط
//  حد أقصى: طلب واحد كل 3 ثوانٍ لمنع 429
// ================================================================

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// === حد أقصى طلب واحد كل 3 ثوانٍ ===
const lastRequest: Record<string, number> = {};
const COOLDOWN_MS = 3000;

function checkCooldown(identifier: string): string | null {
  const now = Date.now();
  const last = lastRequest[identifier] || 0;
  if (now - last < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    return `يرجى المحاولة بعد ${waitSec} ثوانٍ، النظام قيد المعالجة`;
  }
  lastRequest[identifier] = now;
  return null;
}

async function callDeepSeek(apiKey: string, messages: Array<{role: string; content: string}>, temperature: number = 0.3, maxTokens: number = 4000): Promise<string> {
  const res = await fetch(DEEPSEEK_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(90000),
  });
  if (res.status === 429) throw new Error('يرجى المحاولة بعد لحظات، النظام قيد المعالجة');
  if (!res.ok) {
    const e = await res.text().catch(() => '');
    console.error('DeepSeek error:', res.status, e.slice(0, 200));
    throw new Error('يرجى المحاولة بعد لحظات، النظام قيد المعالجة');
  }
  const d = await res.json();
  return d?.choices?.[0]?.message?.content || '';
}

async function callGemini(apiKey: string, systemPrompt: string, userMessage: string, temperature: number = 0.7, maxTokens: number = 4096): Promise<string> {
  const res = await fetch(`${GEMINI_BASE_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (res.status === 429) throw new Error('يرجى المحاولة بعد لحظات، النظام قيد المعالجة');
  if (!res.ok) {
    const e = await res.text().catch(() => '');
    console.error('Gemini error:', res.status, e.slice(0, 200));
    throw new Error('يرجى المحاولة بعد لحظات، النظام قيد المعالجة');
  }
  const d = await res.json();
  return d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function POST(req: NextRequest) {
  try {
    const DEEPSEEK_API_KEY = (process.env.DEEPSEEK_API_KEY || '').trim();
    const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

    const body = await req.json();
    const { action, content, messages } = body;
    if (!action) return NextResponse.json({ error: 'يرجى المحاولة بعد لحظات، النظام قيد المعالجة' }, { status: 400 });

    // === منع الطلبات الفارغة ===
    const userText = (typeof content === 'string' ? content : '').trim();
    if (!userText && action !== 'categorize') {
      return NextResponse.json({ error: 'يرجى كتابة نص أو سؤال قبل الإرسال' }, { status: 400 });
    }

    // === فاصل زمني 3 ثوانٍ ===
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'global';
    const cooldownError = checkCooldown(`${action}:${ip}`);
    if (cooldownError) {
      return NextResponse.json({ error: cooldownError, cooldown: true }, { status: 429 });
    }

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
        userContent = userText;
        temperature = 0.7;
        break;

      case 'summarize':
        systemPrompt = `أنت ملخص صارم للنصوص الدينية والفكرية.
قاعدة ذهبية: يمنع منعاً باتاً إضافة أي معلومة من عندك.
- التزم حرفياً بما هو مكتوب في النص المرفق فقط
- لا تضف تفسيراً أو شرحاً أو معلومة خارجية إطلاقاً
- إذا لم يذكر النص معلومة معينة فلا تذكرها
- استخرج النقاط الرئيسية بترتيب منطقي
- احفظ الأحاديث والآيات كما وردت في النص كاملة
- إذا كان النص فارغاً أو قصيراً، قل: النص غير كافٍ للتلخيص`;
        userContent = content;
        break;

      case 'validate':
        systemPrompt = `أنت مدقق أكاديمي متخصص في البحوث الدينية الإسلامية. مهامك:
1. مراجعة البحث ومقارنته بالمصادر الأصلية
2. تصحيح الأخطاء العلمية والنقلية
3. اقتراح أدلة وقرائن أقوى لتعزيز البحث
4. التحقق من صحة الأحاديث والآيات المذكورة
5. اقتراح تحسينات هيكلية وعلمية
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
        return NextResponse.json({ error: 'يرجى المحاولة بعد لحظات، النظام قيد المعالجة' }, { status: 400 });
    }

    // ================================================================
    //  المفكر الشيعي → Gemini فقط (لا بديل)
    // ================================================================
    if (action === 'thinker') {
      if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: 'مفتاح Gemini غير مضبوط. أضف GEMINI_API_KEY في إعدادات Vercel.' }, { status: 500 });
      }
      try {
        let promptText = userContent;
        if (Array.isArray(messages) && messages.length > 0) {
          const history = messages.map(m => `${m.role === 'user' ? 'المستخدم' : 'المفكر الشيعي'}: ${m.content}`).join('\n\n');
          promptText = `التاريخ الحواري السابق:\n${history}\n\nالسؤال الأخير: ${content}`;
        }
        const result = await callGemini(GEMINI_API_KEY, systemPrompt, promptText, temperature, maxTokens);
        if (result) return NextResponse.json({ success: true, result });
        return NextResponse.json({ error: 'يرجى المحاولة بعد لحظات، النظام قيد المعالجة' }, { status: 500 });
      } catch (e: any) {
        return NextResponse.json({ error: e.message || 'يرجى المحاولة بعد لحظات، النظام قيد المعالجة' }, { status: 500 });
      }
    }

    // ================================================================
    //  الملخص + التدقيق + البحث → DeepSeek فقط (لا بديل)
    // ================================================================
    if (action === 'summarize' || action === 'validate' || action === 'search') {
      if (!DEEPSEEK_API_KEY) {
        return NextResponse.json({ error: 'مفتاح DeepSeek غير مضبوط. أضف DEEPSEEK_API_KEY في إعدادات Vercel.' }, { status: 500 });
      }
      try {
        const result = await callDeepSeek(DEEPSEEK_API_KEY, [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }], temperature, maxTokens);
        if (result) return NextResponse.json({ success: true, result });
        return NextResponse.json({ error: 'يرجى المحاولة بعد لحظات، النظام قيد المعالجة' }, { status: 500 });
      } catch (e: any) {
        return NextResponse.json({ error: e.message || 'يرجى المحاولة بعد لحظات، النظام قيد المعالجة' }, { status: 500 });
      }
    }

    // ================================================================
    //  التصنيف → DeepSeek أولاً ثم Gemini
    // ================================================================
    if (action === 'categorize') {
      try {
        if (DEEPSEEK_API_KEY) {
          const result = await callDeepSeek(DEEPSEEK_API_KEY, [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }], temperature, maxTokens);
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) return NextResponse.json({ success: true, result: JSON.parse(jsonMatch[0]) });
        }
        if (GEMINI_API_KEY) {
          const result = await callGemini(GEMINI_API_KEY, systemPrompt, userContent, temperature, maxTokens);
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) return NextResponse.json({ success: true, result: JSON.parse(jsonMatch[0]) });
        }
      } catch (e: any) {
        console.error('Categorize failed:', e.message);
      }
      return NextResponse.json({ success: true, result: { category: 'أخرى', confidence: 0.3 } });
    }

    return NextResponse.json({ error: 'يرجى المحاولة بعد لحظات، النظام قيد المعالجة' }, { status: 400 });
  } catch (error: any) {
    console.error('AI API Error:', error);
    return NextResponse.json({ error: 'يرجى المحاولة بعد لحظات، النظام قيد المعالجة' }, { status: 500 });
  }
}
