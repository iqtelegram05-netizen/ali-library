import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  محرك جلب صفحات الكتب — Book Page Content Fetcher
//  يجلب محتوى صفحة واحدة من الكتاب (النص الأصلي)
// ================================================================

const ARCHIVE_BASE = 'https://web.archive.org/web/20250105004220/http://shiaonlinelibrary.com';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'identity',
  'Cache-Control': 'no-cache',
};

const PROXY_SERVICES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

/**
 * تنظيف النص من HTML tags
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
 * جلب HTML عبر Proxy chain
 */
async function fetchHtml(targetUrl: string): Promise<string> {
  let lastError: any = null;

  try {
    const res = await fetch(targetUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 100) return text;
    }
  } catch (e) { lastError = e; }

  for (const makeProxy of PROXY_SERVICES) {
    try {
      const proxyUrl = makeProxy(targetUrl);
      const res = await fetch(proxyUrl, {
        headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 100) return text;
      }
    } catch (e) { lastError = e; }
  }

  throw new Error(`فشل في جلب الصفحة: ${lastError?.message || 'تعذر الاتصال'}`);
}

/**
 * استخراج البيانات الوصفية من صفحة الكتاب (الكتاب، المؤلف، الجزء، المجموعة)
 */
function extractMetadata(html: string): {
  bookTitle: string;
  author: string;
  part: string;
  group: string;
} {
  // Find the first div.text which contains metadata
  const textDivRegex = /<div class="text">\s*([\s\S]*?)\s*<\/div>/i;
  const match = textDivRegex.exec(html);

  if (!match) {
    return { bookTitle: '', author: '', part: '', group: '' };
  }

  const content = match[1];

  const bookTitleMatch = content.match(/الكتاب:\s*<?[^>]*>([^<]+)/i);
  const authorMatch = content.match(/المؤلف:\s*<?[^>]*>([^<]*)/i);
  const partMatch = content.match(/الجزء:\s*<?[^>]*>([^<]*)/i);
  const groupMatch = content.match(/المجموعة:\s*<?[^>]*>([^<]*)/i);

  return {
    bookTitle: bookTitleMatch ? cleanText(bookTitleMatch[1]) : '',
    author: authorMatch ? cleanText(authorMatch[1]) : '',
    part: partMatch ? cleanText(partMatch[1]) : '',
    group: groupMatch ? cleanText(groupMatch[1]) : '',
  };
}

/**
 * استخراج عدد الصفحات الكلي من pager — محسّن
 * يدعم أنماط متعددة: الصفحة_N, /N, page_N
 */
