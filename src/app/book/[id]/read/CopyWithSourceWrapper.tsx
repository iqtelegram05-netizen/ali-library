'use client';

import React, { useEffect, useRef, useState } from 'react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ali-library.vercel.app';

export default function CopyWithSourceWrapper({
  bookName,
  bookId,
  pageNumber,
  children,
}: {
  bookName: string;
  bookId: string;
  pageNumber: number;
  children: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      const selectedText = selection?.toString();
      if (!selectedText || !selectedText.trim()) return;

      const sourceLine = `\n\n📖 المصدر: ${bookName} | صفحة ${pageNumber}\n🔗 مكتبة العلي الرقمية: ${SITE_URL}/book/${bookId}/read`;
      const textWithSource = selectedText + sourceLine;

      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', textWithSource);
      }

      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    };

    el.addEventListener('copy', handleCopy);
    return () => el.removeEventListener('copy', handleCopy);
  }, [bookName, bookId, pageNumber]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {children}
      {/* Copy Toast */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            padding: '10px 20px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16,185,129,0.95)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          تم النسخ مع المصدر ✓
        </div>
      )}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}