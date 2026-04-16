import { NextRequest, NextResponse } from 'next/server';

// ================================================================
//  محرك استخراج كتب مكتبة الشيعة أونلاين — Regex-Based Parser
//  يوزع صفحة فهرس الكتب ويستخرج الكتب بالتفصيل
// ================================================================

const ARCHIVE_BASE = 'https://web.archive.org/web/20250105004220/http://shiaonlinelibrary.com';

// === User-Agent محاكي متصفح ===
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'identity',
  'Cache-Control': 'no-cache',
};

// === CORS BYPASS PROXY ===
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

  // 1) محاولة مباشرة
  try {
    const res = await fetch(targetUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(20000),
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
        signal: AbortSignal.timeout(25000),
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
 * توزيع صفحة فهرس الكتب واستخراج الكتب من tbody
 */
function parseBooksFromHtml(html: string): Array<{
  id: string;
  title: string;
  author: string;
  part: string;
  url: string;
  pdfUrl: string;
}> {
  const books: Array<{
    id: string;
    title: string;
    author: string;
    part: string;
    url: string;
    pdfUrl: string;
  }> = [];

  // Extract all tbody rows
  const tbodyRegex = /<tbody>([\s\S]*?)<\/tbody>/gi;
  let tbodyMatch;

  while ((tbodyMatch = tbodyRegex.exec(html)) !== null) {
    const tbodyContent = tbodyMatch[1];

    // Extract the <tr> inside this tbody
    const trMatch = tbodyContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
    if (!trMatch) continue;

    const trContent = trMatch[1];

    // Extract all <td> cells
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds: string[] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      tds.push(tdMatch[1]);
    }

    if (tds.length < 4) continue;

    // td[0] = number, td[1] = title+link, td[2] = part, td[3] = author, td[4] = PDF link
    const numberCell = tds[0] || '';
    const titleCell = tds[1] || '';
    const partCell = tds[2] || '';
    const authorCell = tds[3] || '';
    const pdfCell = tds[4] || '';

    // Extract book number
    const bookNum = cleanText(numberCell).trim();

    // Extract title and URL from td[1]
    const linkMatch = titleCell.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    let title = '';
    let bookUrl = '';
    if (linkMatch) {
      bookUrl = linkMatch[1];
      title = cleanText(linkMatch[2]);
    }

    if (!title || title.length < 2) continue;

    // Extract part
    const part = cleanText(partCell).trim();

    // Extract author from td[3]
    const authorLinkMatch = authorCell.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
    let author = '';
    if (authorLinkMatch) {
      author = cleanText(authorLinkMatch[1]).replace(/^&nbsp;/, '').trim();
    }
    if (!author) {
      author = cleanText(authorCell).replace(/^&nbsp;/, '').trim();
    }

    // Extract PDF URL from td[4]
    let pdfUrl = '';
    const pdfLinkMatch = pdfCell.match(/<a[^>]*href="([^"]*)"[^>]*>/i);
    if (pdfLinkMatch) {
      pdfUrl = pdfLinkMatch[1];
    }

    // Convert relative URLs to absolute (archive URLs)
    if (bookUrl && !bookUrl.startsWith('http')) {
      if (bookUrl.startsWith('/web/')) {
        bookUrl = `https://web.archive.org${bookUrl}`;
      } else if (bookUrl.startsWith('/')) {
        // Root-relative URL (e.g., /الكتب/1_القرآن) — prepend Wayback path
        bookUrl = `${ARCHIVE_BASE}${bookUrl}`;
      } else {
        bookUrl = `${ARCHIVE_BASE}/${bookUrl}`;
      }
    }

    if (pdfUrl && !pdfUrl.startsWith('http')) {
      if (pdfUrl.startsWith('/web/')) {
        pdfUrl = `https://web.archive.org${pdfUrl}`;
      } else if (pdfUrl.startsWith('/')) {
        pdfUrl = `${ARCHIVE_BASE}${pdfUrl}`;
      } else {
        pdfUrl = `${ARCHIVE_BASE}/${pdfUrl}`;
      }
    }

    // Validate URL: must contain a book identifier (number_prefix pattern)
    // Skip URLs that don't point to a specific book
    if (!bookUrl || (!/\d+_/.test(bookUrl) && !bookUrl.includes('shiaonlinelibrary'))) continue;

    books.push({
      id: bookNum || `bk-${books.length + 1}`,
      title,
      author,
      part,
      url: bookUrl,
      pdfUrl,
    });
  }

  return books;
}

/**
 * استخراج أقصى رقم صفحة من pager div
 */
function extractTotalPages(html: string): number {
  const pagerRegex = /<div class="pager">([\s\S]*?)<\/div>/i;
  const pagerMatch = pagerRegex.exec(html);
  if (!pagerMatch) return 1;

  const pagerContent = pagerMatch[1];
  // Find all page numbers
  const pageLinks = pagerContent.matchAll(/الصفحة_(\d+)/g);
  let maxPage = 1;
  for (const match of pageLinks) {
    const num = parseInt(match[1], 10);
    if (num > maxPage) maxPage = num;
  }

  // Also check for direct links to الصفحة_N in the page links
  const directPageLinks = pagerContent.matchAll(/class="page"[^>]*>(\d+)/g);
  for (const match of directPageLinks) {
    const num = parseInt(match[1], 10);
    if (num > maxPage) maxPage = num;
  }

  return maxPage;
}

// === MAIN HANDLER ===
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, page = 1, maxPages = 1 } = body;

    // Default URL - books listing page
    let targetUrl = url || `${ARCHIVE_BASE}/الكتب`;

    // If we need to scan a specific page of the listing
    if (page && page > 1 && !url) {
      targetUrl = `${ARCHIVE_BASE}/الكتب/الصفحة_${page}`;
    }

    if (!targetUrl) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
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
        error: 'الصفحة فارغة أو لا تحتوي على محتوى كافٍ',
      }, { status: 200 });
    }

    // Parse books
    const allBooks = parseBooksFromHtml(html);
    const totalPages = extractTotalPages(html);

    if (allBooks.length === 0) {
      return NextResponse.json({
        success: true,
        books: [],
        totalPages,
        currentPage: page,
        message: 'لم يتم العثور على كتب في هذه الصفحة.',
      });
    }

    // Map to response format
    const result = allBooks.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      part: b.part,
      url: b.url,
      pdfUrl: b.pdfUrl,
      selected: true,
      source: 'shia-library',
    }));

    return NextResponse.json({
      success: true,
      books: result,
      total: result.length,
      totalPages,
      currentPage: page,
      source: 'shia-library',
      message: `تم استخراج ${result.length} كتاب من الصفحة ${page}`,
    });

  } catch (error: any) {
    console.error('Scan Error:', error);
    return NextResponse.json({ error: error.message || 'Scraping failed' }, { status: 500 });
  }
}
