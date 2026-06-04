import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ali-library.vercel.app';

/**
 * Sitemap generator — safe version that works even without database.
 * Google Search Console needs a reliable sitemap.xml
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static pages (always available)
  const pages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/books`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Category pages
  const categorySlugs = ['tafsir', 'aqaid', 'fiqh', 'mantique', 'falsafa', 'tarikh', 'dua', 'other'];
  for (const slug of categorySlugs) {
    pages.push({
      url: `${SITE_URL}/category/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  return pages;
}
