import { NextResponse } from 'next/server';

// ================================================================
//  نقطة تشخيص — تفاصيل حالة المفاتيح والاتصال
// ================================================================

export async function GET() {
  const DEEPSEEK_API_KEY = (process.env.DEEPSEEK_API_KEY || '').trim();
  const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    keys: {},
    tests: {},
  };

  // === فحص مفتاح DeepSeek ===
  diagnostics.keys.DEEPSEEK_API_KEY = DEEPSEEK_API_KEY
    ? { status: 'موجود', prefix: DEEPSEEK_API_KEY.slice(0, 8), length: DEEPSEEK_API_KEY.length }
    : { status: 'فارغ أو غير موجود' };

  if (DEEPSEEK_API_KEY) {
    try {
      const start = Date.now();
      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'قل: يعمل' }],
          max_tokens: 10,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const elapsed = Date.now() - start;
      const body = await res.text().catch(() => '');

      if (res.ok) {
        const d = JSON.parse(body);
        diagnostics.tests.DEEPSEEK = {
          status: 'يعمل بنجاح',
          responseTime: `${elapsed}ms`,
          httpStatus: res.status,
          reply: d?.choices?.[0]?.message?.content || '(فارغ)',
        };
      } else {
        diagnostics.tests.DEEPSEEK = {
          status: 'فشل الاتصال',
          httpStatus: res.status,
          responseTime: `${elapsed}ms`,
          error: body.slice(0, 500),
        };
      }
    } catch (e: any) {
      diagnostics.tests.DEEPSEEK = {
        status: 'خطأ في الشبكة',
        error: e.message,
      };
    }
  } else {
    diagnostics.tests.DEEPSEEK = { status: 'تم تخطيه — المفتاح غير موجود' };
  }

  // === فحص مفتاح Gemini ===
  diagnostics.keys.GEMINI_API_KEY = GEMINI_API_KEY
    ? { status: 'موجود', prefix: GEMINI_API_KEY.slice(0, 8), length: GEMINI_API_KEY.length }
    : { status: 'فارغ أو غير موجود' };

  if (GEMINI_API_KEY) {
    try {
      const start = Date.now();
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'قل: يعمل' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
        signal: AbortSignal.timeout(15000),
      });
      const elapsed = Date.now() - start;
      const body = await res.text().catch(() => '');

      if (res.ok) {
        const d = JSON.parse(body);
        diagnostics.tests.GEMINI = {
          status: 'يعمل بنجاح',
          responseTime: `${elapsed}ms`,
          httpStatus: res.status,
          reply: d?.candidates?.[0]?.content?.parts?.[0]?.text || '(فارغ)',
        };
      } else {
        let parsedError = body.slice(0, 500);
        try {
          const errJson = JSON.parse(body);
          parsedError = JSON.stringify(errJson, null, 2).slice(0, 500);
        } catch {}
        diagnostics.tests.GEMINI = {
          status: 'فشل الاتصال',
          httpStatus: res.status,
          responseTime: `${elapsed}ms`,
          error: parsedError,
        };
      }
    } catch (e: any) {
      diagnostics.tests.GEMINI = {
        status: 'خطأ في الشبكة',
        error: e.message,
      };
    }
  } else {
    diagnostics.tests.GEMINI = { status: 'تم تخطيه — المفتاح غير موجود' };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