function extractTotalPages(html: string): number {
  let maxPage = 1;

  // 1) من div.pager — أنماط href المتعددة
  const pagerRegex = /<div class="pager">([\s\S]*?)<\/div>/i;
  const pagerMatch = pagerRegex.exec(html);

  if (pagerMatch) {
    const pagerContent = pagerMatch[1];

    // Pattern: href=".../الصفحة_15"
    const pageLinksArabic = pagerContent.matchAll(/الصفحة_(\d+)/g);
    for (const m of pageLinksArabic) {
      const num = parseInt(m[1], 10);
      if (num > maxPage) maxPage = num;
    }

    // Pattern: class="page">15</a> or just bare numbers in page navigation
    const directPageLinks = pagerContent.matchAll(/class="page"[^>]*>\s*(\d+)\s*</g);
    for (const m of directPageLinks) {
      const num = parseInt(m[1], 10);
      if (num > maxPage) maxPage = num;
    }

    // Pattern: href=".../الكتب/الصفحة_N"
    const hrefPattern = pagerContent.matchAll(/href="[^"]*?\/(\d+)(?:\/|")/g);
    for (const m of hrefPattern) {
      const num = parseInt(m[1], 10);
      if (num > maxPage && num < 10000) maxPage = num;
    }
  }

  // 2) إذا لم نجد من pager، ابحث في كل الصفحة عن أنماط الترقيم
  if (maxPage <= 1) {
    const allPageRefs = html.matchAll(/الصفحة_(\d+)/g);
    for (const m of allPageRefs) {
      const num = parseInt(m[1], 10);
      if (num > maxPage) maxPage = num;
    }
  }

  return maxPage;
}

/**
 * استخراج محتوى الصفحة الفعلي — محسّن
 * يستخدم مطابقة أعمق ليتعامل مع الـ divs المتداخلة
 */
function extractPageContent(html: string): string {
  // === الطريقة 1: ابحث عن <div class="page"> واستخرج كل محتواه ===
  // نستخدم index-of للعثور على البداية والنهاية بدقة
  const pageDivStart = html.indexOf('<div class="page">');

  if (pageDivStart !== -1) {
    const contentStart = pageDivStart + '<div class="page">'.length;

    // ابحث عن </div> التالي لمحتوى الصفحة (قبل pager أو نهاية)
    // نستخدم مطابقة عميقة: نبحث عن <div class="pager"> أو <div class="text"> التالية
    const pagerStart = html.indexOf('<div class="pager">', contentStart);
    const nextTextDiv = html.indexOf('<div class="text">', contentStart);

    let contentEnd = html.length;

    // إذا وُجد pager، النهاية عنده
    if (pagerStart !== -1 && pagerStart < contentEnd) {
      contentEnd = pagerStart;
    }

    // إذا وُجد div.text آخر بعد الـ page div، قد يكون نهاية المحتوى
    if (nextTextDiv !== -1 && nextTextDiv < contentEnd) {
      // لكن لا نأخذه إذا كانpager بعد الـ text
      if (pagerStart === -1 || nextTextDiv < pagerStart) {
        contentEnd = nextTextDiv;
      }
    }

    let pageContent = html.substring(contentStart, contentEnd).trim();

    // أزل آخر </div> زائد إن وُجد
    if (pageContent.endsWith('</div>')) {
      pageContent = pageContent.slice(0, -6).trim();
    }

    // أزل div.text الأول فقط إذا كان يحتوي بيانات وصفية
    const metadataPatterns = /الكتاب:|المؤلف:|الجزء:|المجموعة:/;
    const firstTextDiv = pageContent.match(/<div class="text">([\s\S]*?)<\/div>/i);
    if (firstTextDiv && metadataPatterns.test(firstTextDiv[1])) {
      pageContent = pageContent.replace(/<div class="text">[\s\S]*?<\/div>\s*/, '');
    }

    if (pageContent.trim().length > 5) {
      return pageContent.trim();
    }
  }

  // === الطريقة 2: البديل — ابحث عن div.text بعد البيانات الوصفية ===
  const allTextDivs = [...html.matchAll(/<div class="text">([\s\S]*?)<\/div>/gi)];
  if (allTextDivs.length > 1) {
    // الثاني عادة هو المحتوى الحقيقي
    return allTextDivs[1][1].trim();
  }
  if (allTextDivs.length === 1) {
    return allTextDivs[0][1].trim();
  }

  // === الطريقة 3: البديل الأخير — كل ما بين div.text الأول و div.pager ===
  const textDivStart = html.indexOf('<div class="text">');
  const textDivEnd = html.indexOf('<div class="pager">');
  if (textDivStart !== -1 && textDivEnd !== -1 && textDivEnd > textDivStart) {
    return html.substring(textDivStart, textDivEnd).replace(/^<div class="text">/, '').trim();
  }

  return '';
}

/**
 * استخراج الفهرست (TOC) من الكتاب
 */
function extractToc(html: string): Array<{ num: number; title: string; page: number }> {
  const tocItems: Array<{ num: number; title: string; page: number }> = [];

  // Find <div class="toc"><table> with tbody rows
  const tocRegex = /<div class="toc">\s*<table[^>]*>([\s\S]*?)<\/table>\s*<\/div>/i;
  const tocMatch = tocRegex.exec(html);

  if (!tocMatch) return tocItems;

  const tocContent = tocMatch[1];
  const tbodyRegex = /<tbody>([\s\S]*?)<\/tbody>/gi;
  let tbodyMatch;

  while ((tbodyMatch = tbodyRegex.exec(tocContent)) !== null) {
    const row = tbodyMatch[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(row)) !== null) {
      cells.push(tdMatch[1]);
    }

    if (cells.length >= 2) {
      const num = parseInt(cleanText(cells[0]), 10);
      const linkMatch = cells[1].match(/<a[^>]*>([\s\S]*?)<\/a>/i);
      const title = linkMatch ? cleanText(linkMatch[1]) : cleanText(cells[1]);
      const pageNum = cells.length >= 3 ? parseInt(cleanText(cells[2]), 10) : 0;

      if (title && !isNaN(num)) {
        tocItems.push({ num, title, page: pageNum });
      }
    }
  }

  return tocItems;
}

