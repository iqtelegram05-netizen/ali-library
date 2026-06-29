import { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import CopyWithSourceWrapper from './CopyWithSourceWrapper';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ali-library.vercel.app';

const CATEGORY_LABELS: Record<string, string> = {
  tafsir: 'تفسير',
  aqaid: 'عقائد',
  fiqh: 'فقه',
  mantique: 'منطق',
  falsafa: 'فلسفة',
  tarikh: 'تاريخ',
  dua: 'أدعية',
  other: 'أخرى',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  tafsir: 'تفسير القرآن الكريم وكتب التأويل والمعاني القرآنية',
  aqaid: 'كتب العقائد الإسلامية والكلام والتوحيد والعدل والنبوة والإمامة والمعاد',
  fiqh: 'كتب الفقه الإسلامي والفقه الجعفري والأحكام الشرعية',
  mantique: 'كتب المنطق والعلم الكلامي وأصول الاستدلال',
  falsafa: 'كتب الفلسفة الإسلامية والحكمة والفكر الفلسفي',
  tarikh: 'كتب التاريخ الإسلامي وسيرة الأئمة والأحداث التاريخية',
  dua: 'كتب الأدعية والمناجاة والصحف المقدسة',
  other: 'كتب إسلامية متنوعة في مختلف المجالات',
};

/* ===================================================================
   Fetch book page content from source (server-side)
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
      signal: AbortSignal.timeout(15000),
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
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 100) return text;
      }
    } catch (e) { lastError = e; }
  }

  throw new Error(`Failed to fetch: ${lastError?.message || 'Connection error'}`);
}

function extractMetadata(html: string): { bookTitle: string; author: string; part: string; group: string } {
  const textDivRegex = /<div class="text">\s*([\s\S]*?)\s*<\/div>/i;
  const match = textDivRegex.exec(html);
  if (!match) return { bookTitle: '', author: '', part: '', group: '' };

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

function extractToc(html: string): Array<{ num: number; title: string; page: number }> {
  const tocItems: Array<{ num: number; title: string; page: number }> = [];

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

function buildPageUrl(bookUrl: string, pageNum: number): string {
  if (/\/الصفحة_\d+/.test(bookUrl)) {
    return bookUrl.replace(/\/الصفحة_\d+/, `/الصفحة_${pageNum}`);
  }
  if (/\/\d+\/?$/.test(bookUrl) && !/الصفحة/.test(bookUrl)) {
    return bookUrl.replace(/\/\d+\/?$/, `/${pageNum}`);
  }
  return `${bookUrl}/الصفحة_${pageNum}`;
}

/* ===================================================================
   ISR: revalidate every 24 hours
   =================================================================== */
export const revalidate = 86400;

/* ===================================================================
   Page Props
   =================================================================== */
interface PageProps {
  params: Promise<{ id: string }>;
}

/* ===================================================================
   Generate Metadata (SEO)
   =================================================================== */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) return {};

    const categoryLabel = CATEGORY_LABELS[book.category] || 'أخرى';

    // Try to fetch first page content for description
    let contentPreview = '';
    let totalPages = 0;
    let author = '';
    try {
      const targetUrl = buildPageUrl(book.url, 1);
      const html = await fetchHtml(targetUrl);
      const content = extractPageContent(html);
      const plainText = cleanText(content);
      contentPreview = plainText.substring(0, 180);
      totalPages = extractTotalPages(html);
      const meta = extractMetadata(html);
      author = meta.author;
    } catch {}

    const description = contentPreview
      ? `اقرأ كتاب "${book.name}" ${author ? `للمؤلف ${author}` : ''} في قسم ${categoryLabel}. ${contentPreview}... كتاب إسلامي رقمي مجاني في مكتبة العلي الرقمية.`
      : `اقرأ كتاب "${book.name}" في قسم ${categoryLabel} — مكتبة العلي الرقمية. كتاب إسلامي رقمي متاح للقراءة المجانية عبر الإنترنت.`;

    return {
      title: `${book.name} — قراءة أونلاين | مكتبة العلي الرقمية`,
      description,
      keywords: [
        book.name,
        `كتاب ${book.name}`,
        `${book.name} pdf`,
        `${book.name} قراءة أونلاين`,
        `${book.name} تحميل`,
        author || '',
        categoryLabel,
        `كتب ${categoryLabel}`,
        'مكتبة العلي الرقمية',
        'كتب إسلامية',
        'قراءة كتب دينية أونلاين',
        'فكر شيعي',
        'دراسات إسلامية',
      ].filter(Boolean),
      openGraph: {
        title: `اقرأ "${book.name}" — مكتبة العلي الرقمية`,
        description: contentPreview || `كتاب "${book.name}" — قسم ${categoryLabel} — مكتبة العلي الرقمية. اقرأ هذا الكتاب الإسلامي مجاناً.`,
        url: `${SITE_URL}/book/${book.id}/read`,
        type: 'article',
        locale: 'ar_AR',
        siteName: 'مكتبة العلي الرقمية',
      },
      twitter: {
        card: 'summary_large_image',
        title: `اقرأ "${book.name}" — مكتبة العلي الرقمية`,
        description: contentPreview || `كتاب "${book.name}" — مكتبة العلي الرقمية`,
      },
      alternates: {
        canonical: `${SITE_URL}/book/${book.id}/read`,
      },
    };
  } catch {
    return {};
  }
}

