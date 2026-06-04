import { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ali-library.vercel.app';

const CATEGORIES: Record<string, { label: string; description: string; longDescription: string; keywords: string[] }> = {
  tafsir: {
    label: 'تفسير',
    description: 'قراءة كتب تفسير القرآن الكريم — مكتبة العلي الرقمية',
    longDescription: 'مجموعة شاملة من كتب تفسير القرآن الكريم والمعاني والتأويلات القرآنية. تضم التفاسير الشيعية والتفاسير العامة مع إمكانية القراءة المباشرة والبحث في النصوص.',
    keywords: ['تفسير القرآن', 'كتب التفسير', 'تفسير شيعي', 'معاني القرآن', 'تأويل القرآن', 'تفاسير إسلامية'],
  },
  aqaid: {
    label: 'عقائد',
    description: 'قراءة كتب العقائد الإسلامية والكلام — مكتبة العلي الرقمية',
    longDescription: 'مكتبة واسعة من كتب العقائد الإسلامية والكلام والتوحيد والعدل والنبوة والإمامة والمعاد. تشمل كتب علم الكلام والحوار العقائدي والدفاع عن المذهب.',
    keywords: ['عقائد إسلامية', 'كتاب عقائد', 'علم الكلام', 'توحيد', 'إمامة', 'فكر شيعي', 'عقائد الشيعة'],
  },
  fiqh: {
    label: 'فقه',
    description: 'قراءة كتب الفقه الإسلامي والفقه الجعفري — مكتبة العلي الرقمية',
    longDescription: 'مجموعة كبيرة من كتب الفقه الإسلامي على مذهب أهل البيت (ع). تشمل كتب الفقه الاستدلالي والفقه المقارن والأحكام الشرعية في مختلف أبواب الفقه.',
    keywords: ['فقه إسلامي', 'فقه جعفري', 'كتب فقه', 'أحكام شرعية', 'فقه الشيعة', 'فقه أهل البيت'],
  },
  mantique: {
    label: 'منطق',
    description: 'قراءة كتب المنطق وأصول الاستدلال — مكتبة العلي الرقمية',
    longDescription: 'كتب المنطق الإسلامي وأصول الاستدلال والفكر المنطقي. تشمل المنطق الأرسطي والتطورات التي أضافها العلماء المسلمون في مجال المنطق والاستدلال.',
    keywords: ['كتب منطق', 'منطق إسلامي', 'أصول الاستدلال', 'علم المنطق', 'فكر منطقي'],
  },
  falsafa: {
    label: 'فلسفة',
    description: 'قراءة كتب الفلسفة الإسلامية والحكمة — مكتبة العلي الرقمية',
    longDescription: 'مجموعة قيمة من كتب الفلسفة الإسلامية والحكمة والفكر الفلسفي عبر العصور الإسلامية. تشمل الفلسفة المشائية والإشراقية والفلسفة الإسلامية المتأخرة.',
    keywords: ['فلسفة إسلامية', 'كتب فلسفة', 'حكمة إسلامية', 'فكر فلسفي', 'فلسفة مسلمين'],
  },
  tarikh: {
    label: 'تاريخ',
    description: 'قراءة كتب التاريخ الإسلامي والسير — مكتبة العلي الرقمية',
    longDescription: 'مكتبة شاملة في التاريخ الإسلامي وسيرة الأئمة والأحداث التاريخية الكبرى. من صدر الإسلام إلى العصور المتأخرة، مع روايات مدققة ومصادر موثوقة.',
    keywords: ['تاريخ الإسلام', 'كتب تاريخ', 'سيرة الأئمة', 'تاريخ شيعي', 'أحداث إسلامية', 'تراجم'],
  },
  dua: {
    label: 'أدعية',
    description: 'قراءة كتب الأدعية والمناجات — مكتبة العلي الرقمية',
    longDescription: 'مجموعة ثمينة من كتب الأدعية والمناجاة والصحف المقدسة. تضم أدعية الأئمة من أهل البيت (ع) والصحيفة السجادية والأدعية المأثورة مع شرحها وتفسيرها.',
    keywords: ['أدعية إسلامية', 'كتب أدعية', 'الصحيفة السجادية', 'مناجاة', 'دعاء', 'أدعية أهل البيت'],
  },
  other: {
    label: 'أخرى',
    description: 'كتب إسلامية متنوعة — مكتبة العلي الرقمية',
    longDescription: 'مجموعة متنوعة من الكتب الإسلامية التي لا تنضوي تحت تصنيف محدد. تشمل كتباً في مختلف المجالات الإسلامية والثقافية والعلمية.',
    keywords: ['كتب إسلامية', 'مكتبة رقمية', 'كتب دينية متنوعة', 'مراجع إسلامية'],
  },
};

const VALID_SLUGS = Object.keys(CATEGORIES);

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORIES[slug];
  if (!cat) return {};

  return {
    title: `كتب ${cat.label} — مكتبة العلي الرقمية`,
    description: cat.longDescription,
    keywords: [...cat.keywords, 'مكتبة العلي الرقمية', 'كتب إسلامية', 'Al-Ali Digital Library'],
    openGraph: {
      title: `كتب ${cat.label} — مكتبة العلي الرقمية`,
      description: cat.longDescription,
      url: `${SITE_URL}/category/${slug}`,
      type: 'website',
      locale: 'ar_AR',
      siteName: 'مكتبة العلي الرقمية',
    },
    twitter: {
      card: 'summary_large_image',
      title: `كتب ${cat.label} — مكتبة العلي الرقمية`,
      description: cat.description,
    },
    alternates: {
      canonical: `${SITE_URL}/category/${slug}`,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const cat = CATEGORIES[slug];

  if (!cat) {
    notFound();
  }

  let books: any[] = [];
  try {
    books = await prisma.book.findMany({
      where: { category: slug },
      orderBy: { createdAt: 'desc' },
    });
  } catch {}

  // Get count for each category for navigation
  let categoryCounts: Record<string, number> = {};
  try {
    const allBooks = await prisma.book.groupBy({
      by: ['category'],
      _count: true,
    });
    for (const b of allBooks) {
      categoryCounts[b.category] = b._count;
    }
  } catch {}

  return (
    <div dir="rtl" lang="ar" style={{ backgroundColor: '#0a0a0f', color: '#e2e8f0', minHeight: '100vh' }}>
      {/* JSON-LD Collection Page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `كتب ${cat.label}`,
            description: cat.longDescription,
            url: `${SITE_URL}/category/${slug}`,
            isPartOf: {
              '@type': 'WebSite',
              name: 'مكتبة العلي الرقمية',
              url: SITE_URL,
            },
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: books.length,
              itemListElement: books.slice(0, 20).map((book, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${SITE_URL}/book/${book.id}`,
                name: book.name,
              })),
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
              { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'الكتب', item: `${SITE_URL}/books` },
              { '@type': 'ListItem', position: 3, name: cat.label, item: `${SITE_URL}/category/${slug}` },
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
            <Link href="/books" className="text-gray-400 hover:text-emerald-400">جميع الكتب</Link>
            <Link href="/" className="text-gray-400 hover:text-emerald-400">الرئيسية</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm">
          <ol className="flex items-center gap-2 text-gray-500">
            <li><Link href="/" className="hover:text-emerald-400">الرئيسية</Link></li>
            <li>/</li>
            <li><Link href="/books" className="hover:text-emerald-400">الكتب</Link></li>
            <li>/</li>
            <li className="text-gray-300">{cat.label}</li>
          </ol>
        </nav>

        {/* Category Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-3">كتب {cat.label}</h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">{cat.longDescription}</p>
          <p className="text-emerald-400 text-xs mt-2">{books.length} كتاب متاح</p>
        </div>

        {/* Category Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {VALID_SLUGS.map((s) => {
            const c = CATEGORIES[s];
            const count = categoryCounts[s] || 0;
            const isActive = s === slug;
            return (
              <Link
                key={s}
                href={`/category/${s}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'text-emerald-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                style={{
                  backgroundColor: isActive ? 'rgba(16,185,129,0.1)' : '#111827',
                  border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.1)'}`,
                }}
              >
                {c.label} ({count})
              </Link>
            );
          })}
        </div>

        {/* Books Grid */}
        {books.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book: any) => (
              <a
                key={book.id}
                href={`/book/${book.id}`}
                className="block rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-emerald-500/5"
                style={{ backgroundColor: '#0d1117', border: '1px solid rgba(16,185,129,0.1)' }}
              >
                <h2 className="text-gray-200 font-bold text-sm mb-3 leading-relaxed">{book.name}</h2>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">{cat.label}</span>
                  <span className="text-emerald-400 text-xs font-medium">اقرأ الكتاب</span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(16,185,129,0.1)' }}>
            <p className="text-gray-400 text-sm">لا توجد كتب في هذا القسم حالياً</p>
            <Link href="/books" className="text-emerald-400 text-sm mt-4 inline-block hover:underline">تصفح جميع الكتب</Link>
          </div>
        )}

        {/* SEO Content */}
        <section className="mt-12 rounded-2xl p-6 sm:p-8" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(16,185,129,0.1)' }}>
          <h2 className="text-lg font-bold text-gray-100 mb-4">عن قسم {cat.label} في مكتبة العلي الرقمية</h2>
          <p className="text-gray-400 text-sm leading-loose mb-4">
            {cat.longDescription}
          </p>
          <p className="text-gray-400 text-sm leading-loose mb-4">
            مكتبة العلي الرقمية توفر لكم هذه المجموعة من كتب {cat.label} للاطلاع المجاني والقراءة المباشرة عبر الإنترنت.
            جميع الكتب متاحة في أي وقت ومن أي مكان، مع إمكانية استخدام أدوات الذكاء الاصطناعي المتقدمة للتلخيص والبحث المتطور.
          </p>
          <p className="text-gray-400 text-sm leading-loose">
            تشمل مكتبة العلي الرقمية أيضاً أقسام التفسير والعقائد والفقه والمنطق والفلسفة والتاريخ والأدعية،
            لتكون مرجعاً شاملاً للباحثين والطلاب والمهتمين بالدراسات الإسلامية والفكر الشيعي الإمامي.
          </p>
        </section>
      </main>

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
