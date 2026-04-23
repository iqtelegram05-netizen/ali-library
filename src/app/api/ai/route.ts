import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  AI Router — المفكر الشيعي مرتبط بـ Gemini
//  الملخص وباقي الخدمات مرتبطة بـ DeepSeek
// ================================================================

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

async function callDeepSeek(messages: Array<{role: string; content: string}>, temperature: number = 0.3, maxTokens: number = 4000): Promise<string> {
  const res = await fetch(DEEPSEEK_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) { const e = await res.text().catch(() => ''); throw new Error(`DeepSeek error ${res.status}: ${e.slice(0, 200)}`); }
  const d = await res.json();
  return d?.choices?.[0]?.message?.content || '';
}

async function callGemini(systemPrompt: string, userMessage: string, temperature: number = 0.7, maxTokens: number = 4096): Promise<string> {
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
  if (!res.ok) { const e = await res.text().catch(() => ''); throw new Error(`Gemini error ${res.status}: ${e.slice(0, 200)}`); }
  const d = await res.json();
  return d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, content, messages } = body;
    if (!action) return NextResponse.json({ error: 'Action is required' }, { status: 400 });

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
        systemPrompt = `أنت أستاذ متخصص في التلخيص الأكاديمي. تلخص النصوص الدينية والفكرية بدقة عالية.
قواعدك:
1. استخرج النقاط الرئيسية والمطالب الأساسية فقط
2. حافظ على المعنى الأصلي دون تحريف
3. رتب الأفكار منطقياً
4. استخدم لغة عربية فصيحة واضحة
5. اذكر الأدلة والشواهد المهمة
6. إذا كان النص يحتوي على أحاديث أو آيات، احفظها كاملة`;
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
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // === المفكر الشيعي: يُستخدم Gemini مباشرة ===
    if (action === 'thinker' && Array.isArray(messages) && messages.length > 0) {
      if (GEMINI_API_KEY) {
        try {
          const history = messages.map(m => `${m.role === 'user' ? 'المستخدم' : 'المفكر الشيعي'}: ${m.content}`).join('\n\n');
          const result = await callGemini(systemPrompt, `التاريخ الحواري السابق:\n${history}\n\nالسؤال الأخير: ${content}`, temperature, maxTokens);
          return NextResponse.json({ success: true, result });
        } catch (e: any) { console.error('Gemini thinker failed:', e.message); }
      }
      if (DEEPSEEK_API_KEY) {
        try {
          const apiMessages = [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content }))];
          const result = await callDeepSeek(apiMessages, temperature, maxTokens);
          return NextResponse.json({ success: true, result });
        } catch (e: any) { console.error('DeepSeek thinker failed:', e.message); }
      }
      return NextResponse.json({ error: 'فشل الاتصال بخدمات الذكاء الاصطناعي. تأكد من ضبط مفاتيح API.' }, { status: 500 });
    }

    // === باقي الأقسام: يُستخدم DeepSeek مباشرة ===
    if (action === 'summarize' || action === 'validate' || action === 'search') {
      if (DEEPSEEK_API_KEY) {
        try {
          const result = await callDeepSeek([{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }], temperature, maxTokens);
          if (action === 'categorize') {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) { return NextResponse.json({ success: true, result: JSON.parse(jsonMatch[0]) }); }
          }
          return NextResponse.json({ success: true, result });
        } catch (e: any) { console.error('DeepSeek failed:', e.message); }
      }
      if (GEMINI_API_KEY) {
        try {
          const result = await callGemini(systemPrompt, userContent, temperature, maxTokens);
          return NextResponse.json({ success: true, result });
        } catch (e: any) { console.error('Gemini failed:', e.message); }
      }
      return NextResponse.json({ error: 'فشل الاتصال بخدمات الذكاء الاصطناعي. تأكد من ضبط مفاتيح API.' }, { status: 500 });
    }

    // === التصنيف: DeepSeek أولاً ثم Gemini ===
    if (action === 'categorize') {
      if (DEEPSEEK_API_KEY) {
        try {
          const result = await callDeepSeek([{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }], temperature, maxTokens);
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) return NextResponse.json({ success: true, result: JSON.parse(jsonMatch[0]) });
        } catch (e: any) { console.error('DeepSeek categorize failed:', e.message); }
      }
      if (GEMINI_API_KEY) {
        try {
          const result = await callGemini(systemPrompt, userContent, temperature, maxTokens);
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) return NextResponse.json({ success: true, result: JSON.parse(jsonMatch[0]) });
        } catch (e: any) { console.error('Gemini categorize failed:', e.message); }
      }
      return NextResponse.json({ success: true, result: { category: 'أخرى', confidence: 0.3 } });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('AI API Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ' }, { status: 500 });
  }
}