/* ===================================================================
   Main Page Component (SSR)
   =================================================================== */
export default async function BookReadPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch book from DB
  let book;
  try {
    book = await prisma.book.findUnique({ where: { id } });
  } catch {
    notFound();
  }

  if (!book) {
    notFound();
  }

  const categoryLabel = CATEGORY_LABELS[book.category] || 'أخرى';
  const categoryDesc = CATEGORY_DESCRIPTIONS[book.category] || '';

  // Fetch first page content (server-side)
  let firstPageContent = '';
  let firstPageText = '';
  let totalPages = 0;
  let toc: Array<{ num: number; title: string; page: number }> = [];
  let author = '';
  let part = '';
  let group = '';

  try {
    const targetUrl = buildPageUrl(book.url, 1);
    const html = await fetchHtml(targetUrl);
    firstPageContent = extractPageContent(html);
    firstPageText = cleanText(firstPageContent);
    totalPages = extractTotalPages(html);
    const meta = extractMetadata(html);
    author = meta.author;
    part = meta.part;
    group = meta.group;
    toc = extractToc(html);
  } catch {
    // If fetch fails, we still show the book page
  }

  // Get related books
  let relatedBooks: any[] = [];
  try {
    relatedBooks = await prisma.book.findMany({
      where: { category: book.category, id: { not: book.id } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
  } catch {}

  const readerUrl = `/reader?${new URLSearchParams({ url: book.url, title: book.name }).toString()}`;

  // Build content description for SEO (first 500 chars of text)
  const seoTextPreview = firstPageText.length > 200
    ? firstPageText.substring(0, 200)
    : firstPageText;

  return (
    <div dir="rtl" lang="ar" style={{ backgroundColor: '#0a0a0f', color: '#e2e8f0', minHeight: '100vh' }}>
      {/* JSON-LD: Book with content */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Book',
            name: book.name,
            author: author ? { '@type': 'Person', name: author } : undefined,
            url: `${SITE_URL}/book/${book.id}/read`,
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `${SITE_URL}/book/${book.id}/read`,
            },
            isPartOf: {
              '@type': 'WebSite',
              name: 'مكتبة العلي الرقمية',
              url: SITE_URL,
            },
            bookFormat: 'https://schema.org/EBook',
            genre: categoryLabel,
            inLanguage: 'ar',
            numberOfPages: totalPages > 1 ? totalPages : undefined,
            publisher: {
              '@type': 'Organization',
              name: 'مكتبة العلي الرقمية',
              url: SITE_URL,
            },
            description: seoTextPreview || undefined,
          }),
        }}
      />

      {/* Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'الكتب', item: `${SITE_URL}/books` },
              { '@type': 'ListItem', position: 3, name: categoryLabel, item: `${SITE_URL}/category/${book.category}` },
              { '@type': 'ListItem', position: 4, name: book.name, item: `${SITE_URL}/book/${book.id}` },
              { '@type': 'ListItem', position: 5, name: 'قراءة الكتاب', item: `${SITE_URL}/book/${book.id}/read` },
            ],
          }),
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-100 hover:text-emerald-400 transition-colors">
            <span className="text-emerald-400 font-bold text-lg">مكتبة العلي</span>
            <span className="text-gray-500 text-xs">Al-Ali Digital Library</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/books" className="text-gray-400 hover:text-emerald-400 transition-colors">جميع الكتب</Link>
            <Link href="/" className="text-gray-400 hover:text-emerald-400 transition-colors">الرئيسية</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm">
          <ol className="flex items-center gap-2 text-gray-500 flex-wrap">
            <li><Link href="/" className="hover:text-emerald-400">الرئيسية</Link></li>
            <li>/</li>
            <li><Link href="/books" className="hover:text-emerald-400">الكتب</Link></li>
            <li>/</li>
            <li><Link href={`/category/${book.category}`} className="hover:text-emerald-400">{categoryLabel}</Link></li>
            <li>/</li>
            <li><Link href={`/book/${book.id}`} className="hover:text-emerald-400">{book.name}</Link></li>
            <li>/</li>
            <li className="text-gray-300">قراءة</li>
          </ol>
        </nav>

        {/* Book Info Card */}
        <article className="rounded-2xl p-6 sm:p-10 mb-8" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(16,185,129,0.15)' }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              {categoryLabel}
            </span>
            {totalPages > 1 && (
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                {totalPages} صفحة
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-3">{book.name}</h1>

          <div className="flex flex-col gap-2 mb-6 text-sm text-gray-400">
            {author && (
              <p>المؤلف: <span className="text-gray-200">{author}</span></p>
            )}
            {part && (
              <p>الجزء: <span className="text-gray-200">{part}</span></p>
            )}
            {group && (
              <p>المجموعة: <span className="text-gray-200">{group}</span></p>
            )}
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <a
              href={readerUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: '#10b981' }}
            >
              اقرأ الكتاب بالقارئ المتقدم
            </a>
            <Link
              href={`/book/${book.id}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all text-gray-300 hover:text-gray-100"
              style={{ backgroundColor: '#111827', border: '1px solid rgba(16,185,129,0.15)' }}
            >
              صفحة الكتاب
            </Link>
          </div>
        </article>

        {/* Table of Contents */}
        {toc.length > 0 && (
          <section className="rounded-2xl p-6 sm:p-8 mb-8" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(16,185,129,0.1)' }}>
            <h2 className="text-xl font-bold text-gray-100 mb-6">فهرس الكتاب</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {toc.map((item) => (
                <a
                  key={item.num}
                  href={readerUrl}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all hover:bg-[#1a1a2e]"
                  style={{ border: '1px solid rgba(16,185,129,0.05)' }}
                >
                  <span className="text-emerald-400 font-bold text-xs w-6 text-center shrink-0">{item.num}</span>
                  <span className="text-gray-300 flex-1 truncate">{item.title}</span>
                  {item.page > 0 && (
                    <span className="text-gray-500 text-xs shrink-0">ص{item.page}</span>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* First Page Content — This is the KEY SEO section */}
        {firstPageContent && (
          <section className="rounded-2xl mb-8" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(16,185,129,0.1)' }}>
            <div className="px-6 sm:px-10 pt-6 sm:pt-8 pb-2">
              <h2 className="text-xl font-bold text-gray-100 mb-2">بداية الكتاب</h2>
              <p className="text-gray-500 text-xs">الصفحة الأولى من كتاب &ldquo;{book.name}&rdquo;</p>
            </div>
            <CopyWithSourceWrapper
              bookName={book.name}
              bookId={book.id}
              pageNumber={1}
            >
              <div
                className="px-6 sm:px-10 pb-8 sm:pb-10 pt-4 leading-loose text-base sm:text-lg whitespace-pre-wrap break-words rounded-b-2xl"
                style={{
                  backgroundColor: '#111827',
                  color: '#e2e8f0',
                  fontFamily: '"Noto Kufi Arabic", "Amiri", "Traditional Arabic", serif',
                  lineHeight: '2.5',
                  direction: 'rtl',
                  textAlign: 'right',
                }}
                dangerouslySetInnerHTML={{ __html: firstPageContent }}
              />
            </CopyWithSourceWrapper>
          </section>
        )}

        {/* SEO Content Block — keyword-rich text for search engines */}
        <section className="rounded-2xl p-6 sm:p-8 mb-8" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(16,185,129,0.1)' }}>
          <h2 className="text-lg font-bold text-gray-100 mb-4">عن كتاب {book.name}</h2>
          <p className="text-gray-400 text-sm leading-loose mb-4">
            كتاب &ldquo;{book.name}&rdquo; هو أحد الكتب المتوفرة في مكتبة العلي الرقمية، ضمن قسم {categoryLabel}.
            {author && ` تأليف ${author}.`}
            {categoryDesc && ` ${categoryDesc}.`}
            مكتبة العلي الرقمية هي منصة إلكترونية متقدمة تجمع بين التقنية الحديثة والذكاء الاصطناعي لتقديم تجربة قراءة رقمية فريدة للكتب الإسلامية.
          </p>
          <p className="text-gray-400 text-sm leading-loose mb-4">
            يتميز كتاب &ldquo;{book.name}&rdquo; بكونه متاحاً للقراءة المجانية عبر الإنترنت في أي وقت ومن أي مكان.
            يمكنك تصفح صفحات الكتاب والتنقل بينها بسهولة، مع إمكانية استخدام أدوات الذكاء الاصطناعي المتوفرة في المنصة مثل التلخيص الذكي للصفحات والبحث المتقدم في المحتوى.
          </p>

          {seoTextPreview && (
            <p className="text-gray-400 text-sm leading-loose mb-4">
              يبدأ الكتاب بمقدمة تتضمن: &ldquo;{seoTextPreview}&rdquo;
            </p>
          )}

          <p className="text-gray-400 text-sm leading-loose">
            مكتبة العلي الرقمية تهدف إلى نشر المعارف الإسلامية وتسهيل الوصول إلى التراث الفكري لأهل البيت (ع)
            والعلماء المسلمين عبر التاريخ. تشمل المنصة كتب التفسير والعقائد والفقه والمنطق والفلسفة والتاريخ والأدعية.
            انضم إلينا واستفد من هذه المجموعة الشاملة من الكتب الإسلامية الرقمية.
          </p>
        </section>

        {/* Related Books */}
        {relatedBooks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-100 mb-6">كتب مشابهة في قسم {categoryLabel}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedBooks.map((rb: any) => (
                <a
                  key={rb.id}
                  href={`/book/${rb.id}/read`}
                  className="block rounded-xl p-4 transition-all hover:shadow-lg"
                  style={{ backgroundColor: '#0d1117', border: '1px solid rgba(16,185,129,0.1)' }}
                >
                  <h3 className="text-gray-200 font-medium text-sm mb-2">{rb.name}</h3>
                  <span className="text-gray-500 text-xs">{CATEGORY_LABELS[rb.category] || 'أخرى'}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6" style={{ borderTop: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">مكتبة العلي الرقمية — Al-Ali Digital Library</p>
          <nav className="flex justify-center gap-4 mt-3 text-xs">
            <Link href="/" className="text-gray-400 hover:text-emerald-400">الرئيسية</Link>
            <Link href="/books" className="text-gray-400 hover:text-emerald-400">جميع الكتب</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
