import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/* ===================================================================
   Helpers — fetching & parsing book pages (shared with book-page)
   =================================================================== */

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

async function fetchHtml(targetUrl: string): Promise<string> {
  let lastError: any = null;

  try {
    const res = await fetch(targetUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(12000),
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
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 100) return text;
      }
    } catch (e) { lastError = e; }
  }

  throw new Error(`Failed to fetch: ${lastError?.message || 'Connection error'}`);
}

function extractTotalPages(html: string): number {
  let maxPage = 1;
  const pagerRegex = /<div class="pager">([\s\S]*?)<\/div>/i;
  const pagerMatch = pagerRegex.exec(html);

  if (pagerMatch) {
    const pagerContent = pagerMatch[1];
    const pageLinksArabic = pagerContent.matchAll(/الصفحة_(\d+)/g);
    for (const m of pageLinksArabic) {
      const num = parseInt(m[1], 10);
      if (num > maxPage) maxPage = num;
    }
    const directPageLinks = pagerContent.matchAll(/class="page"[^>]*>\s*(\d+)\s*</g);
    for (const m of directPageLinks) {
      const num = parseInt(m[1], 10);
      if (num > maxPage) maxPage = num;
    }
  }

  if (maxPage <= 1) {
    const allPageRefs = html.matchAll(/الصفحة_(\d+)/g);
    for (const m of allPageRefs) {
      const num = parseInt(m[1], 10);
      if (num > maxPage) maxPage = num;
    }
  }

  return maxPage;
}

function extractPageContent(html: string): string {
  const pageDivStart = html.indexOf('<div class="page">');

  if (pageDivStart !== -1) {
    const contentStart = pageDivStart + '<div class="page">'.length;
    const pagerStart = html.indexOf('<div class="pager">', contentStart);

    let contentEnd = html.length;
    if (pagerStart !== -1) {
      contentEnd = pagerStart;
    }

    let pageContent = html.substring(contentStart, contentEnd).trim();

    if (pageContent.endsWith('</div>')) {
      pageContent = pageContent.slice(0, -6).trim();
    }

    const metadataPatterns = /الكتاب:\s*<?[^>]*>|المؤلف:\s*<?[^>]*>|الجزء:\s*<?[^>]*>|المجموعة:\s*<?[^>]*>/;
    const firstTextDiv = pageContent.match(/<div class="text">([\s\S]*?)<\/div>/i);
    if (firstTextDiv && metadataPatterns.test(firstTextDiv[1])) {
      pageContent = pageContent.replace(/<div class="text">[\s\S]*?<\/div>\s*/, '');
    }

    pageContent = pageContent.replace(/<a name="top"><\/a>\s*/gi, '');

    if (pageContent.trim().length > 5) {
      return pageContent.trim();
    }
  }

  const textDivs = [...html.matchAll(/<div class="(text|quran)">([\s\S]*?)<\/div>\s*<\/div>/gi)];
  for (const match of textDivs) {
    const content = match[2].trim();
    if (content.length > 20 && !/الكتاب:|المؤلف:|الجزء:|المجموعة:/.test(content)) {
      return content;
    }
  }

  const allTextDivs = [...html.matchAll(/<div class="text">([\s\S]*?)<\/div>/gi)];
  for (const match of allTextDivs) {
    const content = match[1].trim();
    if (content.length > 20 && !/الكتاب:|المؤلف:|الجزء:|المجموعة:/.test(content)) {
      return content;
    }
  }
  if (allTextDivs.length >= 1) {
    return allTextDivs[0][1].trim();
  }

  return '';
}

function buildPageUrl(bookUrl: string, pageNum: number): string {
  if (/\/الصفحة_\d+/.test(bookUrl)) {
    return bookUrl.replace(/\/الصفحة_\d+/, `/الصفحة_${pageNum}`);
  }
  if (/\/\d+\/?$/.test(bookUrl) && !/الصفحة/.test(bookUrl)) {
    return bookUrl.replace(/\/\d+\/?$/, `/${pageNum}`);
  }
  return `${bookUrl}/الصفحة_${pageNum}`;
}

/**
 * استخراج مقطع نصي حول الكلمة المطابقة مع تمييزها
 */
function extractSnippet(text: string, query: string, contextChars: number = 80): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) return text.substring(0, 150) + '...';

  let start = Math.max(0, idx - contextChars);
  let end = Math.min(text.length, idx + query.length + contextChars);

  // Don't cut in the middle of a word
  if (start > 0) {
    const spaceIdx = text.indexOf(' ', start);
    if (spaceIdx !== -1 && spaceIdx < start + 20) start = spaceIdx + 1;
  }
  if (end < text.length) {
    const spaceIdx = text.lastIndexOf(' ', end);
    if (spaceIdx !== -1 && spaceIdx > end - 20) end = spaceIdx;
  }

  let snippet = '';
  if (start > 0) snippet += '... ';
  snippet += text.substring(start, end);
  if (end < text.length) snippet += ' ...';

  return snippet;
}

/* ===================================================================
   MAIN SEARCH HANDLER
   =================================================================== */

