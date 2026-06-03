'use client';
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GeoButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'emerald' | 'gold' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT_STYLES = {
  emerald: {
    base: 'bg-[#0d1117]/80 border border-emerald-500/20 text-gray-200 hover:border-emerald-500/40',
    glow: '0 0 20px rgba(16, 185, 129, 0.2), 0 0 40px rgba(16, 185, 129, 0.08)',
    hexColor: 'rgba(16, 185, 129, 0.15)',
    particleColors: [
      'rgba(16, 185, 129, 0.8)',
      'rgba(16, 185, 129, 0.6)',
      'rgba(52, 211, 153, 0.7)',
    ],
  },
  gold: {
    base: 'bg-[#0d1117]/80 border border-[#D4AF37]/20 text-gray-200 hover:border-[#D4AF37]/40',
    glow: '0 0 20px rgba(212, 175, 55, 0.2), 0 0 40px rgba(212, 175, 55, 0.08)',
    hexColor: 'rgba(212, 175, 55, 0.15)',
    particleColors: [
      'rgba(212, 175, 55, 0.8)',
      'rgba(212, 175, 55, 0.6)',
      'rgba(240, 208, 96, 0.7)',
    ],
  },
  ghost: {
    base: 'bg-[#0d1117]/60 border border-emerald-500/10 text-gray-300 hover:border-emerald-500/25',
    glow: '0 0 15px rgba(16, 185, 129, 0.12)',
    hexColor: 'rgba(16, 185, 129, 0.1)',
    particleColors: [
      'rgba(16, 185, 129, 0.6)',
      'rgba(212, 175, 55, 0.5)',
    ],
  },
};

const SIZE_STYLES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

const SHAPES = {
  hexagon: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
  triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
};

export default function GeoButton({ children, onClick, className = '', variant = 'emerald', size = 'md' }: GeoButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [clickParticles, setClickParticles] = useState<Array<{ id: number; x: number; y: number; shape: string; color: string; angle: number; dist: number }>>([]);
  const [ripplePos, setRipplePos] = useState<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const btnRef = useRef<HTMLButtonElement>(null);
  const particleIdRef = useRef(0);

  const style = VARIANT_STYLES[variant];

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) onClick();

    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Generate click particles
    const particles = Array.from({ length: 8 }).map((_, i) => ({
      id: particleIdRef.current++,
      x: cx,
      y: cy,
      shape: (Object.keys(SHAPES) as Array<keyof typeof SHAPES>)[Math.floor(Math.random() * 3)],
      color: style.particleColors[Math.floor(Math.random() * style.particleColors.length)],
      angle: (Math.PI * 2 * i) / 8,
      dist: 20 + Math.random() * 30,
    }));

    setClickParticles(particles);
    setRipplePos({ x: cx, y: cy, active: true });

    setTimeout(() => setClickParticles([]), 500);
    setTimeout(() => setRipplePos(prev => ({ ...prev, active: false })), 600);
  }, [onClick, style.particleColors]);

  return (
    <motion.button
      ref={btnRef}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`relative overflow-hidden backdrop-blur-xl transition-all duration-300 cursor-pointer font-medium ${SIZE_STYLES[size]} ${style.base} ${className}`}
      style={{
        boxShadow: isHovered ? style.glow : 'none',
        transition: 'box-shadow 0.3s ease',
      }}
    >
      {/* Hexagon wireframe behind on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -90 }}
            animate={{ scale: 1.3, opacity: 0.12, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="w-full h-full border"
              style={{
                clipPath: SHAPES.hexagon,
                borderColor: style.hexColor,
                borderWidth: '1.5px',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rotating hexagon on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute w-10 h-10 border"
              style={{
                clipPath: SHAPES.hexagon,
                borderColor: style.hexColor,
                borderWidth: '1px',
                opacity: 0.5,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glow ripple on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-[inherit]"
            style={{
              animation: 'cosmic-hover-glow 1.5s ease-in-out infinite',
            }}
          />
        )}
      </AnimatePresence>

      {/* Click ripple */}
      <AnimatePresence>
        {ripplePos.active && (
          <motion.div
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripplePos.x,
              top: ripplePos.y,
              width: 20,
              height: 20,
              marginLeft: -10,
              marginTop: -10,
              background: `radial-gradient(circle, ${style.particleColors[0]}, transparent)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Click particles */}
      <AnimatePresence>
        {clickParticles.map(p => (
          <motion.div
            key={p.id}
            initial={{ x: p.x, y: p.y, scale: 0, opacity: 1 }}
            animate={{
              x: p.x + Math.cos(p.angle) * p.dist,
              y: p.y + Math.sin(p.angle) * p.dist,
              scale: [0, 1, 0],
              opacity: [1, 0.7, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute pointer-events-none"
            style={{
              width: 6,
              height: 6,
              clipPath: SHAPES[p.shape as keyof typeof SHAPES],
              background: p.color,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}
