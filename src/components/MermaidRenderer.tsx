'use client';
// @ts-nocheck — mermaid loaded from CDN via global

import React, { useEffect, useRef, useState } from 'react';

interface MermaidRendererProps {
  chart: string;
}

export default function MermaidRenderer({ chart }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function renderMermaid() {
      try {
        // Load mermaid from CDN if not already loaded
        if (typeof window !== 'undefined' && !(window as any).mermaid) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load mermaid'));
            document.head.appendChild(script);
          });
        }

        const mermaid = (window as any).mermaid;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#10b981',
            primaryTextColor: '#f1f5f9',
            primaryBorderColor: '#059669',
            lineColor: '#6b7280',
            secondaryColor: '#1e293b',
            tertiaryColor: '#0f172a',
            fontFamily: '"Noto Kufi Arabic", "Amiri", sans-serif',
            fontSize: '14px',
          },
          flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
          mindmap: { useMaxWidth: true, padding: 16 },
        });

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);

        if (!cancelled) {
          setSvg(renderedSvg);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to render diagram');
          setLoading(false);
        }
      }
    }

    if (chart) {
      renderMermaid();
    }

    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
        <span className="text-gray-400 text-sm">جارٍ تحميل الخريطة الذهنية...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 gap-2">
        <span className="text-red-400 text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-auto rounded-xl bg-[#0a0a0f] border border-emerald-500/15 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ direction: 'ltr', textAlign: 'center' }}
    />
  );
}
