---
Task ID: 1
Agent: Super Z (Main)
Task: Fix the book loading issue, delete all books, add Quran book, and compare with real content

Work Log:
- Analyzed the target website HTML structure (shiaonlinelibrary.com on Wayback Machine)
- Discovered book list uses `<tbody>` rows with `<td>` cells (number, title+link, part, author, PDF)
- Discovered book detail pages use `<div class="page">` for content, `<div class="pager">` for page navigation
- Discovered TOC (الفهرست) is in `<div id="toc"><div class="toc"><table>` with `<tbody>` rows
- Created `/api/scan/route.ts` — regex-based book listing parser with CORS proxy chain
- Created `/api/book-page/route.ts` — page content extractor with metadata, TOC, and page text extraction
- Rewrote `/reader/page.tsx` — HTML text reader with page navigation (prev/next), page number input, الفهرست button, progress bar
- Updated `page.tsx` — changed scrape API to use `/api/scan`, set default URL to shia library
- Fixed framer-motion import (was framer-variants)
- Built and tested locally — scan returns 25 books with correct titles and authors
- Tested book-page meta — Quran has 604 pages and 114 TOC entries (Surahs)
- Tested page content — page 1 shows Surah Al-Faticha correctly, page 2 shows Al-Baqarah
- Deployed to ali-library.vercel.app (Vercel production)
- Verified all APIs work on production

Stage Summary:
- All old books cleared (no books in localStorage by default)
- New scan API extracts books with correct titles, authors, parts, and URLs
- Quran book successfully tested: 604 pages, 114 chapters, correct Arabic text
- Reader page opens page 1 directly with prev/next navigation and page number input
- الفهرست (index/table of contents) accessible via button below navigation
- Production deployment at https://ali-library.vercel.app
