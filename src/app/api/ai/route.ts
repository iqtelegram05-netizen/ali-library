import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, content, messages } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Dynamic import for z-ai-web-dev-sdk (server-side only)
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    let systemPrompt = '';
    let userContent = '';

    switch (action) {
      case 'summarize':
        systemPrompt = `أنت أستاذ متخصص في التلخيص الأكاديمي. تلخص النصوص الدينية والفكرية بدقة عالية.
قواعدك:
1. استخرج النقاط الرئيسية والمطالب الأساسية فقط
2. حافظ على المعنى الأصلي دون تحريف
3. رتب الأفكار منطقياً
4. استخدم لغة عربية فصيحة واضحة
5. اذكر الأدلة والشواهد المهمة
6. إذا كان النص يحتوي على أحاديث أو آيات، احفظها كاملة
النص المراد تلخيصه:`;
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
أجب باللغة العربية بطريقة أكاديمية مهنية.

البحث المراد تدقيقه:`;
        userContent = content;
        break;

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
- تراعي الأدب الإسلامي في الحوار

التاريخ الحواري للمحادثة:`;
        userContent = typeof content === 'string' ? content : JSON.stringify(content);
        break;

      case 'search':
        systemPrompt = `أنت محرك بحث موضوعي متقدم يعتمد على المنطق والمعنى وليس مجرد الكلمات.
مهامك:
1. فهم القصد الحقيقي من الاستعلام
2. تقديم نتائج بحث متعلقة بالموضوع المطروح
3. ربط المفاهيم المتقاربة والمنهجية
4. اقتراح مصادر ومراجع ذات صلة
5. تنظيم النتائج في تصنيفات واضحة
أجب باللغة العربية وبشكل منظم وبحثي علمي.

استعلام البحث:`;
        userContent = content;
        break;

      case 'categorize':
        systemPrompt = `أنت مصنّف كتب إسلامية ذكي. صنّف الكتاب التالي إلى أحد الأقسام التالية: تفسير، عقائد، فقه، منطق، فلسفة، تاريخ، أدعية، أخرى.
أجب بصيغة JSON فقط: {"category": "القسم", "confidence": 0.9}
اسم الكتاب:`;
        userContent = content;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // For thinker, use conversation history
    const apiMessages: Array<{role: string; content: string}> = [
      { role: 'system', content: systemPrompt }
    ];

    if (action === 'thinker' && Array.isArray(messages) && messages.length > 0) {
      messages.forEach((msg: {role: string; content: string}) => {
        apiMessages.push({ role: msg.role, content: msg.content });
      });
    } else {
      apiMessages.push({ role: 'user', content: userContent });
    }

    const completion = await zai.chat.completions.create({
      messages: apiMessages as any,
      temperature: action === 'thinker' ? 0.7 : action === 'categorize' ? 0.1 : 0.3,
      max_tokens: action === 'categorize' ? 100 : 4000,
    });

    const result = completion.choices[0]?.message?.content || 'لم يتم الحصول على نتيجة';

    // Special handling for categorize: parse JSON
    if (action === 'categorize') {
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ success: true, result: parsed });
        }
      } catch {
        return NextResponse.json({ success: true, result: { category: 'أخرى', confidence: 0.3 } });
      }
    }

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error('AI API Error:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ في معالجة الطلب' },
      { status: 500 }
    );
  }
}
