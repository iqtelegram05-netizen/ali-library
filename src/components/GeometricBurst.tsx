'use client';
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BurstShape {
  id: number;
  shape: 'hexagon' | 'triangle' | 'diamond' | 'circle' | 'pentagon' | 'star';
  size: number;
  color: string;
  rotation: number;
  distance: number;
  angle: number;
  duration: number;
  delay: number;
}

interface GeometricBurstProps {
  trigger: boolean;
  x: number;
  y: number;
  intensity?: 'light' | 'medium' | 'heavy';
}

const SHAPE_COUNTS = { light: 8, medium: 14, heavy: 20 };

const SHAPES: Record<string, string> = {
  hexagon: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
  triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  circle: 'circle(50% at 50% 50%)',
  pentagon: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
  star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
};

const COLORS = [
  'rgba(16, 185, 129, 0.8)',
  'rgba(16, 185, 129, 0.6)',
  'rgba(212, 175, 55, 0.7)',
  'rgba(212, 175, 55, 0.5)',
  'rgba(52, 211, 153, 0.6)',
  'rgba(16, 185, 129, 0.4)',
  'rgba(240, 208, 96, 0.5)',
];

const SHAPE_KEYS = Object.keys(SHAPES);

function generateShapes(intensity: 'light' | 'medium' | 'heavy'): BurstShape[] {
  const count = SHAPE_COUNTS[intensity];
  const newShapes: BurstShape[] = [];
  for (let i = 0; i < count; i++) {
    newShapes.push({
      id: i,
      shape: SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)] as BurstShape['shape'],
      size: 6 + Math.random() * 14,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      distance: 40 + Math.random() * (intensity === 'heavy' ? 120 : intensity === 'medium' ? 80 : 50),
      angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5,
      duration: 0.5 + Math.random() * 0.4,
      delay: Math.random() * 0.1,
    });
  }
  return newShapes;
}

export default function GeometricBurst({ trigger, x, y, intensity = 'medium' }: GeometricBurstProps) {
  const [visible, setVisible] = useState(false);
  const triggerCountRef = useRef(0);

  const shapes = useMemo(() => {
    if (!trigger) return [];
    triggerCountRef.current++;
    return generateShapes(intensity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, intensity]);

  const prevTriggerRef = useRef(false);
  if (trigger && !prevTriggerRef.current) {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 800);
    // Store timer ref for cleanup
    prevTriggerRef.current = trigger;
  }
  if (!trigger) {
    prevTriggerRef.current = false;
  }

  return (
    <AnimatePresence>
      {visible && shapes.length > 0 && (
        <div
          className="fixed pointer-events-none z-[9998]"
          style={{ left: x, top: y }}
        >
          {shapes.map(shape => {
            const endX = Math.cos(shape.angle) * shape.distance;
            const endY = Math.sin(shape.angle) * shape.distance;
            return (
              <motion.div
                key={`${triggerCountRef.current}-${shape.id}`}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                animate={{
                  x: endX,
                  y: endY,
                  scale: [0, 1.5, 0.3],
                  opacity: [1, 0.8, 0],
                  rotate: shape.rotation + 180,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: shape.duration,
                  delay: shape.delay,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="absolute"
                style={{
                  width: shape.size,
                  height: shape.size,
                  clipPath: SHAPES[shape.shape],
                  background: shape.color,
                }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}