/**
 * بناء رابط صفحة كتاب محدد — محسّن
 * يدعم أنماط URL متعددة من مصدر shiaonlinelibrary
 */
function buildPageUrl(bookUrl: string, pageNum: number): string {
  // Pattern 1: الرابط يحتوي /الصفحة_N بالفعل → استبدل الرقم فقط
  if (/\/الصفحة_\d+/.test(bookUrl)) {
    return bookUrl.replace(/\/الصفحة_\d+/, `/الصفحة_${pageNum}`);
  }

  // Pattern 2: الرابط ينتهي بـ / رقم الصفحة → استبدل الرقم
  if (/\/\d+\/?$/.test(bookUrl) && !/الصفحة/.test(bookUrl)) {
    return bookUrl.replace(/\/\d+\/?$/, `/${pageNum}`);
  }

  // Pattern 3: الرابط هو رابط الكتاب الأساسي → أضف /الصفحة_N
  return `${bookUrl}/الصفحة_${pageNum}`;
}

/**
 * تنظيف رابط الكتاب من الصفحات المُضمّنة
 * يُرجع رابط الكتاب الأساسي بدون رقم صفحة
 */
function cleanBookUrl(bookUrl: string): string {
  // أزل /الصفحة_N من الرابط
  return bookUrl.replace(/\/الصفحة_\d+\/?$/, '').replace(/\/\d+\/?$/, '');
}

// === MAIN HANDLER ===
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, page = 1, action = 'content' } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Determine the target URL based on action
    let targetUrl = url;

    if (action === 'content' && page > 0) {
      // إذا الرابط يحتوي بالفعل /الصفحة_، حدّث رقم الصفحة
      if (/\/الصفحة_\d+/.test(url)) {
        targetUrl = buildPageUrl(url, page);
      } else if (!/\/الصفحة_\d+/.test(url)) {
        // رابط كتاب أساسي → أضف رقم الصفحة
        targetUrl = buildPageUrl(url, page);
      }
    }

    // Fetch HTML
    let html = '';
    try {
      html = await fetchHtml(targetUrl);
    } catch (e: any) {
      return NextResponse.json({
        success: false,
        error: `فشل في جلب الصفحة: ${e.message}`,
      }, { status: 200 });
    }

    if (!html || html.length < 100) {
      return NextResponse.json({
        success: false,
        error: 'الصفحة فارغة',
      }, { status: 200 });
    }

    // Extract data based on action
    if (action === 'meta') {
      // Return book metadata and TOC
      const metadata = extractMetadata(html);
      const totalPages = extractTotalPages(html);
      const toc = extractToc(html);
      const baseUrl = cleanBookUrl(targetUrl);

      return NextResponse.json({
        success: true,
        action: 'meta',
        metadata,
        totalPages,
        toc,
        baseUrl,
        url: targetUrl,
      });
    }

    if (action === 'toc') {
      // Return TOC only
      const toc = extractToc(html);
      return NextResponse.json({
        success: true,
        action: 'toc',
        toc,
      });
    }

    // Default: return page content
    const metadata = extractMetadata(html);
    const totalPages = extractTotalPages(html);
    const content = extractPageContent(html);

    if (!content || content.trim().length < 5) {
      return NextResponse.json({
        success: false,
        error: 'لم يتم العثور على محتوى نصي في هذه الصفحة',
        metadata,
        totalPages,
      }, { status: 200 });
    }

    // Extract plain text content for AI summarization
    const textContent = cleanText(content);

    return NextResponse.json({
      success: true,
      action: 'content',
      content,  // Raw HTML content from the page
      textContent,  // Plain text (for AI summarization)
      metadata,
      totalPages,
      currentPage: page,
      url: targetUrl,
    });

  } catch (error: any) {
    console.error('Book Page Error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
