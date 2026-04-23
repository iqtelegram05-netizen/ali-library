'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HoverShape {
  id: number;
  shape: 'hexagon' | 'triangle' | 'diamond' | 'circle' | 'pentagon' | 'star';
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  duration: number;
  delay: number;
}

const SHAPES: Record<string, string> = {
  hexagon: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
  triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  circle: 'circle(50% at 50% 50%)',
  pentagon: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
  star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
};

const SHAPE_KEYS = Object.keys(SHAPES);
const HOVER_COLORS = [
  'rgba(16, 185, 129, 0.6)',
  'rgba(212, 175, 55, 0.5)',
  'rgba(52, 211, 153, 0.5)',
  'rgba(16, 185, 129, 0.4)',
  'rgba(240, 208, 96, 0.5)',
  'rgba(212, 175, 55, 0.4)',
];

const CLICK_COLORS = [
  'rgba(16, 185, 129, 0.9)',
  'rgba(212, 175, 55, 0.8)',
  'rgba(52, 211, 153, 0.8)',
  'rgba(240, 208, 96, 0.8)',
  'rgba(16, 185, 129, 0.7)',
  'rgba(212, 175, 55, 0.7)',
];

let shapeIdCounter = 0;

export default function GeoHoverEffect() {
  const [hoverShapes, setHoverShapes] = useState<HoverShape[]>([]);
  const [clickShapes, setClickShapes] = useState<HoverShape[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const generateHoverShapes = useCallback((x: number, y: number): HoverShape[] => {
    const count = 5 + Math.floor(Math.random() * 4);
    const newShapes: HoverShape[] = [];
    for (let i = 0; i < count; i++) {
      newShapes.push({
        id: shapeIdCounter++,
        shape: SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)] as HoverShape['shape'],
        x: x + (Math.random() - 0.5) * 80,
        y: y + (Math.random() - 0.5) * 40,
        size: 8 + Math.random() * 18,
        color: HOVER_COLORS[Math.floor(Math.random() * HOVER_COLORS.length)],
        rotation: Math.random() * 360,
        duration: 0.8 + Math.random() * 0.6,
        delay: Math.random() * 0.15,
      });
    }
    return newShapes;
  }, []);

  const generateClickShapes = useCallback((x: number, y: number): HoverShape[] => {
    const count = 10 + Math.floor(Math.random() * 8);
    const newShapes: HoverShape[] = [];
    const angleStep = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      const angle = angleStep * i + (Math.random() - 0.5) * 0.3;
      const distance = 30 + Math.random() * 60;
      newShapes.push({
        id: shapeIdCounter++,
        shape: SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)] as HoverShape['shape'],
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        size: 6 + Math.random() * 16,
        color: CLICK_COLORS[Math.floor(Math.random() * CLICK_COLORS.length)],
        rotation: Math.random() * 360,
        duration: 0.6 + Math.random() * 0.5,
        delay: Math.random() * 0.1,
      });
    }
    return newShapes;
  }, []);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only trigger on buttons, links, or elements with data-geo-hover
      const isInteractive =
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[data-geo-hover]') ||
        target.closest('.book-card') ||
        target.closest('.holo-card') ||
        target.closest('[role="button"]') ||
        target.closest('[role="tab"]');

      if (isInteractive) {
        const rect = target.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const shapes = generateHoverShapes(cx, cy);
        setHoverShapes(shapes);
        setTimeout(() => setHoverShapes([]), 1200);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive =
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[data-geo-hover]') ||
        target.closest('.book-card') ||
        target.closest('.holo-card') ||
        target.closest('[role="button"]') ||
        target.closest('[role="tab"]');

      if (isInteractive) {
        const shapes = generateClickShapes(e.clientX, e.clientY);
        setClickShapes(shapes);
        setTimeout(() => setClickShapes([]), 1000);
      }
    };

    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    window.addEventListener('click', handleClick, { passive: true });
    return () => {
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('click', handleClick);
    };
  }, [generateHoverShapes, generateClickShapes]);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-[9997] overflow-hidden">
      {/* Hover shapes */}
      <AnimatePresence>
        {hoverShapes.map(shape => (
          <motion.div
            key={`hover-${shape.id}`}
            initial={{ scale: 0, opacity: 0, rotate: shape.rotation - 90 }}
            animate={{
              scale: [0, 1.2, 0.8, 1],
              opacity: [0, shape.color.includes('0.6') ? 0.7 : 0.5, 0.3, 0],
              rotate: shape.rotation + 180,
              x: shape.x - (typeof window !== 'undefined' ? window.innerWidth / 2 : 500),
              y: shape.y - (typeof window !== 'undefined' ? window.innerHeight / 2 : 400),
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              duration: shape.duration,
              delay: shape.delay,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute left-1/2 top-1/2"
            style={{
              width: shape.size,
              height: shape.size,
              clipPath: SHAPES[shape.shape],
              background: shape.color,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Click burst shapes */}
      <AnimatePresence>
        {clickShapes.map(shape => (
          <motion.div
            key={`click-${shape.id}`}
            initial={{ scale: 0, opacity: 1, rotate: 0 }}
            animate={{
              scale: [0, 1.8, 0.5],
              opacity: [1, 0.8, 0],
              rotate: shape.rotation + 360,
              x: shape.x - (typeof window !== 'undefined' ? window.innerWidth / 2 : 500),
              y: shape.y - (typeof window !== 'undefined' ? window.innerHeight / 2 : 400),
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: shape.duration,
              delay: shape.delay,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute left-1/2 top-1/2"
            style={{
              width: shape.size,
              height: shape.size,
              clipPath: SHAPES[shape.shape],
              background: shape.color,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
