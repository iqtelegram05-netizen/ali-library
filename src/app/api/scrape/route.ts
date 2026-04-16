import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// ================================================================
//  محرك الاستخراج الذكي المحلي — Custom Smart Scraper
//  لا يحتاج لأي API خارجي — يعمل بالكود مباشرة
// ================================================================

// === كلمات إدارية يجب تجاهلها (Navigation / Admin Filter) ===
const BLOCKED_PATTERNS = [
  // عربية
  /^الرئيسية$/i, /^اتصل بنا$/i, /^من نحن$/i, /^أرشيف$/i, /^الخصوصية$/i,
  /^الشروط$/i, /^سياسة الخصوصية$/i, /^خريطة الموقع$/i, /^النتائج$/i,
  /^البحث$/i, /^تسجيل الدخول$/i, /^إنشاء حساب$/i, /^القائمة$/i,
  /^المؤلفون$/i, /^الناشرون$/i, /^الأقسام$/i, /^التصنيفات$/i,
  /^الرئيس$/i, /^الصفحة الرئيسية$/i, /^العودة$/i, /^التالي$/i,
  /^السابق$/i, /^الصفحة$/i, /^إرسال$/i, /^حفظ$/i, /^حذف$/i,
  /^تعديل$/i, /^مشاركة$/i, /^طباعة$/i, /^تحميل$/i, /^rss$/i,
  /^sitemap$/i, /^feed$/i, /^login$/i, /^register$/i, /^signup$/i,
  /^contact$/i, /^about$/i, /^home$/i, /^index$/i,
  /^المزيد$/i, /^اقرأ المزيد$/i, /^عرض الكل$/i, /^عرض المزيد$/i,
  /^أعلى الصفحة$/i, /^أسفل الصفحة$/i,
];

// === روابط كتب محتملة (Book Link Patterns) ===
const BOOK_PATTERNS = [
  /\/book\//i,
  /\/show\//i,
  /\/read\//i,
  /\/view\//i,
  /\/index\.php/i,
  /\/page\//i,
  /\/library\//i,
  /\/kitab\//i,
  /\/kutub\//i,
  /\/maktaba\//i,
  /\/mktba\//i,
  /\/bible\//i,   // بعض المكتبات تستخدم كلمة bible بمعنى كتاب
  /\/article\//i,
  /\/content\//i,
  /\/book\.php/i,
  /\/showbook/i,
  /\/viewbook/i,
  /\/readbook/i,
  /\/download\//i,
  /\/pdf\//i,
  /\/epub\//i,
];

// === روابط يجب تجاهلها (Ignore Extensions) ===
const IGNORE_EXTENSIONS = /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico|css|js|woff|woff2|ttf|eot|mp3|mp4|avi|mov|wmv|flv|zip|rar|7z|tar|gz|exe|apk|dmg)$/i;

// === User-Agent محاكي متصفح حقيقي ===
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'identity',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

// === CORS BYPASS PROXY ===
const PROXY_SERVICES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

/**
 * جلب HTML عبر محاكي المتصفح + Proxy chain
 */
async function fetchHTML(targetUrl: string): Promise<string> {
  let lastError: any = null;

  // 1) محاولة مباشرة بمحاكي المتصفح
  try {
    const res = await fetch(targetUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 300) return text;
    }
  } catch (e) { lastError = e; }

  // 2) Proxy chain
  for (const makeProxy of PROXY_SERVICES) {
    try {
      const proxyUrl = makeProxy(targetUrl);
      const res = await fetch(proxyUrl, {
        headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] },
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 300) return text;
      }
    } catch (e) { lastError = e; }
  }

  throw new Error(`فشل في جلب الصفحة: ${lastError?.message || 'تعذر الاتصال'}`);
}

/**
 * فك تشفير URL والحصول على النص العربي
 */
function decodeUrlText(text: string): string {
  try {
    // محاولة فك التشفير المتعدد (بعض الروابط مشفرة مرتين)
    let decoded = text;
    for (let i = 0; i < 3; i++) {
      const prev = decoded;
      decoded = decodeURIComponent(decoded);
      if (decoded === prev) break;
    }
    return decoded;
  } catch {
    return text;
  }
}

/**
 * تنظيف النص من HTML tags و whitespace
 */
function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * هل النص يبدو ككتاب؟ (الحد الأدنى 10 أحرف)
 */
function looksLikeBook(text: string): boolean {
  if (!text || text.length < 10) return false;
  // التحقق من وجود حروف عربية كافية
  const arabicChars = text.match(/[\u0600-\u06FF]/g);
  if (arabicChars && arabicChars.length >= 5) return true;
  // أو نص إنجليزي طويل
  if (/^[a-zA-Z\s\-_:]{10,}$/.test(text)) return true;
  return false;
}

/**
 * هل الرابط يحتوي نمط كتاب؟
 */
function hasBookPattern(href: string): boolean {
  if (BOOK_PATTERNS.some(p => p.test(href))) return true;
  // رابط يحتوي أرقام تسلسلية كبيرة = محتمل كتاب
  if (/\d{2,}/.test(href) && !/\d{4}\/\d{2}\/\d{2}/.test(href)) return true;
  return false;
}

/**
 * هل الرابط يجب تجاهله؟
 */
