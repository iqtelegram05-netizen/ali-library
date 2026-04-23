'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOGO_URL = 'https://www.image2url.com/r2/default/images/1776215661522-3ce7e2b6-4b67-46d7-898b-85a767165977.png';

const RING_SHAPES = [
  { clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)', delay: 0, duration: 1.5, color: 'rgba(16, 185, 129, 0.4)' },
  { clipPath: 'circle(50% at 50% 50%)', delay: 0.2, duration: 1.5, color: 'rgba(212, 175, 55, 0.3)' },
  { clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)', delay: 0.4, duration: 1.5, color: 'rgba(16, 185, 129, 0.25)' },
  { clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)', delay: 0.6, duration: 1.5, color: 'rgba(212, 175, 55, 0.2)' },
];

// Lines extending from center
const RADIAL_LINES = 12;

interface CosmicPortalProps {
  onComplete: () => void;
}

export default function CosmicPortal({ onComplete }: CosmicPortalProps) {
  const [phase, setPhase] = useState<'opening' | 'reveal' | 'closing'>('opening');

  useEffect(() => {
    const revealTimer = setTimeout(() => setPhase('reveal'), 1800);
    const closingTimer = setTimeout(() => setPhase('closing'), 2500);
    const completeTimer = setTimeout(() => onComplete(), 3200);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(closingTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'closing' ? (
        <motion.div
          key="portal-open"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.5, filter: 'blur(20px)' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 flex items-center justify-center z-[9999]"
          style={{ backgroundColor: '#050508' }}
        >
          {/* Radial Lines */}
          <div className="absolute inset-0 flex items-center justify-center">
            {Array.from({ length: RADIAL_LINES }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: [0, 0.3, 0.15] }}
                transition={{
                  duration: 1.2,
                  delay: 0.3 + i * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="absolute origin-center"
                style={{
                  width: '1px',
                  height: '40vmin',
                  background: i % 2 === 0
                    ? 'linear-gradient(to top, transparent, rgba(16, 185, 129, 0.15), transparent)'
                    : 'linear-gradient(to top, transparent, rgba(212, 175, 55, 0.1), transparent)',
                  transform: `rotate(${i * (360 / RADIAL_LINES)}deg)`,
                }}
              />
            ))}
          </div>

          {/* Concentric Geometric Rings */}
          {RING_SHAPES.map((ring, i) => {
            const size = 120 + i * 70;
            return (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0, rotate: -180 }}
                animate={{
                  scale: 1,
                  opacity: [0, ring.color.includes('0.4') ? 0.8 : 0.5, phase === 'reveal' ? 0.2 : 0.5],
                  rotate: i % 2 === 0 ? 360 : -360,
                }}
                transition={{
                  duration: ring.duration,
                  delay: ring.delay,
                  ease: [0.16, 1, 0.3, 1],
                  rotate: { duration: 8 + i * 2, repeat: Infinity, ease: 'linear' },
                }}
                className="absolute border"
                style={{
                  width: size,
                  height: size,
                  clipPath: ring.clipPath,
                  borderColor: ring.color,
                  borderWidth: '1.5px',
                }}
              />
            );
          })}

          {/* Floating Particles */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / 20;
            const dist = 100 + Math.random() * 150;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            const isGold = i % 3 === 0;
            return (
              <motion.div
                key={`particle-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1, 0.5],
                  opacity: [0, isGold ? 0.6 : 0.4, 0],
                  x: [0, px * 2, px * 3],
                  y: [0, py * 2, py * 3],
                }}
                transition={{
                  duration: 2 + Math.random(),
                  delay: 0.5 + i * 0.06,
                  ease: 'easeOut',
                }}
                className="absolute rounded-full"
                style={{
                  width: 2 + Math.random() * 3,
                  height: 2 + Math.random() * 3,
                  background: isGold ? '#D4AF37' : '#10b981',
                  boxShadow: isGold
                    ? '0 0 6px rgba(212, 175, 55, 0.5)'
                    : '0 0 6px rgba(16, 185, 129, 0.5)',
                }}
              />
            );
          })}

          {/* Central Glow */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.2, 1],
              opacity: [0, 0.6, 0.3],
            }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute rounded-full"
            style={{
              width: 200,
              height: 200,
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15), rgba(212, 175, 55, 0.05), transparent)',
              filter: 'blur(20px)',
            }}
          />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0, opacity: 0, filter: 'blur(10px)' }}
            animate={{
              scale: 1,
              opacity: 1,
              filter: 'blur(0px)',
            }}
            transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center gap-4"
          >
            <div className="relative w-24 h-24 sm:w-28 sm:h-28">
              {/* Glow behind logo */}
              <div
                className="absolute inset-[-20px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2), transparent)',
                  filter: 'blur(15px)',
                }}
              />
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(16, 185, 129, 0.2), 0 0 40px rgba(212, 175, 55, 0.1)',
                    '0 0 40px rgba(16, 185, 129, 0.4), 0 0 80px rgba(212, 175, 55, 0.2)',
                    '0 0 20px rgba(16, 185, 129, 0.2), 0 0 40px rgba(212, 175, 55, 0.1)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-full h-full rounded-full bg-[#0d1117] flex items-center justify-center border border-emerald-500/40"
              >
                <img
                  src={LOGO_URL}
                  alt="مكتبة العلي"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
                />
              </motion.div>
            </div>

            {/* Title Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <h2
                className="text-2xl sm:text-3xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #D4AF37)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                مكتبة العلي الرقمية
              </h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0.4] }}
                transition={{ duration: 1, delay: 1.5 }}
                className="text-gray-500 text-xs mt-1"
              >
                Al-Ali Digital Library
              </motion.p>
            </motion.div>
          </motion.div>

          {/* Vignette overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, transparent 30%, rgba(5, 5, 8, 0.6) 100%)',
            }}
          />
        </motion.div>
      ) : (
        <motion.div
          key="portal-closing"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] pointer-events-none"
          style={{ backgroundColor: '#050508' }}
          onAnimationComplete={() => onComplete()}
        />
      )}
    </AnimatePresence>
  );
}
