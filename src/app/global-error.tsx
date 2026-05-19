'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ backgroundColor: '#0a0a0f', color: '#e2e8f0', margin: 0 }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              width: '100%',
              backgroundColor: '#0d1117',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: '1rem',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <h2 style={{ color: '#f1f5f9', fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              حدث خطأ في التحميل
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.7' }}>
              عذراً، حدث خطأ غير متوقع أثناء تحميل الصفحة.
              يرجى المحاولة مرة أخرى.
            </p>
            {error && (
              <details style={{ marginBottom: '1rem', textAlign: 'right' }}>
                <summary style={{ color: '#64748b', fontSize: '0.75rem', cursor: 'pointer' }}>
                  تفاصيل الخطأ
                </summary>
                <pre
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: '#111827',
                    borderRadius: '0.5rem',
                    color: '#f87171',
                    fontSize: '0.625rem',
                    overflow: 'auto',
                    maxHeight: '8rem',
                    direction: 'ltr',
                    textAlign: 'left',
                  }}
                >
                  {error.message}
                </pre>
              </details>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.75rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '0.875rem',
                  fontWeight: 'medium',
                  cursor: 'pointer',
                }}
              >
                إعادة المحاولة
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.75rem',
                  backgroundColor: '#111827',
                  border: '1px solid rgba(55, 65, 81, 0.5)',
                  color: '#d1d5db',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                الصفحة الرئيسية
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
