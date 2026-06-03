'use client';
import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface GeoSectionProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

const WIRE_SHAPES = [
  { clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)', color: 'rgba(16, 185, 129, 0.12)' },
  { clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)', color: 'rgba(212, 175, 55, 0.08)' },
  { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', color: 'rgba(16, 185, 129, 0.08)' },
];

export default function GeoSection({ children, id, className = '' }: GeoSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [hasAnimated, setHasAnimated] = useState(false);

  // Trigger animation only once
  if (isInView && !hasAnimated) {
    // We use isInView to drive the motion, not this state
  }

  return (
    <motion.div
      ref={ref}
      id={id}
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Wireframe geometric shapes that draw in */}
      {WIRE_SHAPES.map((shape, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0, rotate: -120 }}
          animate={isInView ? { scale: 1, opacity: 1, rotate: 0 } : { scale: 0, opacity: 0, rotate: -120 }}
          transition={{
            duration: 1.2,
            delay: i * 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="absolute pointer-events-none"
          style={{
            width: 40 + i * 20,
            height: 40 + i * 20,
            right: i % 2 === 0 ? '5%' : undefined,
            left: i % 2 !== 0 ? '5%' : undefined,
            top: 10 + i * 8,
            clipPath: shape.clipPath,
            borderColor: shape.color,
            borderWidth: '1px',
            borderStyle: 'solid',
            animation: isInView ? `wireframe-pulse 4s ${i * 0.5}s ease-in-out infinite` : 'none',
          }}
        />
      ))}

      {/* Subtle glow on section border when in view */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: [0, 0.4, 0.15] } : { opacity: 0 }}
        transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 30px rgba(16, 185, 129, 0.04), 0 0 40px rgba(16, 185, 129, 0.02)',
        }}
      />

      {/* Content with slight delay */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
