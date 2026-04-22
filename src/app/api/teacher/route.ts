import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  نظام الأستاذ — Gemini 1.5 Pro للبحث العميق
//  يُرجع نصاً تحليلياً + خريطة ذهنية بصيغة Mermaid.js
// ================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

/**
 * استدعاء Gemini 1.5 Pro API
 */
async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  // الطريقة الأولى: استخدام Gemini API المباشر
  if (GEMINI_API_KEY) {
    try {
      const res = await fetch(`${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [{
            parts: [{ text: userMessage }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          }
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (e: any) {
      console.warn('Gemini API direct call failed, falling back to z-ai-web-dev-sdk:', e.message);
    }
  }

  // الطريقة الثانية: الرجوع إلى z-ai-web-dev-sdk
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    return completion.choices[0]?.message?.content || 'لم يتم الحصول على نتيجة';
  } catch (e: any) {
    console.error('z-ai-web-dev-sdk fallback failed:', e);
    throw new Error('فشل في الاتصال بخدمة الذكاء الاصطناعي');
  }
}

/**
 * استخراج كود Mermaid من رد الذكاء الاصطناعي
 */
function extractMermaid(text: string): string | null {
  // البحث عن كود Mermaid محاط بـ ```mermaid ... ```
  const mermaidBlock = text.match(/```mermaid\s*\n([\s\S]*?)```/i);
  if (mermaidBlock) return mermaidBlock[1].trim();

  // البحث عن كود Mermaid محاط بـ ```graph ... ```
  const graphBlock = text.match(/```graph\s*\n([\s\S]*?)```/i);
  if (graphBlock) return graphBlock[1].trim();

  // البحث عن كود Mermaid محاط بـ ```mindmap ... ```
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

    // Call AI
    const fullResponse = await callGemini(systemPrompt, userMessage);

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