function shouldIgnoreLink(href: string): boolean {
  if (!href || href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:')) return true;
  if (IGNORE_EXTENSIONS.test(href)) return true;
  return false;
}

/**
 * هل النص كلمة إدارية يجب تجاهلها؟
 */
function isAdministrativeWord(text: string): boolean {
  const cleaned = text.trim();
  return BLOCKED_PATTERNS.some(p => p.test(cleaned)) || cleaned.length < 10;
}

/**
 * استخراج اسم المؤلف من النص القريب بالرابط
 */
function extractAuthor($: cheerio.CheerioAPI, el: cheerio.Element): string {
  const $el = $(el);
  const $parent = $el.parent();
  if (!$parent) return '';

  // البحث في العنصر الأب والأخوة عن كلمات تشير لمؤلف
  const nearby = $parent.text() + ' ' + $el.next().text() + ' ' + $el.prev().text();
  const authorMatch = nearby.match(/المؤلف\s*[:\-–]\s*([^\n,،.]{3,60})/i)
    || nearby.match(/تأليف\s*[:\-–]?\s*([^\n,،.]{3,60})/i)
    || nearby.match(/لـ?\s*([^\n,،.\d]{3,40})$/i);

  if (authorMatch && authorMatch[1]) {
    return cleanText(authorMatch[1]).substring(0, 60);
  }

  return '';
}

/**
 * استخراج عدد الصفحات من النص القريب
 */
function extractPages($: cheerio.CheerioAPI, el: cheerio.Element): string {
  const $el = $(el);
  const $parent = $el.parent();
  if (!$parent) return '';

  const nearby = $parent.text() + ' ' + $el.next().text() + ' ' + $el.prev().text();
  const pagesMatch = nearby.match(/(\d+)\s*صفحة/i) || nearby.match(/(\d+)\s*ص/i);

  if (pagesMatch && pagesMatch[1]) {
    return pagesMatch[1];
  }

  return '';
}

// === MAIN HANDLER ===
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    try { new URL(url); } catch { return NextResponse.json({ error: 'Invalid URL' }, { status: 400 }); }

    // === المرحلة 1: جلب HTML بمحاكي المتصفح ===
    let html = '';
    try {
      html = await fetchHTML(url);
    } catch (e: any) {
      return NextResponse.json({
        success: false,
        error: `فشل في جلب الصفحة: ${e.message || 'تعذر الاتصال'}`,
      }, { status: 200 });
    }

    if (!html || html.length < 100) {
      return NextResponse.json({
        success: false,
        error: 'الصفحة فارغة أو لا تحتوي على محتوى كافٍ',
      }, { status: 200 });
    }

    // === المرحلة 2: تحليل HTML بالـ Cheerio ===
    const $ = cheerio.load(html);

    // إزالة العناصر غير المهمة
    $('script, style, noscript, nav, header, footer, aside, iframe, .ads, .ad, .sidebar, .menu, .navigation, .comment, .comments, .share, .social, .widget, .pagination, .breadcrumb').remove();

    // جمع الروابط المرشحة
    const seenUrls = new Set<string>();
    const books: Array<{
      title: string;
      author: string;
      pages: string;
      url: string;
      score: number;
    }> = [];

    $('a[href]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';

      // تجاهل الروابط الغير مناسبة
      if (shouldIgnoreLink(href)) return;

      // بناء الرابط الكامل
      let fullUrl = href;
      try {
        fullUrl = new URL(href, url).href;
      } catch { return; }

      // تجنب التكرار
      if (seenUrls.has(fullUrl)) return;

      // استخراج النص
      let title = cleanText(decodeUrlText($el.text()));
      // أيضاً تحقق من عنوان الـ href نفسه
      if (title.length < 10) {
        const decodedHref = decodeUrlText(href);
        const pathParts = decodedHref.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart.length > 10) {
            title = cleanText(lastPart.replace(/[-_]/g, ' '));
          }
        }
      }

      // الفحص: هل يبدو ككتاب؟
      const hasBook = hasBookPattern(fullUrl);
      const looksBook = looksLikeBook(title);
      const isAdmin = isAdministrativeWord(title);

      // نقاط الثقة
      let score = 0;
      if (hasBook) score += 3;
      if (looksBook && !isAdmin) score += 5;
      if (looksBook && hasBook) score += 2;
      if (isAdmin) score -= 10;
      if (title.length < 10) score -= 5;

      // قبول فقط الروابط التي تبدو ككتب
      if (score >= 3 && title.length >= 10) {
        seenUrls.add(fullUrl);
        books.push({
          title: title,
          author: extractAuthor($, el),
          pages: extractPages($, el),
          url: fullUrl,
          score: score,
        });
      }
    });

    // ترتيب حسب نقاط الثقة (الأعلى أولاً)
    books.sort((a, b) => b.score - a.score);

    // إزالة التكرارات بناءً على العنوان (تشابه)
    const uniqueBooks = books.filter((book, index) => {
      return index === books.findIndex(b =>
        b.title.substring(0, 20) === book.title.substring(0, 20)
      );
    });

    if (uniqueBooks.length === 0) {
      return NextResponse.json({
        success: true,
        books: [],
        message: 'لم يتم العثور على كتب في هذه الصفحة. جرّب رابط فهرس كتب أو مكتبة رقمية.',
      });
    }

    // === المرحلة 3: إرجاع البيانات المنظمة ===
    const result = uniqueBooks.slice(0, 200).map((b, i) => ({
      id: `bk-${i}`,
      title: b.title,
      author: b.author,
      pages: b.pages,
      url: b.url,
      selected: true,
      source: 'smart-scraper',
      confidence: Math.min(b.score / 10, 1),
    }));

    return NextResponse.json({
      success: true,
      books: result,
      total: result.length,
      source: 'smart-scraper',
      message: `تم استخراج ${result.length} كتاب بواسطة المحرك الذكي المحلي`,
    });

  } catch (error: any) {
    console.error('Smart Scraper Error:', error);
    return NextResponse.json({ error: error.message || 'Scraping failed' }, { status: 500 });
  }
}
