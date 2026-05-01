import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  نظام الأستاذ — Gemini 1.5 Pro
//  معلم ذكي متخصص في الدراسات الإسلامية + خرائط ذهنية Mermaid.js
// ================================================================

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

const SYSTEM_PROMPT = `أنت "الأستاذ الذكي" — معلم متخصص عميق في الدراسات الإسلامية والفكر الشيعي الإمامي.

خلفيتك:
- إلمام عميق بالقرآن الكريم والحديث الشريف (من مصادر أهل البيت)
- دراية واسعة بالفقه والأصول والعقيدة والفلسفة الإسلامية
- معرفة شاملة بتاريخ الإسلام والأئمة الاثني عشر (ع)
- قدرة على تحليل النصوص الدينية واستخراج المعاني العميقة
- خبرة في بناء الأفكار بصورة هرمية ومنهجية

أسلوبك:
- تبدأ بالتحية الإسلامية "بسم الله الرحمن الرحيم"
- تجيب بعمق وأمانة علمية مع الاستشهاد بالآيات والأحاديث
- تحلل المسائل بمنهجية واضحة ومنظمة
- تستخدم لغة عربية فصيحة بليغة
- تراعي الأدب الإسلامي في الحوار
- تنظم الإجابة بعناوين فرعية ونقاط مرقمة

## قاعدة خرائط Mermaid الذهنية:
في كل إجابة، يجب أن تولّد خريطة ذهنية بصيغة Mermaid.js (mindmap) تلخّص المفاهيم الرئيسية.
- استخدم صيغة mindmap فقط
- ضع الخريطة داخل block مخصص: <<<MINDMAP_START>>> ... <<<MINDMAP_END>>>
- استخدم اللغة العربية في عقد الخريطة
- اجعل الخريطة شاملة覆盖 for المفاهيم الأساسية

مثال لتنسيق الخريطة:
<<<MINDMAP_START>>>
mindmap
  root((الموضوع))
    الفرع الأول
      نقطة تفصيلية
      نقطة تفصيلية
    الفرع الثاني
      نقطة تفصيلية
      نقطة تفصيلية
<<<MINDMAP_END>>>

تنسيق الإجابة بالكامل:
1. أجب أولاً بالإجابة المفصلة باستخدام Markdown
2. ثم أضف الخريطة الذهنية في نهاية الإجابة بين العلامتين المحددتين`;

function extractMindmap(text: string): { answer: string; mindmap: string } {
  const startMarker = '<<<MINDMAP_START>>>';
  const endMarker = '<<<MINDMAP_END>>>';

  const startIdx = text.indexOf(startMarker);
  const endIdx = text.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    // لا توجد خريطة — ننشئ واحدة بسيطة من العناوين
    const mindmap = generateFallbackMindmap(text);
    return { answer: text, mindmap };
  }

  const mindmap = text.substring(startIdx + startMarker.length, endIdx).trim();
  const answer = (text.substring(0, startIdx) + text.substring(endIdx + endMarker.length)).trim();

  return { answer, mindmap };
}

function generateFallbackMindmap(text: string): string {
  // استخراج العناوين الرئيسية من النص
  const headings: string[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = line.match(/^###\s+(.+)/);
    const hMatch = h2Match || h3Match;
    if (hMatch) {
      headings.push(hMatch[1].trim());
    }
    if (headings.length >= 6) break;
  }

  if (headings.length === 0) {
    return `mindmap
  root((إجابة الأستاذ))
    ملخص
      نقاط رئيسية
    تفاصيل
      تحليل عميق`;
  }

  const branches = headings.map((h, i) => `    ${h.replace(/[*_`#]/g, '').trim()}`).join('\n');

  return `mindmap\n  root((الموضوع الرئيسي))\n${branches}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, messages } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ success: false, error: 'يجب تقديم سؤال' });
    }

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'مفتاح Gemini API غير موجود. تأكد من إضافة GEMINI_API_KEY في متغيرات البيئة.' });
    }

    // بناء سجل المحادثة
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // إضافة رسائل المحادثة السابقة إن وُجدت
    if (Array.isArray(messages) && messages.length > 0) {
      for (const msg of messages.slice(-10)) { // آخر 10 رسائل فقط
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    // إضافة السؤال الحالي
    contents.push({
      role: 'user',
      parts: [{ text: question }],
    });

    const requestBody = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        topP: 0.95,
        topK: 40,
      },
    };

    const url = `${GEMINI_BASE}?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(120000), // 2 دقيقة
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Teacher API] Gemini error:', response.status, errorData);
      return NextResponse.json({
        success: false,
        error: `خطأ من Gemini API: ${response.status}`,
      });
    }

    const data = await response.json();

    const candidate = data?.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text || '';

    if (!rawText) {
      return NextResponse.json({ success: false, error: 'Gemini رد بنتيجة فارغة' });
    }

    // استخراج الخريطة الذهنية من الرد
    const { answer, mindmap } = extractMindmap(rawText);

    return NextResponse.json({
      success: true,
      answer,
      mindmap,
    });
  } catch (error: any) {
    console.error('[Teacher API] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ داخلي' });
  }
}