// Maximum pages to search per book
const MAX_PAGES_PER_BOOK = 15;
// Maximum concurrent fetches
const MAX_CONCURRENT = 3;

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || '';
    const mode = req.nextUrl.searchParams.get('mode') || 'name'; // 'name' or 'content'

    if (!q.trim()) {
      // No query: return ALL books for grouped display
      const books = await prisma.book.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ success: true, books, query: '', total: books.length });
    }

    const trimmedQ = q.trim();

    if (mode === 'content') {
      // ========================================
      // بحث في محتويات الكتب (البحث المتقدم)
      // ========================================
      return await searchInContent(trimmedQ);
    } else {
      // ========================================
      // بحث بالاسم (الافتراضي)
      // ========================================
      const books = await prisma.book.findMany({
        where: {
          name: {
            contains: trimmedQ,
            mode: 'insensitive',
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ success: true, books, query: trimmedQ, total: books.length, mode: 'name' });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

/**
 * Search inside book contents — fetches pages concurrently and searches for the query
 */
async function searchInContent(query: string): Promise<NextResponse> {
  // Get all books from DB
  const books = await prisma.book.findMany({
    orderBy: { createdAt: 'desc' },
  });

  if (books.length === 0) {
    return NextResponse.json({ success: true, results: [], query, total: 0, mode: 'content' });
  }

  // Also do a name search in parallel
  const nameMatches = books.filter(b =>
    b.name.toLowerCase().includes(query.toLowerCase())
  );

  // Content search results
  interface ContentResult {
    bookId: string;
    bookName: string;
    bookUrl: string;
    category: string;
    pageNumber: number;
    snippet: string;
    matchType: 'content';
  }

  const contentResults: ContentResult[] = [];
  const errors: string[] = [];

  // Process books in batches to avoid overwhelming the server
  for (let i = 0; i < books.length; i += MAX_CONCURRENT) {
    const batch = books.slice(i, i + MAX_CONCURRENT);
    const promises = batch.map(async (book) => {
      try {
        // First, get total pages from page 1
        const firstPageUrl = buildPageUrl(book.url, 1);
        let html = '';
        try {
          html = await fetchHtml(firstPageUrl);
        } catch {
          return;
        }

        const totalPages = extractTotalPages(html);
        const pagesToSearch = Math.min(totalPages, MAX_PAGES_PER_BOOK);

        // Search first page content immediately (we already have it)
        const firstPageContent = cleanText(extractPageContent(html));
        if (firstPageContent.toLowerCase().includes(query.toLowerCase())) {
          const snippet = extractSnippet(firstPageContent, query);
          contentResults.push({
            bookId: book.id,
            bookName: book.name,
            bookUrl: book.url,
            category: book.category,
            pageNumber: 1,
            snippet,
            matchType: 'content',
          });
        }

        // Search additional pages (skip page 1, we already checked it)
        // Use sampling for large books: pick strategic pages
        const pagesToCheck: number[] = [];
        if (pagesToSearch > 2) {
          // Always check pages 2-5 first, then sample the rest
          for (let p = 2; p <= Math.min(5, pagesToSearch); p++) {
            pagesToCheck.push(p);
          }
          // Sample remaining pages evenly
          if (pagesToSearch > 5) {
            const step = Math.max(1, Math.floor((pagesToSearch - 5) / 8));
            for (let p = 5 + step; p <= pagesToSearch; p += step) {
              pagesToCheck.push(p);
            }
          }
        } else if (pagesToSearch === 2) {
          pagesToCheck.push(2);
        }

        // Fetch and search sampled pages concurrently
        const pagePromises = pagesToCheck.map(async (pageNum) => {
          try {
            const pageUrl = buildPageUrl(book.url, pageNum);
            const pageHtml = await fetchHtml(pageUrl);
            const pageContent = cleanText(extractPageContent(pageHtml));

            if (pageContent.toLowerCase().includes(query.toLowerCase())) {
              const snippet = extractSnippet(pageContent, query);
              contentResults.push({
                bookId: book.id,
                bookName: book.name,
                bookUrl: book.url,
                category: book.category,
                pageNumber: pageNum,
                snippet,
                matchType: 'content',
              });
            }
          } catch {
            // Skip failed pages silently
          }
        });

        await Promise.allSettled(pagePromises);
      } catch {
        // Skip failed books
      }
    });

    await Promise.allSettled(promises);

    // Early exit if we already have enough results
    if (contentResults.length >= 30) break;
  }

  // Sort: name matches first, then content matches
  // Also add name-match results as content results with page 1
  const nameResultsAsContent: ContentResult[] = nameMatches
    .filter(nm => !contentResults.some(cr => cr.bookId === nm.id))
    .map(nm => ({
      bookId: nm.id,
      bookName: nm.name,
      bookUrl: nm.url,
      category: nm.category,
      pageNumber: 1,
      snippet: `كتاب مطابق لاسم البحث: "${nm.name}"`,
      matchType: 'content' as const,
    }));

  const allResults = [...nameResultsAsContent, ...contentResults];

  return NextResponse.json({
    success: true,
    results: allResults,
    query,
    total: allResults.length,
    mode: 'content',
    booksSearched: books.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}