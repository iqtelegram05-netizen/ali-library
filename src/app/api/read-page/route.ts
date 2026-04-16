import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// === CORS BYPASS PROXY ===
const PROXY_SERVICES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function fetchViaProxy(targetUrl: string): Promise<string> {
  let lastError: any = null;

  // 1) Try direct fetch
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'ar,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 100) return text;
    }
  } catch (e) { lastError = e; }

  // 2) Try each proxy
  for (const makeProxy of PROXY_SERVICES) {
    try {
      const proxyUrl = makeProxy(targetUrl);
      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 100) return text;
      }
    } catch (e) { lastError = e; }
  }

  throw new Error(`فشل في جلب المحتوى: ${lastError?.message || 'تعذر الاتصال'}`);
}

/**
 * Live Viewing System - يجلب النص من صفحة ويب ويعرضه في نافذة القراءة
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    try { new URL(url); } catch { return NextResponse.json({ error: 'Invalid URL' }, { status: 400 }); }

    // Fetch page via proxy
    let html = '';
    try {
      html = await fetchViaProxy(url);
    } catch (fetchError: any) {
      return NextResponse.json({
        success: false,
        error: `فشل في الاتصال: ${fetchError.message || 'تعذر الوصول'}`
      }, { status: 200 });
    }

    if (!html || html.length < 50) {
      return NextResponse.json({
        success: false,
        error: 'الصفحة فارغة'
      }, { status: 200 });
    }

    // Parse HTML
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, noscript, .ads, .ad, .sidebar, .menu, .navigation, .comment, .comments, .share, .social, .widget').remove();

    // Find main content
    let $content = $('article, main, .content, .post-content, .entry-content, .page-content, .book-content, #content, .text-content, .story-body, .article-body');
    if ($content.length === 0) {
      $content = $('body');
    }

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || '';

    // Extract text with structure
    const paragraphs: string[] = [];

    $content.find('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, dd, dt').each((_, el) => {
      const tag = el.tagName;
      const text = $(el).text().trim();
      if (text.length > 15) {
        const cleanText = text.replace(/\s+/g, ' ').trim();
        if (!paragraphs.includes(cleanText)) {
          paragraphs.push(`[${tag}] ${cleanText}`);
        }
      }
    });

    // Fallback: get all text
    if (paragraphs.length === 0) {
      const allText = $content.text().trim();
      if (allText) {
        const lines = allText.split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 15);
        paragraphs.push(...lines.slice(0, 300));
      }
    }

    // Extract sub-links for navigation
    const subLinks: Array<{ name: string; url: string }> = [];
    $content.find('a[href]').each((_, el) => {
      const $el = $(el);
      const name = $el.text().trim();
      const href = $el.attr('href') || '';
      if (name.length > 2 && name.length < 100 && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const fullUrl = new URL(href, url).href;
          subLinks.push({ name, url: fullUrl });
        } catch {}
      }
    });

    const contentText = paragraphs.join('\n\n');

    if (!contentText || contentText.length < 30) {
      return NextResponse.json({
        success: false,
        error: 'لم يتم العثور على محتوى نصي. قد تكون صفحة PDF أو صور.'
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      title,
      content: contentText,
      wordCount: contentText.split(/\s+/).length,
      paragraphCount: paragraphs.length,
      subLinks: subLinks.slice(0, 50),
      sourceUrl: url,
    });

  } catch (error: any) {
    console.error('Read Page Error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
