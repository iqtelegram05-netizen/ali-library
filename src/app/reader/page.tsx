'use client';

import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight,
  ArrowRight, BookOpen, Loader2,
  Sun, Moon, Maximize2, Minimize2, AlertTriangle, Download,
  List, X, BookMarked, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GeoHoverEffect from '@/components/GeoHoverEffect';

/* ===================================================================
   LOADING SCREEN
   =================================================================== */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
        <BookOpen size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-400" />
      </div>
      <p className="text-gray-400 text-sm">جارٍ تحميل القارئ...</p>
    </div>
  );
}

/* ===================================================================
   READER CONTENT — المحتوى الرئيسي للقارئ
   =================================================================== */
function ReaderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookUrl = searchParams.get('url') || '';
  const bookTitle = searchParams.get('title') || 'قارئ الكتب';

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [content, setContent] = useState<string>('');
  const [metadata, setMetadata] = useState<{ bookTitle: string; author: string; part: string; group: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [pageInput, setPageInput] = useState<string>('1');
  const [sepiaMode, setSepiaMode] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [toc, setToc] = useState<Array<{ num: number; title: string; page: number }>>([]);
  const [tocLoading, setTocLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState<string>('');
  const [summaryError, setSummaryError] = useState<string>('');

  // Fetch book metadata and total pages on mount
  useEffect(() => {
    if (!bookUrl) return;

    async function fetchMeta() {
      try {
        const res = await fetch('/api/book-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: bookUrl, page: 1, action: 'meta' }),
        });
        const data = await res.json();
        if (data.success) {
          setTotalPages(data.totalPages || 1);
          setMetadata(data.metadata || null);
          setToc(data.toc || []);
        }
      } catch (e: any) {
        console.error('Meta fetch error:', e);
      }
    }
    fetchMeta();
  }, [bookUrl]);

  // Fetch page content when page changes
  useEffect(() => {
    if (!bookUrl || currentPage < 1) return;

    async function fetchPageContent() {
      setLoading(true);
      setError('');
      setContent('');

      try {
        const res = await fetch('/api/book-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: bookUrl, page: currentPage, action: 'content' }),
        });
        const data = await res.json();

        if (data.success && data.content) {
          setContent(data.content);
          setTextContent(data.textContent || '');
          if (data.totalPages) setTotalPages(data.totalPages);
          if (data.metadata) setMetadata(data.metadata);
        } else {
          setError(data.error || 'لم يتم العثور على محتوى');
        }
      } catch (e: any) {
        setError('فشل في جلب المحتوى: ' + (e.message || 'خطأ غير معروف'));
      } finally {
        setLoading(false);
      }
    }

    fetchPageContent();
  }, [bookUrl, currentPage]);

  const goToPage = useCallback((num: number) => {
    if (num >= 1 && num <= totalPages) {
      setCurrentPage(num);
      setPageInput(String(num));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages]);

  const handlePageInputSubmit = useCallback(() => {
    const num = parseInt(pageInput, 10);
    if (!isNaN(num)) goToPage(num);
  }, [pageInput, goToPage]);

  const handleSummarize = useCallback(async () => {
    if (!textContent.trim()) return;
    setShowSummary(true);
    setSummaryLoading(true);
    setSummaryText('');
    setSummaryError('');

    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textContent, url: bookUrl }),
      });
      const data = await res.json();

      if (data.success) {
        setSummaryText(data.summary || '');
      } else {
        setSummaryError(data.error || 'فشل في تلخيص المحتوى');
      }
    } catch {
      setSummaryError('فشل الاتصال بالخادم. حاول مرة أخرى.');
    } finally {
      setSummaryLoading(false);
    }
  }, [textContent, bookUrl]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case 'ArrowLeft': goToPage(currentPage + 1); break;
        case 'ArrowRight': goToPage(currentPage - 1); break;
        case 'Escape':
          if (showToc) setShowToc(false);
          else if (isFullscreen) toggleFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, showToc, isFullscreen, goToPage]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && containerRef) {
      containerRef.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, [containerRef]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const bgColor = sepiaMode ? '#2c2419' : '#0a0a0f';
  const contentBg = sepiaMode ? '#f4ecd8' : '#111827';
  const textColor = sepiaMode ? '#3a2e1a' : '#e2e8f0';

  // No URL
  if (!bookUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#0a0a0f' }}>
        <AlertTriangle size={48} className="text-[#D4AF37]" />
        <p className="text-gray-400 text-lg">لم يتم تحديد كتاب</p>
        <button onClick={() => router.back()} className="btn-green px-6 py-3 rounded-xl text-white text-sm flex items-center gap-2">
          <ArrowRight size={16} /><span>العودة للمكتبة</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={setContainerRef} className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor, transition: 'background-color 0.3s ease' }}>
      {/* Global Geometric Hover Effects */}
      <GeoHoverEffect />
      {/* === TOOLBAR === */}
      <div className="sticky top-0 z-50 shrink-0" style={{ backgroundColor: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="max-w-5xl mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 gap-3">
            {/* Right: Back + Title */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100 transition-all shrink-0"
                title="العودة للمكتبة">
                <ArrowRight size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="text-gray-100 text-sm font-bold truncate max-w-[180px] sm:max-w-[350px]">{bookTitle}</h1>
                {metadata?.author && (
                  <p className="text-gray-500 text-[10px] truncate">{metadata.author}</p>
                )}
              </div>
            </div>

            {/* Center: Page Navigation */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1 || totalPages === 0}
                className="p-1.5 sm:p-2 rounded-lg bg-[#111827] border border-emerald-500/15 text-gray-300 hover:border-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="الصفحة السابقة">
                <ChevronRight size={14} />
              </button>

              <div className="flex items-center gap-1.5 bg-[#111827] border border-emerald-500/15 rounded-lg px-2 py-1">
                <input type="number" min={1} max={totalPages || 1}
                  value={pageInput || (totalPages > 0 ? currentPage : '')}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePageInputSubmit()}
                  className="w-12 sm:w-14 text-center bg-transparent text-gray-100 text-xs border-0 outline-none"
                  dir="ltr"
                />
                <span className="text-gray-500 text-[10px]">من</span>
                <span className="text-emerald-400 text-xs font-medium">{totalPages > 0 ? totalPages : '...'}</span>
              </div>

              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages || totalPages === 0}
                className="p-1.5 sm:p-2 rounded-lg bg-[#111827] border border-emerald-500/15 text-gray-300 hover:border-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="الصفحة التالية">
                <ChevronLeft size={14} />
              </button>
            </div>

            {/* Left: Tools */}
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handleSummarize} disabled={loading || !textContent}
                className="p-2 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100 disabled:opacity-30 transition-all"
                title="تلخيص المحتوى">
                <Sparkles size={16} />
              </button>

              <button onClick={() => setShowToc(true)} disabled={toc.length === 0}
                className="p-2 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100 disabled:opacity-30 transition-all"
                title="الفهرست">
                <List size={16} />
              </button>

              <button onClick={() => setSepiaMode(!sepiaMode)}
                className={`p-2 rounded-lg transition-all ${sepiaMode ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100'}`}
                title={sepiaMode ? 'الوضع الداكن' : 'وضع القراءة المريحة'}>
                {sepiaMode ? <Moon size={16} /> : <Sun size={16} />}
              </button>

              <button onClick={toggleFullscreen}
                className="p-2 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100 transition-all"
                title={isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}>
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              <a href={bookUrl} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100 transition-all" title="فتح المصدر">
                <Download size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* === READING AREA === */}
      <div className="flex-1 overflow-auto" style={{ backgroundColor: bgColor }}>
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
              <Loader2 size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-gray-300 text-sm font-medium">جارٍ تحميل الصفحة...</p>
              <p className="text-gray-500 text-xs mt-1">صفحة {currentPage} من {totalPages || '...'}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={40} className="text-red-400" />
            </div>
            <div className="text-center max-w-md">
              <p className="text-gray-300 text-sm font-medium mb-2">خطأ في تحميل المحتوى</p>
              <p className="text-gray-500 text-xs">{error}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => goToPage(currentPage)} className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs hover:bg-emerald-500/15 transition-colors">
                إعادة المحاولة
              </button>
              <a href={bookUrl} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-[#111827] border border-emerald-500/15 text-gray-300 text-xs hover:border-emerald-500/25 transition-colors flex items-center gap-1.5">
                <Download size={14} /><span>فتح المصدر</span>
              </a>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && content && (
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
            <div
              className="rounded-2xl p-6 sm:p-10 shadow-lg border"
              style={{
                backgroundColor: contentBg,
                borderColor: sepiaMode ? 'rgba(180,160,120,0.2)' : 'rgba(16,185,129,0.08)',
                transition: 'all 0.3s ease',
                direction: 'rtl',
                textAlign: 'right',
              }}
            >
              {/* Page header */}
              <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: `1px solid ${sepiaMode ? 'rgba(180,160,120,0.2)' : 'rgba(16,185,129,0.08)'}` }}>
                <span className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{ color: sepiaMode ? '#5c4a2a' : '#10b981', backgroundColor: sepiaMode ? 'rgba(92,74,42,0.15)' : 'rgba(16,185,129,0.1)' }}>
                  صفحة {currentPage}
                </span>
                {metadata?.bookTitle && (
                  <span className="text-xs" style={{ color: sepiaMode ? '#7a6a4a' : '#6b7280' }}>
                    {metadata.bookTitle}
                  </span>
                )}
              </div>

              {/* Book text content */}
              <div
                className="leading-loose text-base sm:text-lg whitespace-pre-wrap break-words"
                style={{ color: textColor, fontFamily: '"Noto Kufi Arabic", "Amiri", "Traditional Arabic", serif', lineHeight: '2.5' }}
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>

            {/* Progress bar */}
            {totalPages > 0 && (
              <div className="mt-6 flex items-center gap-3">
                <span className="text-gray-500 text-[10px] shrink-0">التقدم</span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: sepiaMode ? 'rgba(180,160,120,0.15)' : 'rgba(16,185,129,0.08)' }}>
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${(currentPage / totalPages) * 100}%`, background: 'linear-gradient(90deg, #10b981, #D4AF37)' }} />
                </div>
                <span className="text-gray-500 text-[10px] shrink-0">{Math.round((currentPage / totalPages) * 100)}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* === BOTTOM NAVIGATION BAR === */}
      {totalPages > 0 && !loading && (
        <div className="sticky bottom-0 z-40 shrink-0" style={{ backgroundColor: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(16,185,129,0.1)' }}>
          <div className="max-w-5xl mx-auto px-4 py-3">
            {/* Page navigation buttons */}
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  color: '#10b981',
                }}
              >
                <ChevronRight size={16} />
                <span>السابق</span>
              </button>

              {/* Page number input */}
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ backgroundColor: '#111827', border: '1px solid rgba(16,185,129,0.15)' }}>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput || currentPage}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePageInputSubmit()}
                  className="w-14 text-center bg-transparent text-gray-100 text-sm border-0 outline-none"
                  dir="ltr"
                />
                <span className="text-gray-500 text-xs">من</span>
                <span className="text-emerald-400 text-sm font-medium">{totalPages}</span>
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  color: '#10b981',
                }}
              >
                <span>التالي</span>
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* الفهرست button */}
            {toc.length > 0 && (
              <div className="flex justify-center mt-2">
                <button
                  onClick={() => setShowToc(true)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.2)',
                    color: '#D4AF37',
                  }}
                >
                  <BookMarked size={14} />
                  <span>الفهرست</span>
                  <span className="text-[10px] opacity-60">({toc.length} فصل)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === TOC MODAL === */}
      <AnimatePresence>
        {showToc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
            onClick={() => setShowToc(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg max-h-[80vh] mx-4 rounded-2xl shadow-2xl overflow-hidden"
              style={{ backgroundColor: '#0d1117', border: '1px solid rgba(16,185,129,0.15)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
                <div className="flex items-center gap-2">
                  <List size={18} className="text-[#D4AF37]" />
                  <h2 className="text-gray-100 font-bold text-base">فهرس الكتاب</h2>
                  {metadata?.bookTitle && (
                    <span className="text-gray-500 text-xs mr-2">— {metadata.bookTitle}</span>
                  )}
                </div>
                <button onClick={() => setShowToc(false)} className="p-1.5 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100 transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* TOC List */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
                <div className="px-2 py-2">
                  {toc.map((item) => (
                    <button
                      key={item.num}
                      onClick={() => {
                        goToPage(item.page);
                        setShowToc(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-all hover:bg-[#1a1a2e] group ${
                        currentPage === item.page ? 'bg-emerald-500/10 border border-emerald-500/20' : 'border border-transparent'
                      }`}
                    >
                      <span className="text-xs font-medium w-6 text-center shrink-0"
                        style={{ color: currentPage === item.page ? '#10b981' : '#6b7280' }}>
                        {item.num}
                      </span>
                      <span className="flex-1 text-sm truncate"
                        style={{ color: currentPage === item.page ? '#10b981' : '#d1d5db' }}>
                        {item.title}
                      </span>
                      <span className="text-[10px] shrink-0 px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#6b7280' }}>
                        ص{item.page}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === SUMMARY MODAL === */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowSummary(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[80vh] mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{
                backgroundColor: 'rgba(13,17,23,0.97)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(212,175,55,0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                    <Sparkles size={18} className="text-[#D4AF37]" />
                  </div>
                  <div>
                    <h2 className="text-gray-100 font-bold text-base">تلخيص المحتوى</h2>
                    <p className="text-gray-500 text-[10px]">ملخص ذكي بالذكاء الاصطناعي — صفحة {currentPage}</p>
                  </div>
                </div>
                <button onClick={() => setShowSummary(false)} className="p-1.5 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100 transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'thin' }}>
                {/* Loading */}
                {summaryLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
                      <Sparkles size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#D4AF37]" />
                    </div>
                    <span className="text-gray-300 text-sm font-medium">جارٍ تلخيص المحتوى...</span>
                    <span className="text-gray-500 text-xs">يتم تحليل النص واستخراج النقاط الرئيسية</span>
                  </motion.div>
                )}

                {/* Error */}
                {!summaryLoading && summaryError && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertTriangle size={16} className="text-red-400 shrink-0" />
                    <span className="text-red-400 text-sm">{summaryError}</span>
                  </motion.div>
                )}

                {/* Summary Text */}
                {!summaryLoading && summaryText && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <div className="rounded-xl bg-[#111827]/80 border border-[#D4AF37]/10 p-5">
                      <div className="text-gray-300 text-sm leading-loose whitespace-pre-wrap" style={{ direction: 'rtl', textAlign: 'right', lineHeight: '2.2' }}>
                        {summaryText}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ===================================================================
   MAIN PAGE
   =================================================================== */
export default function ReaderPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ReaderContent />
    </Suspense>
  );
}
