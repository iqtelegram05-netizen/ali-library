'use client';

import React from 'react';
import { SessionGate } from '@/hooks/useAppSession';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate>
      {children}
    </SessionGate>
  );
}
