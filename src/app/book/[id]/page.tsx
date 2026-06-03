import { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

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

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) return {};

    const categoryLabel = CATEGORY_LABELS[book.category] || 'أخرى';

    return {
      title: book.name,
      description: `اقرأ كتاب "${book.name}" في قسم ${categoryLabel} — مكتبة العلي الرقمية. كتاب إسلامي رقمي متاح للقراءة المجانية عبر الإنترنت.`,
      keywords: [
        book.name,
        `كتاب ${book.name}`,
        `${book.name} pdf`,
        `${book.name} قراءة أونلاين`,
        categoryLabel,
        `كتب ${categoryLabel}`,
        'مكتبة العلي الرقمية',
        'كتب إسلامية',
        'قراءة كتب دينية',
      ],
      openGraph: {
        title: book.name,
        description: `كتاب "${book.name}" — قسم ${categoryLabel} — مكتبة العلي الرقمية. اقرأ هذا الكتاب الإسلامي مجاناً.`,
        url: `${SITE_URL}/book/${book.id}`,
        type: 'article',
        locale: 'ar_AR',
        siteName: 'مكتبة العلي الرقمية',
      },
      twitter: {
        card: 'summary_large_image',
        title: book.name,
        description: `كتاب "${book.name}" — مكتبة العلي الرقمية`,
      },
      alternates: {
        canonical: `${SITE_URL}/book/${book.id}`,
      },
    };
  } catch {
    return {};
  }
}

export default async function BookPage({ params }: PageProps) {
  const { id } = await params;

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
  const readerUrl = `/reader?${new URLSearchParams({ url: book.url, title: book.name }).toString()}`;

  // Get related books in the same category
  let relatedBooks = [];
  try {
    relatedBooks = await prisma.book.findMany({
      where: { category: book.category, id: { not: book.id } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
  } catch {}

  return (
    <div dir="rtl" lang="ar" style={{ backgroundColor: '#0a0a0f', color: '#e2e8f0', minHeight: '100vh' }}>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Book',
            name: book.name,
            url: `${SITE_URL}/book/${book.id}`,
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `${SITE_URL}/book/${book.id}`,
            },
            isPartOf: {
              '@type': 'WebSite',
              name: 'مكتبة العلي الرقمية',
              url: SITE_URL,
            },
            bookFormat: 'https://schema.org/EBook',
            genre: categoryLabel,
            inLanguage: 'ar',
            publisher: {
              '@type': 'Organization',
              name: 'مكتبة العلي الرقمية',
              url: SITE_URL,
            },
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
              {
                '@type': 'ListItem',
                position: 1,
                name: 'الرئيسية',
                item: SITE_URL,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'الكتب',
                item: `${SITE_URL}/books`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: categoryLabel,
                item: `${SITE_URL}/category/${book.category}`,
              },
              {
                '@type': 'ListItem',
                position: 4,
                name: book.name,
                item: `${SITE_URL}/book/${book.id}`,
              },
            ],
          }),
        }}
      />

      {/* Header / Navigation */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-gray-100 hover:text-emerald-400 transition-colors">
              <span className="text-emerald-400 font-bold text-lg">مكتبة العلي</span>
              <span className="text-gray-500 text-xs">Al-Ali Digital Library</span>
            </Link>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/books" className="text-gray-400 hover:text-emerald-400 transition-colors">جميع الكتب</Link>
            <Link href="/" className="text-gray-400 hover:text-emerald-400 transition-colors">الرئيسية</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm">
          <ol className="flex items-center gap-2 text-gray-500">
            <li><Link href="/" className="hover:text-emerald-400">الرئيسية</Link></li>
            <li>/</li>
            <li><Link href="/books" className="hover:text-emerald-400">الكتب</Link></li>
            <li>/</li>
            <li><Link href={`/category/${book.category}`} className="hover:text-emerald-400">{categoryLabel}</Link></li>
            <li>/</li>
            <li className="text-gray-300">{book.name}</li>
          </ol>
        </nav>

        {/* Book Card */}
        <article className="rounded-2xl p-6 sm:p-10" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(16,185,129,0.15)' }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              {categoryLabel}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-4">{book.name}</h1>

          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            كتاب &ldquo;{book.name}&rdquo; — من قسم {categoryLabel}. {categoryDesc}. اقرأ هذا الكتاب مجاناً في مكتبة العلي الرقمية، مكتبة إسلامية رقمية شاملة متخصصة في الدراسات الإسلامية والفكر الشيعي الإمامي.
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <a
              href={readerUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-medium transition-all"
              style={{ backgroundColor: '#10b981' }}
            >
              اقرأ الكتاب الآن
            </a>
            <Link
              href={`/category/${book.category}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all text-gray-300 hover:text-gray-100"
              style={{ backgroundColor: '#111827', border: '1px solid rgba(16,185,129,0.15)' }}
            >
              تصفح قسم {categoryLabel}
            </Link>
          </div>
        </article>

        {/* Related Books */}
        {relatedBooks.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-100 mb-6">كتب مشابهة في قسم {categoryLabel}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedBooks.map((rb: any) => (
                <a
                  key={rb.id}
                  href={`/book/${rb.id}`}
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

        {/* SEO Content Block */}
        <section className="mt-10 rounded-2xl p-6 sm:p-8" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(16,185,129,0.1)' }}>
          <h2 className="text-lg font-bold text-gray-100 mb-4">عن كتاب {book.name}</h2>
          <p className="text-gray-400 text-sm leading-loose mb-4">
            كتاب &ldquo;{book.name}&rdquo; هو أحد الكتب المتوفرة في مكتبة العلي الرقمية، ضمن قسم {categoryLabel}.
            مكتبة العلي الرقمية هي منصة إلكترونية متقدمة تجمع بين التقنية الحديثة والذكاء الاصطناعي لتقديم تجربة قراءة رقمية فريدة للكتب الإسلامية.
            تضم المنصة مئات الكتب في مختلف المجالات الإسلامية بما في ذلك التفسير والعقائد والفقه والمنطق والفلسفة والتاريخ والأدعية.
          </p>
          <p className="text-gray-400 text-sm leading-loose mb-4">
            يتميز كتاب &ldquo;{book.name}&rdquo; بكونه متاحاً للقراءة المجانية عبر الإنترنت في أي وقت ومن أي مكان.
            يمكنك تصفح صفحات الكتاب والتنقل بينها بسهولة، مع إمكانية استخدام أدوات الذكاء الاصطناعي المتوفرة في المنصة
            مثل التلخيص الذكي للصفحات والبحث المتقدم في المحتوى.
          </p>
          <p className="text-gray-400 text-sm leading-loose">
            مكتبة العلي الرقمية تهدف إلى نشر المعارف الإسلامية وتسهيل الوصول إلى التراث الفكري لأهل البيت (ع)
            والعلماء المسلمين عبر التاريخ. انضم إلينا واستفد من هذه المجموعة الشاملة من الكتب الإسلامية الرقمية.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6" style={{ borderTop: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            مكتبة العلي الرقمية — Al-Ali Digital Library
          </p>
          <nav className="flex justify-center gap-4 mt-3 text-xs">
            <Link href="/" className="text-gray-400 hover:text-emerald-400">الرئيسية</Link>
            <Link href="/books" className="text-gray-400 hover:text-emerald-400">جميع الكتب</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
