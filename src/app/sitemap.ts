import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ali-library.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/books`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Add category pages
  const categorySlugs = ['tafsir', 'aqaid', 'fiqh', 'mantique', 'falsafa', 'tarikh', 'dua', 'other'];
  for (const slug of categorySlugs) {
    staticPages.push({
      url: `${SITE_URL}/category/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // Add individual book pages and read pages from the database
  const bookPages: MetadataRoute.Sitemap = [];
  try {
    const books = await prisma.book.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    for (const book of books) {
      // Book detail page
      bookPages.push({
        url: `${SITE_URL}/book/${book.id}`,
        lastModified: book.updatedAt || new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
      });
      // Book READ page (SSR with actual content — highest SEO value)
      bookPages.push({
        url: `${SITE_URL}/book/${book.id}/read`,
        lastModified: book.updatedAt || new Date(),
        changeFrequency: 'monthly',
        priority: 0.85,
      });
    }
  } catch (error) {
    console.warn('Failed to fetch books for sitemap:', error);
  }

  return [...staticPages, ...bookPages];
}
