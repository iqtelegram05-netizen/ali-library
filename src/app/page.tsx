'use client';

import { Suspense } from 'react';
import HomeContent from '@/components/HomeContent';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: '#0a0a0f' }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
            <p className="text-gray-500 text-sm">جارٍ تحميل مكتبة العلي...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
