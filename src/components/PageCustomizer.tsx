'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Camera, RotateCcw, Type, Palette, Minus, Plus, X, Eraser } from 'lucide-react';
import html2canvas from 'html2canvas-pro';

/* ===================================================================
   CONSTANTS
   =================================================================== */

const STORAGE_KEY = 'ali-library-customizer';

const DEFAULTS = {
  bgColor: '#0a0a0f',
  textColor: '#e2e8f0',
  fontSize: 16,
};

const BG_PRESETS = [
  '#0a0a0f', '#0d1117', '#111827', '#1a1a2e', '#0f0f0f', '#1e1e1e',
  '#2d1b3d', '#1b2d3d', '#1b3d2d', '#3d2d1b', '#0a1628', '#0d2818',
  '#ffffff', '#f5f5f5', '#e8e8e8', '#fef3c7', '#ecfdf5', '#eff6ff',
];

const TEXT_PRESETS = [
  '#e2e8f0', '#f1f5f9', '#ffffff', '#cbd5e1', '#94a3b8', '#64748b',
  '#10b981', '#D4AF37', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6',
  '#06b6d4', '#14b8a6', '#000000', '#1a1a1a',
];

const HIGHLIGHT_PRESETS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#fecdd3', '#e9d5ff',
  '#fde68a', '#a7f3d0', '#93c5fd', '#fca5a5', '#d8b4fe',
];

const WATERMARK_TEXT = 'مكتبة العلي الرقمية | Al-Ali Digital Library';

interface CustomizerSettings {
  bgColor: string;
  textColor: string;
  fontSize: number;
}

/* ===================================================================
   MAIN COMPONENT
   =================================================================== */

