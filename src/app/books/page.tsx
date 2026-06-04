import { Metadata } from 'next';
import { prisma } from '@/lib/db';
import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ali-library.vercel.app';

const CATEGORIES: Record<string, string> = {
  tafsir: 'تفسير',
  aqaid: 'عقائد',
  fiqh: 'فقه',
  mantique: 'منطق',
  falsafa: 'فلسفة',
  tarikh: 'تاريخ',
  dua: 'أدعية',
  other: 'أخرى',
};

export const metadata: Metadata = {
  title: 'جميع الكتب — مكتبة العلي الرقمية',
  description:
    'تصفح جميع الكتب المتوفرة في مكتبة العلي الرقمية. مكتبة شاملة للكتب الإسلامية في التفسير والعقائد والفقه والمنطق والفلسفة والتاريخ والأدعية. قراءة مجانية مباشرة.',
  keywords: [
    'كتب إسلامية',
    'مكتبة رقمية',
    'كتب شيعية',
    'كتب دينية',
    'قراءة كتب أونلاين',
    'مكتبة العلي الرقمية',
    'تفسير',
    'عقائد',
    'فقه',
    'منطق',
    'فلسفة',
    'تاريخ',
    'أدعية',
  ],
  openGraph: {
    title: 'جميع الكتب — مكتبة العلي الرقمية',
    description: 'تصفح مكتبة شاملة من الكتب الإسلامية في مختلف المجالات. قراءة مجانية مباشرة.',
    url: `${SITE_URL}/books`,
    type: 'website',
    locale: 'ar_AR',
    siteName: 'مكتبة العلي الرقمية',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'جميع الكتب — مكتبة العلي الرقمية',
    description: 'تصفح مكتبة شاملة من الكتب الإسلامية في مختلف المجالات.',
  },
  alternates: {
    canonical: `${SITE_URL}/books`,
  },
};

export default async function BooksPage() {
  let books: any[] = [];
  try {
    books = await prisma.book.findMany({
      orderBy: { createdAt: 'desc' },
    });
  } catch {}

  // Group books by category
  const grouped: Record<string, any[]> = {};
  for (const book of books) {
    const cat = book.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(book);
  }

  // Category stats
  const categoryStats = Object.entries(grouped).map(([cat, bks]) => ({
    slug: cat,
    label: CATEGORIES[cat] || 'أخرى',
    count: bks.length,
  }));

  return (
    <div dir="rtl" lang="ar" style={{ backgroundColor: '#0a0a0f', color: '#e2e8f0', minHeight: '100vh' }}>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'جميع الكتب — مكتبة العلي الرقمية',
            description: 'مكتبة شاملة للكتب الإسلامية الرقمية في مختلف المجالات',
            url: `${SITE_URL}/books`,
            isPartOf: {
              '@type': 'WebSite',
              name: 'مكتبة العلي الرقمية',
              url: SITE_URL,
            },
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: books.length,
              itemListElement: books.slice(0, 50).map((book, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${SITE_URL}/book/${book.id}`,
                name: book.name,
              })),
            },
          }),
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-100 hover:text-emerald-400 transition-colors">
            <span className="text-emerald-400 font-bold text-lg">مكتبة العلي</span>
            <span className="text-gray-500 text-xs">Al-Ali Digital Library</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-gray-400 hover:text-emerald-400">الرئيسية</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm">
          <ol className="flex items-center gap-2 text-gray-500">
            <li><Link href="/" className="hover:text-emerald-400">الرئيسية</Link></li>
            <li>/</li>
            <li className="text-gray-300">جميع الكتب</li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-3">جميع الكتب</h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
            تصفح جميع الكتب المتوفرة في مكتبة العلي الرقمية. مكتبة شاملة تضم كتب التفسير والعقائد والفقه والمنطق والفلسفة والتاريخ والأدعية.
          </p>
          <p className="text-emerald-400 text-xs mt-2">{books.length} كتاب متاح في المكتبة</p>
        </div>

        {/* Category Stats */}
        <div className="flex flex-wrap gap-3 mb-10">
          {categoryStats.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all text-gray-300 hover:text-gray-100"
              style={{ backgroundColor: '#111827', border: '1px solid rgba(16,185,129,0.15)' }}
            >
              {cat.label} ({cat.count})
            </Link>
          ))}
        </div>

        {/* Books by Category */}
        {Object.entries(grouped).map(([slug, bks]) => (
          <section key={slug} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-100">
                {CATEGORIES[slug] || 'أخرى'}
                <span className="text-gray-500 text-sm font-normal mr-2">({bks.length} كتاب)</span>
              </h2>
              <Link href={`/category/${slug}`} className="text-emerald-400 text-xs hover:underline">عرض الكل</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bks.map((book: any) => (
                <a
                  key={book.id}
                  href={`/book/${book.id}`}
                  className="block rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-emerald-500/5"
                  style={{ backgroundColor: '#0d1117', border: '1px solid rgba(16,185,129,0.1)' }}
                >
                  <h3 className="text-gray-200 font-bold text-sm mb-3 leading-relaxed">{book.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">{CATEGORIES[slug] || 'أخرى'}</span>
                    <span className="text-emerald-400 text-xs font-medium">اقرأ الكتاب</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}

        {books.length === 0 && (
          <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(16,185,129,0.1)' }}>
            <p className="text-gray-400 text-sm">لا توجد كتب في المكتبة حالياً</p>
          </div>
        )}
      </main>

      <footer className="mt-12 py-6" style={{ borderTop: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">مكتبة العلي الرقمية — Al-Ali Digital Library</p>
        </div>
      </footer>
    </div>
  );
}
