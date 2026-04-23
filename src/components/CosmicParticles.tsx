'use client';
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  shape: 'hexagon' | 'triangle' | 'diamond' | 'circle' | 'pentagon';
  size: number;
  duration: number;
  delay: number;
  color: string;
  opacity: number;
}

const SHAPES = {
  hexagon: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
  triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  circle: 'circle(50% at 50% 50%)',
  pentagon: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
};

const COLORS = [
  'rgba(16, 185, 129, 0.12)',
  'rgba(212, 175, 55, 0.08)',
  'rgba(16, 185, 129, 0.06)',
  'rgba(52, 211, 153, 0.08)',
  'rgba(212, 175, 55, 0.12)',
];

export default function CosmicParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const generated: Particle[] = [];
      for (let i = 0; i < 15; i++) {
        const shapes = Object.keys(SHAPES) as Array<keyof typeof SHAPES>;
        generated.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          size: 20 + Math.random() * 60,
          duration: 15 + Math.random() * 25,
          delay: Math.random() * 10,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          opacity: 0.3 + Math.random() * 0.4,
        });
      }
      // Use requestAnimationFrame to defer setState out of synchronous effect
      requestAnimationFrame(() => {
        setParticles(generated);
      });
    }
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{
              scale: [0, p.opacity, p.opacity * 0.5, p.opacity, p.opacity * 0.6],
              opacity: [0, p.opacity, p.opacity * 0.5, p.opacity, p.opacity * 0.6],
              rotate: [0, 360],
              y: [0, -20, 10, -15, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute border"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              clipPath: SHAPES[p.shape],
              background: p.color,
              borderColor: p.color.replace(/[\d.]+\)$/, '0.3)'),
              borderWidth: '1px',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