export default function PageCustomizer() {
  // ---- State ----
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'bg' | 'text' | 'size'>('bg');
  const [settings, setSettings] = useState<CustomizerSettings>(DEFAULTS);
  const [customBg, setCustomBg] = useState('');
  const [customText, setCustomText] = useState('');
  const [screenshotting, setScreenshotting] = useState(false);

  // Highlight state
  const [highlightPopup, setHighlightPopup] = useState<{ x: number; y: number } | null>(null);
  const [highlightCount, setHighlightCount] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // ---- Load settings from localStorage ----
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<CustomizerSettings>;
        setSettings({
          bgColor: parsed.bgColor ?? DEFAULTS.bgColor,
          textColor: parsed.textColor ?? DEFAULTS.textColor,
          fontSize: parsed.fontSize ?? DEFAULTS.fontSize,
        });
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // ---- Apply settings to DOM ----
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--custom-bg', settings.bgColor);
    root.style.setProperty('--custom-text', settings.textColor);
    root.style.setProperty('--custom-font-size', `${settings.fontSize}px`);
    root.style.backgroundColor = settings.bgColor;
    root.style.color = settings.textColor;
    root.style.fontSize = `${settings.fontSize}px`;
    document.body.style.backgroundColor = settings.bgColor;
    document.body.style.color = settings.textColor;
    document.body.style.fontSize = `${settings.fontSize}px`;
  }, [settings]);

  // ---- Save settings to localStorage ----
  const saveSettings = useCallback((newSettings: CustomizerSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch {
      // ignore storage errors
    }
  }, []);

  // ---- Reset to defaults ----
  const handleReset = useCallback(() => {
    setCustomBg('');
    setCustomText('');
    saveSettings(DEFAULTS);
  }, [saveSettings]);

  // ---- Close panel on outside click ----
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('[data-customizer-panel]') ||
        target.closest('[data-customizer-toggle]')
      ) return;
      setPanelOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  // ---- Screenshot with watermark ----
  const handleScreenshot = useCallback(async () => {
    if (screenshotting) return;
    setScreenshotting(true);
    setPanelOpen(false);

    try {
      // Create watermark div
      const watermark = document.createElement('div');
      watermark.textContent = WATERMARK_TEXT;
      Object.assign(watermark.style, {
        position: 'fixed',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '99999',
        pointerEvents: 'none',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.85), rgba(212, 175, 55, 0.85))',
        color: '#ffffff',
        padding: '8px 24px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        fontFamily: 'sans-serif',
        letterSpacing: '0.5px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        direction: 'rtl',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      });
      document.body.appendChild(watermark);

      // Wait for watermark to render
      await new Promise((r) => setTimeout(r, 100));

      // Capture
      const canvas = await html2canvas(document.body, {
        backgroundColor: settings.bgColor,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });

      // Remove watermark immediately
      document.body.removeChild(watermark);

      // Download
      const link = document.createElement('a');
      link.download = `ali-library-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Screenshot failed:', err);
    } finally {
      setScreenshotting(false);
    }
  }, [screenshotting, settings.bgColor]);

  // ---- Text Highlighting ----
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        // Auto-hide popup after a short delay
        setTimeout(() => setHighlightPopup(null), 300);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Position popup above the selection
      setHighlightPopup({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Close popup if clicking outside the popup itself
      const target = e.target as HTMLElement;
      if (popupRef.current && !popupRef.current.contains(target)) {
        setHighlightPopup(null);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // ---- Apply highlight color ----
  const applyHighlight = useCallback((color: string) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    try {
      const range = selection.getRangeAt(0);
      const contents = range.extractContents();

      // Check if all contents are text
      const mark = document.createElement('mark');
      mark.setAttribute('data-highlight', 'true');
      mark.style.backgroundColor = color;
      mark.style.borderRadius = '2px';
      mark.style.padding = '0 2px';
      mark.style.color = 'inherit';
      mark.appendChild(contents);

      range.insertNode(mark);

      // Clean up empty text nodes that may result from extraction
      const parent = mark.parentNode;
      if (parent) {
        parent.normalize();
      }

      setHighlightCount((c) => c + 1);
      setHighlightPopup(null);
      selection.removeAllRanges();
    } catch {
      // Fallback for cross-element selections
      try {
        const range = selection.getRangeAt(0);
        const mark = document.createElement('mark');
        mark.setAttribute('data-highlight', 'true');
        mark.style.backgroundColor = color;
        mark.style.borderRadius = '2px';
        mark.style.padding = '0 2px';
        mark.style.color = 'inherit';
        range.surroundContents(mark);
        setHighlightCount((c) => c + 1);
        setHighlightPopup(null);
        selection.removeAllRanges();
      } catch {
        // If surroundContents fails, just clear the popup
        setHighlightPopup(null);
        selection.removeAllRanges();
      }
    }
  }, []);

  // ---- Clear all highlights ----
  const clearAllHighlights = useCallback(() => {
    const marks = document.querySelectorAll('mark[data-highlight]');
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
      }
    });
    setHighlightCount(0);
  }, []);

  // ---- Compute isLight background ----
  const isLightBg = isLightColor(settings.bgColor);

  // ===================================================================
  // RENDER
  // ===================================================================

  return (
    <>
      {/* Floating Toolbar */}
      <div className="fixed bottom-6 left-6 z-[90] flex items-center gap-2" dir="rtl">
        {/* Settings Button */}
        <button
          data-customizer-toggle
          onClick={() => setPanelOpen(!panelOpen)}
          className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg ${
            panelOpen
              ? 'bg-emerald-500/30 border border-emerald-500/50 text-emerald-400'
              : 'bg-[#0d1117]/90 border border-emerald-500/20 text-gray-300 hover:text-emerald-400 hover:border-emerald-500/40'
          }`}
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          title="تخصيص الصفحة"
        >
          <Settings size={18} />
          {panelOpen && (
            <motion.div
              layoutId="settings-indicator"
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-sm shadow-emerald-400/50"
            />
          )}
        </button>

        {/* Screenshot Button */}
        <button
          onClick={handleScreenshot}
          disabled={screenshotting}
          className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#0d1117]/90 border border-[#D4AF37]/20 text-gray-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          title="التقاط لقطة شاشة"
        >
          {screenshotting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Camera size={18} className="text-[#D4AF37]" />
            </motion.div>
          ) : (
            <Camera size={18} />
          )}
        </button>
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {panelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[91] bg-black/20"
              onClick={() => setPanelOpen(false)}
            />

            {/* Panel */}
            <motion.div
              data-customizer-panel
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-1/2 left-6 -translate-y-1/2 z-[92] w-[300px] max-h-[80vh] rounded-2xl border border-emerald-500/20 shadow-2xl shadow-black/40 overflow-hidden"
              style={{
                backgroundColor: isLightBg ? 'rgba(255,255,255,0.95)' : 'rgba(13,17,23,0.95)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
              dir="rtl"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between p-4 border-b border-emerald-500/10">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: isLightBg ? '#111827' : '#e2e8f0' }}>
                  <Settings size={16} className="text-emerald-400" />
                  تخصيص الصفحة
                </h3>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-emerald-500/10">
                {[
                  { id: 'bg' as const, label: 'الخلفية', icon: Palette },
                  { id: 'text' as const, label: 'النص', icon: Type },
                  { id: 'size' as const, label: 'حجم الخط', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2 ${
                        isActive
                          ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                          : 'border-transparent text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="p-4 max-h-[55vh] overflow-y-auto customizer-scroll">
                {activeTab === 'bg' && (
                  <ColorTabContent
                    presets={BG_PRESETS}
                    activeColor={settings.bgColor}
                    customColor={customBg}
                    setCustomColor={setCustomBg}
                    onColorSelect={(color) =>
                      saveSettings({ ...settings, bgColor: color })
                    }
                    isLightBg={isLightBg}
                    label="لون الخلفية"
                  />
                )}
                {activeTab === 'text' && (
                  <ColorTabContent
                    presets={TEXT_PRESETS}
                    activeColor={settings.textColor}
                    customColor={customText}
                    setCustomColor={setCustomText}
                    onColorSelect={(color) =>
                      saveSettings({ ...settings, textColor: color })
                    }
                    isLightBg={isLightBg}
                    label="لون النص"
                  />
                )}
                {activeTab === 'size' && (
                  <FontSizeTabContent
                    fontSize={settings.fontSize}
                    onFontSizeChange={(size) =>
                      saveSettings({ ...settings, fontSize: size })
                    }
                    isLightBg={isLightBg}
                  />
                )}
              </div>

              {/* Panel Footer */}
              <div className="flex items-center gap-2 p-4 border-t border-emerald-500/10">
                <button
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                >
                  <RotateCcw size={13} />
                  استعادة الافتراضي
                </button>
                {highlightCount > 0 && (
                  <button
                    onClick={clearAllHighlights}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Eraser size={13} />
                    مسح التظليل
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Highlight Color Popup */}
      <AnimatePresence>
        {highlightPopup && (
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.8, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 6 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[95] rounded-xl p-2 shadow-xl shadow-black/30 border border-emerald-500/20"
            style={{
              left: `${highlightPopup.x}px`,
              top: `${highlightPopup.y}px`,
              transform: 'translate(-50%, -100%)',
              backgroundColor: 'rgba(13,17,23,0.95)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center gap-1.5">
              {HIGHLIGHT_PRESETS.map((color, i) => (
                <button
                  key={color}
                  onClick={() => applyHighlight(color)}
                  className="w-6 h-6 rounded-full border-2 border-transparent hover:border-white/60 hover:scale-110 transition-all duration-150 shadow-sm"
                  style={{ backgroundColor: color }}
                  title={`تظليل ${i + 1}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Injected inline styles for custom scrollbar */}
      <style jsx global>{`
        .customizer-scroll::-webkit-scrollbar { width: 4px; }
        .customizer-scroll::-webkit-scrollbar-track { background: transparent; }
        .customizer-scroll::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.3);
          border-radius: 2px;
        }
        .customizer-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.5);
        }
      `}</style>
    </>
  );
}

/* ===================================================================
   COLOR TAB CONTENT
   =================================================================== */

function ColorTabContent({
  presets,
  activeColor,
  customColor,
  setCustomColor,
  onColorSelect,
  isLightBg,
  label,
}: {
  presets: string[];
  activeColor: string;
  customColor: string;
  setCustomColor: (v: string) => void;
  onColorSelect: (color: string) => void;
  isLightBg: boolean;
  label: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-medium" style={{ color: isLightBg ? '#64748b' : '#94a3b8' }}>
        {label}
      </p>

      {/* Color Grid */}
      <div className="grid grid-cols-6 gap-2">
        {presets.map((color) => {
          const isActive = color === activeColor;
          const isLight = isLightColor(color);
          return (
            <button
              key={color}
              onClick={() => onColorSelect(color)}
              className={`w-full aspect-square rounded-lg transition-all duration-200 border-2 ${
                isActive
                  ? 'border-emerald-400 scale-110 shadow-md shadow-emerald-400/20'
                  : 'border-transparent hover:border-white/30 hover:scale-105'
              }`}
              style={{
                backgroundColor: color,
                boxShadow: isLight ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : undefined,
              }}
              title={color}
            >
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: isLight ? '#0a0a0f' : '#ffffff',
                      opacity: 0.8,
                    }}
                  />
                </motion.div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Color Input */}
      <div className="flex items-center gap-2 pt-1">
        <label className="text-xs" style={{ color: isLightBg ? '#64748b' : '#94a3b8' }}>
          مخصص:
        </label>
        <div className="relative flex-1">
          <input
            type="color"
            value={customColor || activeColor}
            onChange={(e) => {
              setCustomColor(e.target.value);
              onColorSelect(e.target.value);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="w-8 h-8 rounded-lg border border-emerald-500/20 cursor-pointer flex-shrink-0"
            style={{ backgroundColor: customColor || activeColor }}
          />
        </div>
        <input
          type="text"
          value={customColor || activeColor}
          onChange={(e) => {
            const val = e.target.value;
            setCustomColor(val);
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
              onColorSelect(val);
            }
          }}
          className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border border-emerald-500/20 outline-none focus:border-emerald-500/50 transition-colors"
          style={{
            backgroundColor: isLightBg ? '#f1f5f9' : '#111827',
            color: isLightBg ? '#1a1a1a' : '#e2e8f0',
          }}
          dir="ltr"
          maxLength={7}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

/* ===================================================================
   FONT SIZE TAB CONTENT
   =================================================================== */

function FontSizeTabContent({
  fontSize,
  onFontSizeChange,
  isLightBg,
}: {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  isLightBg: boolean;
}) {
  return (
    <div className="space-y-5">
      <p className="text-xs font-medium" style={{ color: isLightBg ? '#64748b' : '#94a3b8' }}>
        حجم الخط
      </p>

      {/* Preview */}
      <div
        className="rounded-xl p-4 text-center border border-emerald-500/15"
        style={{
          backgroundColor: isLightBg ? '#f8fafc' : '#111827',
        }}
      >
        <p
          className="leading-relaxed"
          style={{ fontSize: `${fontSize}px`, color: isLightBg ? '#1a1a1a' : '#e2e8f0' }}
        >
          مكتبة العلي الرقمية
        </p>
        <p
          className="mt-1"
          style={{
            fontSize: `${Math.max(10, fontSize - 3)}px`,
            color: isLightBg ? '#64748b' : '#64748b',
          }}
        >
          {fontSize}px
        </p>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <input
          type="range"
          min={12}
          max={28}
          step={1}
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #10b981 ${((fontSize - 12) / 16) * 100}%, ${
              isLightBg ? '#e2e8f0' : '#1a1a2e'
            } ${((fontSize - 12) / 16) * 100}%, ${isLightBg ? '#e2e8f0' : '#1a1a2e'} 100%)`,
          }}
        />

        {/* Size Labels */}
        <div className="flex justify-between text-[10px]" style={{ color: isLightBg ? '#94a3b8' : '#64748b' }}>
          <span>12px</span>
          <span>28px</span>
        </div>
      </div>

      {/* +/- Buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => onFontSizeChange(Math.max(12, fontSize - 1))}
          disabled={fontSize <= 12}
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-emerald-500/20 text-gray-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus size={16} />
        </button>

        <div
          className="w-16 h-10 rounded-xl flex items-center justify-center border border-emerald-500/20 text-lg font-bold"
          style={{
            color: isLightBg ? '#1a1a1a' : '#e2e8f0',
            backgroundColor: isLightBg ? '#f1f5f9' : '#111827',
          }}
        >
          {fontSize}
        </div>

        <button
          onClick={() => onFontSizeChange(Math.min(28, fontSize + 1))}
          disabled={fontSize >= 28}
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-emerald-500/20 text-gray-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex gap-2 justify-center">
        {[12, 14, 16, 18, 20, 24].map((size) => (
          <button
            key={size}
            onClick={() => onFontSizeChange(size)}
            className={`px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
              fontSize === size
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-emerald-500/15 text-gray-400 hover:border-emerald-500/30'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ===================================================================
   UTILITY
   =================================================================== */

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length !== 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Relative luminance
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs > 0.4;
}
