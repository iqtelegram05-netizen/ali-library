'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface FloatingQuote {
  id: number;
  text: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  rotation: number;
  color: string;
  shape: 'hexagon' | 'diamond' | 'circle' | 'triangle' | 'pentagon';
  parallaxFactor: number;
}

const BOOK_QUOTES = [
  'نهج البلاغة',
  'الصحيفة السجادية',
  'الكافي',
  'تفسير الصافي',
  'مصباح الكاظم',
  'رسالة الحقوق',
  'الجوامع العلمية',
  'المحجة البيضاء',
  'الصحيفة الحسنية',
  'رسائل الهادي',
  'توحيد الصدوق',
  'بحار الأنوار',
  'من لا يحضره الفقيه',
  'التهذيب',
  'الاستبصار',
  'أصول الكافي',
  'فروع الكافي',
  'نهج الحق',
  'الروضة البهية',
  'مصباح الشريعة',
  'عيون أخبار الرضا',
  'كمال الدين',
  'الغيبة للنعماني',
  'الارشاد للمفيد',
  'الهداية الكبرى',
  'الخصال',
  'الامالي',
  'صفات الشيعة',
  'مقاتل الطالبين',
  'الاحتجاج',
  'اللهوف على قتلى الطفوف',
  'إقبال الأعمال',
  'المزار الكبير',
  'مفتاح الجنان',
  'العدة في أصول الفقه',
  'الذريعة إلى أحكام الشريعة',
  'جواهر الكلام',
  'المختصر النافع',
  'الموجز في الفقه',
  'الوافي',
  'وسائل الشيعة',
  'مستدرك الوسائل',
  'بحار الأنوار',
  'سيف الإمام علي',
  'كتب سيف الإمام علي',
  'مكتبة العلي',
  'الإمام علي بن أبي طالب',
  'الحسين الشهيد',
  'أبو عبد الله الصادق',
  'الأئمة الاثني عشر',
  'آل محمد',
  'أهل البيت',
];

const SHAPES: Record<string, string> = {
  hexagon: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  circle: 'circle(50% at 50% 50%)',
  triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
  pentagon: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
};

const SHAPE_KEYS = Object.keys(SHAPES);

const COLORS = [
  'rgba(16, 185, 129, 0.06)',
  'rgba(212, 175, 55, 0.05)',
  'rgba(16, 185, 129, 0.04)',
  'rgba(212, 175, 55, 0.06)',
  'rgba(52, 211, 153, 0.04)',
  'rgba(240, 208, 96, 0.04)',
];

const BORDER_COLORS = [
  'rgba(16, 185, 129, 0.12)',
  'rgba(212, 175, 55, 0.10)',
  'rgba(16, 185, 129, 0.08)',
  'rgba(212, 175, 55, 0.12)',
  'rgba(52, 211, 153, 0.08)',
  'rgba(240, 208, 96, 0.08)',
];

export default function FloatingBookQuotes() {
  const [quotes, setQuotes] = useState<FloatingQuote[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const generated: FloatingQuote[] = [];
      for (let i = 0; i < 30; i++) {
        const colorIdx = Math.floor(Math.random() * COLORS.length);
        generated.push({
          id: i,
          text: BOOK_QUOTES[Math.floor(Math.random() * BOOK_QUOTES.length)],
          x: Math.random() * 100,
          y: Math.random() * 300, // extended for scroll
          size: 10 + Math.random() * 14,
          opacity: 0.15 + Math.random() * 0.25,
          speed: 0.5 + Math.random() * 1.5,
          rotation: -15 + Math.random() * 30,
          color: COLORS[colorIdx],
          shape: SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)] as FloatingQuote['shape'],
          parallaxFactor: 0.02 + Math.random() * 0.06,
        });
      }
      requestAnimationFrame(() => setQuotes(generated));
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (quotes.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[2] overflow-hidden">
      {quotes.map((q) => {
        const parallaxX = mousePos.x * q.parallaxFactor * 100;
        const parallaxY = mousePos.y * q.parallaxFactor * 60;
        const scrollOffset = (scrollY * q.parallaxFactor * 2) % 100;

        return (
          <motion.div
            key={q.id}
            animate={{
              x: parallaxX,
              y: parallaxY - scrollOffset,
              rotate: [q.rotation, q.rotation + 3, q.rotation - 2, q.rotation],
              opacity: [q.opacity, q.opacity * 0.7, q.opacity * 1.1, q.opacity],
            }}
            transition={{
              rotate: { duration: 8 + q.speed * 4, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 6 + q.speed * 3, repeat: Infinity, ease: 'easeInOut' },
              x: { duration: 2, ease: 'easeOut' },
              y: { duration: 2, ease: 'easeOut' },
            }}
            className="absolute"
            style={{
              left: `${q.x}%`,
              top: `${q.y}%`,
              fontSize: `${q.size}px`,
              color: q.color.replace(/[\d.]+\)$/, `${q.opacity + 0.15})`),
              fontFamily: 'inherit',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              letterSpacing: '0.5px',
              direction: 'rtl',
              userSelect: 'none',
            }}
          >
            {/* Geometric shape behind the text */}
            <div
              className="absolute -inset-2 -z-10"
              style={{
                clipPath: SHAPES[q.shape],
                background: q.color,
                border: `1px solid ${BORDER_COLORS[COLORS.indexOf(q.color)] || BORDER_COLORS[0]}`,
                opacity: 0.5,
                transform: 'scale(1.2)',
              }}
            />
            {/* Rotating wireframe */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20 + q.speed * 10, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-3 -z-20"
              style={{
                clipPath: SHAPES[q.shape],
                border: `1px solid ${BORDER_COLORS[COLORS.indexOf(q.color)] || BORDER_COLORS[0]}`,
                opacity: 0.3,
              }}
            />
            {q.text}
          </motion.div>
        );
      })}

      {/* Mouse follower geometric trail */}
      <motion.div
        animate={{
          x: mousePos.x * 30,
          y: mousePos.y * 30 + scrollY * 0.02,
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="fixed pointer-events-none"
        style={{
          width: 60,
          height: 60,
          left: '50%',
          top: '50%',
          marginLeft: -30,
          marginTop: -30,
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full border border-emerald-500/8"
          style={{ clipPath: SHAPES.hexagon }}
        />
      </motion.div>
    </div>
  );
}
