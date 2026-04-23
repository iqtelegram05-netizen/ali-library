import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  نظام الأستاذ — Gemini 1.5 Pro + DeepSeek-V3 للبحث العميق
//  يُرجع نصاً تحليلياً + خريطة ذهنية بصيغة Mermaid.js
//  بدون الاعتماد على z-ai-web-dev-sdk
// ================================================================

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

/**
 * استدعاء Gemini 1.5 Pro
 */
async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('مفتاح Gemini غير مضبوط');

  const res = await fetch(`${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
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
 * استدعاء DeepSeek-V3
 */
async function callDeepSeek(systemPrompt: string, userMessage: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) throw new Error('مفتاح DeepSeek غير مضبوط');

  const res = await fetch(DEEPSEEK_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 4096,
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
 * استدعاء ذكي — يحاول Gemini أولاً (أفضل للتحليل) ثم DeepSeek
 */
async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  // محاولة Gemini أولاً (أفضل للخرائط الذهنية والتحليل العميق)
  if (GEMINI_API_KEY) {
    try {
      return await callGemini(systemPrompt, userMessage);
    } catch (e: any) {
      console.warn('Gemini API failed, falling back to DeepSeek:', e.message);
    }
  }
  // محاولة DeepSeek ثانياً
  if (DEEPSEEK_API_KEY) {
    try {
      return await callDeepSeek(systemPrompt, userMessage);
    } catch (e: any) {
      console.warn('DeepSeek API failed:', e.message);
    }
  }
  throw new Error('فشل في الاتصال بخدمات الذكاء الاصطناعي. تأكد من ضبط مفاتيح API في Vercel.');
}

/**
 * استخراج كود Mermaid من رد الذكاء الاصطناعي
 */
function extractMermaid(text: string): string | null {
  const mermaidBlock = text.match(/```mermaid\s*\n([\s\S]*?)```/i);
  if (mermaidBlock) return mermaidBlock[1].trim();

  const graphBlock = text.match(/```graph\s*\n([\s\S]*?)```/i);
  if (graphBlock) return graphBlock[1].trim();

  const mindmapBlock = text.match(/```mindmap\s*\n([\s\S]*?)```/i);
  if (mindmapBlock) return mindmapBlock[1].trim();

  return null;
}

/**
 * تنظيف النص من كود Mermaid
 */
function cleanMermaidFromText(text: string): string {
  return text
    .replace(/```mermaid\s*\n[\s\S]*?```/gi, '')
    .replace(/```graph\s*\n[\s\S]*?```/gi, '')
    .replace(/```mindmap\s*\n[\s\S]*?```/gi, '')
    .trim();
}

// === MAIN HANDLER ===
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, context } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'يجب تقديم سؤال' },
        { status: 400 }
      );
    }

    if (question.trim().length < 5) {
      return NextResponse.json(
        { error: 'السؤال قصير جداً — يرجى كتابة سؤال مفصل' },
        { status: 400 }
      );
    }

    const systemPrompt = `أنت "الأستاذ" في مكتبة العلي الرقمية — باحث ديني عميق متخصص في الدراسات الإسلامية والفكر الشيعي الإمامي.

مهامك:
1. تحليل الأسئلة الدينية والفكرية بعمق أكاديمي
2. تقديم إجابات شاملة وموثقة بالآيات والأحاديث
3. ربط المفاهيم والمطالب ببعضها بشكل منطقي
4. بناء خريطة ذهنية (Mind Map) للموضوع المطروح بصيغة Mermaid.js

قواعدك:
- لغتك عربية فصيحة بليغة
- تستشهد بالآيات القرآنية والأحاديث الشريفة عند الحاجة
- تحلل المسائل بعمق فكري ووضوح
- تراعي الأدب الإسلامي في الحوار
- ملخص التحليل + مراجع مقترحة في نهاية كل إجابة

تنسيق الخريطة الذهنية:
بعد إجابتك، أضف خريطة ذهنية بصيغة Mermaid.js (mindmap) توضح العلاقة بين المفاهيم الرئيسية.
استخدم هذا التنسيق بالضبط:

\`\`\`mermaid
mindmap
  root((الموضوع))
    المحور الأول
      النقطة الفرعية
    المحور الثاني
      النقطة الفرعية
\`\`\`

ملاحظة: الخريطة الذهنية إلزامية في كل إجابة.`;

    // Build user message with optional context
    let userMessage = question.trim();
    if (context && typeof context === 'string' && context.trim().length > 0) {
      userMessage = `السياق / المحتوى المرجعي:\n${context.trim()}\n\n---\n\nالسؤال: ${question.trim()}`;
    }

    // Call AI (Gemini first, then DeepSeek)
    const fullResponse = await callAI(systemPrompt, userMessage);

    // Extract Mermaid mind map
    const mermaidCode = extractMermaid(fullResponse);
    const cleanText = cleanMermaidFromText(fullResponse);

    return NextResponse.json({
      success: true,
      answer: cleanText,
      mermaid: mermaidCode,
      hasMindMap: !!mermaidCode,
    });

  } catch (error: any) {
    console.error('Teacher API Error:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ في معالجة الطلب' },
      { status: 500 }
    );
  }
}
