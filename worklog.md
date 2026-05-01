---
Task ID: 1
Agent: Main Agent
Task: تعديل مكتبة العلي الرقمية - 7 تعديلات مطلوبة

Work Log:
- استكشاف هيكل المشروع في /home/z/ali-library
- تحليل الملفات الرئيسية: page.tsx, reader/page.tsx, API routes
- حذف 3 ميزات من الواجهة: المفكر الشيعي، الملخص، تدقيق البحوث
  - إزالة من NAV_ITEMS و HERO_BUTTONS
  - حذف SummarizerSection, ValidatorSection, ThinkerSection من الـ render والتعريفات
- التحقق من ترقيم الكتب التسلسلي (مُطبّق مسبقاً في /api/scan)
- إنشاء /api/teacher/route.ts مع Gemini 1.5 Pro + خرائط ذهنية Mermaid.js
- تحديث /api/summary/route.ts لاستخدام DeepSeek-V3 بدلاً من Groq
- إنشاء قسم الأستاذ الذكي في الواجهة مع عرض الخرائط الذهنية
- تنظيف /api/ai/route.ts من الإجراءات غير المستخدمة

Stage Summary:
- تم حذف المفكر والملخص (القسم المنفصل) وتدقيق البحوث
- تم إنشاء نظام الأستاذ الذكي (Gemini 1.5 Pro) مع خرائط ذهنية Mermaid.js
- تم تحويل نظام الملخص ليعمل بـ DeepSeek-V3 (مفتاح API مضمّن)
- زر الملخص في القارئ يعمل مباشرة مع DeepSeek-V3
- زر الأستاذ متاح من الصفحة الرئيسية مع محادثة وخرائط ذهنية
- الترقيم التسلسلي للكتب يعمل بشكل صحيح (بدون تصنيف جزء)
