'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  BookOpen, Upload, Brain, MessageCircle, Search, Sparkles,
  Shield, ExternalLink, Send, FileText,
  BookMarked, Loader2, Menu, X, Star,
  ChevronLeft, ChevronRight, Heart, CheckCircle2, AlertTriangle,
  Zap, Globe, Library, Eye, Quote, BookType, Scale, Clock, Trash2, Bot, Bug,
  ChevronDown, Layers
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const MermaidRenderer = dynamic(() => import('@/components/MermaidRenderer'), { ssr: false });
import CosmicPortal from '@/components/CosmicPortal';
import CosmicParticles from '@/components/CosmicParticles';
import FloatingBookQuotes from '@/components/FloatingBookQuotes';
import GeoHoverEffect from '@/components/GeoHoverEffect';

/* ===================================================================
   CONSTANTS & DATA
   =================================================================== */

const LOGO_URL = 'https://www.image2url.com/r2/default/images/1776215661522-3ce7e2b6-4b67-46d7-898b-85a767165977.png';

// الفلترة تتم الآن على الخادم (/api/scrape) بمنطق متوازن بين منع الضجيج وجلب المحتوى

interface BookItem {
  id: string;
  name: string;
  url: string;
  addedAt: Date;
  category: string;
  confidence?: number;
}

interface ScrapedBook {
  id?: string;
  title?: string;
  name?: string;
  author?: string;
  pages?: string;
  url: string;
  selected: boolean;
  category?: string;
  confidence?: number;
  source?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ImamData {
  id: number;
  name: string;
  title: string;
  birth: string;
  death: string;
  period: string;
  description: string;
  books: string[];
  keyEvents: string[];
}

const BOOK_CATEGORIES = [
  { id: 'all', label: 'الكل', icon: Library },
  { id: 'tafsir', label: 'تفسير', icon: BookOpen },
  { id: 'aqaid', label: 'عقائد', icon: Shield },
  { id: 'fiqh', label: 'فقه', icon: Scale },
  { id: 'mantique', label: 'منطق', icon: Brain },
  { id: 'falsafa', label: 'فلسفة', icon: Sparkles },
  { id: 'tarikh', label: 'تاريخ', icon: Clock },
  { id: 'dua', label: 'أدعية', icon: Heart },
  { id: 'other', label: 'أخرى', icon: FileText },
];

const CATEGORY_MAP: Record<string, string> = {
  'تفسير': 'tafsir',
  'عقائد': 'aqaid',
  'فقه': 'fiqh',
  'منطق': 'mantique',
  'فلسفة': 'falsafa',
  'تاريخ': 'tarikh',
  'أدعية': 'dua',
  'أخرى': 'other',
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  'tafsir': 'تفسير',
  'aqaid': 'عقائد',
  'fiqh': 'فقه',
  'mantique': 'منطق',
  'falsafa': 'فلسفة',
  'tarikh': 'تاريخ',
  'dua': 'أدعية',
  'other': 'أخرى',
};

const IMAMS_DATA: ImamData[] = [
  { id: 1, name: 'علي بن أبي طالب', title: 'أمير المؤمنين (ع)', birth: '23 قبل الهجرة', death: '40 هـ', period: '35 عاماً', description: 'الإمام الأول والخليفة الرابع، ابن عم رسول الله (ص) وزوج فاطمة الزهراء (س). سيد البلغاء وأحد أعظم فقهاء الإسلام وعلمائه.', books: ['نهج البلاغة', 'ديوان الإمام علي', 'صحيفة علي'], keyEvents: ['بيعة الغدير', 'حرب الجمل', 'معركة صفين', 'النهروان'] },
  { id: 2, name: 'الحسن بن علي', title: 'الإمام الحسن المجتبى (ع)', birth: '3 هـ', death: '50 هـ', period: '10 أعوام', description: 'الإمام الثاني وسبط رسول الله (ص) الأكبر. عُرف بالحلم والكرم والتواضع، وأبرم صلحاً تاريخياً مع معاوية بن أبي سفيان.', books: ['رسائل الإمام الحسن', 'الصحيفة الحسنية'], keyEvents: ['صلح الحسن', 'البيعة', 'استشهاده'] },
  { id: 3, name: 'الحسين بن علي', title: 'الإمام الحسين الشهيد (ع)', birth: '4 هـ', death: '61 هـ', period: '10 أعوام', description: 'الإمام الثالث وسبط رسول الله (ص) الأصغر. ثار في كربلاء دفاعاً عن الإسلام الحقيقي ضد الظلم والانحراف، وأصبح رمزاً عالمياً للحرية والعدالة.', books: ['رسائل الإمام الحسين', 'الدعاء يوم عرفة', 'المنهج الحسيني'], keyEvents: ['خروج الكوفة', 'واقعة كربلاء', 'يوم عاشوراء'] },
  { id: 4, name: 'علي بن الحسين', title: 'الإمام زين العابدين (ع)', birth: '38 هـ', death: '95 هـ', period: '34 عاماً', description: 'الإمام الرابع وسيد الساجدين. عُرف بعبادته وزهده وتأليفه للصحيفة السجادية التي تُعدّ من أعظم الأدعية الإسلامية.', books: ['الصحيفة السجادية', 'رسائل الحقوق', 'نهج الحق'], keyEvents: ['كربلاء', 'رسالة الحقوق', 'دعاء أبي حمزة'] },
  { id: 5, name: 'محمد بن علي', title: 'الإمام محمد الباقر (ع)', birth: '57 هـ', death: '114 هـ', period: '19 عاماً', description: 'الإمام الخامس، ومنه انتشر لقب "الباقر" لتبحّره في العلوم. يُعدّ مؤسس أول جامعة إسلامية شاملة في المدينة المنورة.', books: ['تفسير الباقر', 'صحيفة الإمام الباقر', 'الجوامع العلمية'], keyEvents: ['تأسيس الحلقات العلمية', 'مناظرات مع العلماء', 'تدوين الحديث'] },
  { id: 6, name: 'جعفر بن محمد', title: 'الإمام جعفر الصادق (ع)', birth: '83 هـ', death: '148 هـ', period: '34 عاماً', description: 'الإمام السادس وشيخ المذاهب الفقهية. يُنسب إليه المذهب الجعفري. علّم آلاف الطلاب وأسهم في تأسيس علوم الفقه والأصول والكلام.', books: ['الكافي (روايات)', 'التوحيد', 'الحجة'], keyEvents: ['تأسيس المدرسة الجعفرية', 'مناظرات هشام', 'جمع العلوم'] },
  { id: 7, name: 'موسى بن جعفر', title: 'الإمام موسى الكاظم (ع)', birth: '128 هـ', death: '183 هـ', period: '21 عاماً', description: 'الإمام السابع المعروف بالصبر والحنان. سُجن سنوات طويلة في عهد هارون الرشيد ورغم ذلك ظلّ معلماً ومرشداً.', books: ['مصباح الكاظم', 'الرسائل الكاظمية', 'الدعاء'], keyEvents: ['سجن بغداد', 'الصبر على المحن', 'إرشاد الناس'] },
  { id: 8, name: 'علي بن موسى', title: 'الإمام علي الرضا (ع)', birth: '148 هـ', death: '203 هـ', period: '20 عاماً', description: 'الإمام الثامن وولي عهد المأمون العباسي. عُرف بعلمه الغزير وحكمته، وناظر علماء الأديان في المجالس الرسمية.', books: ['رسالة الرضا', 'المحجة البيضاء', 'الصحيفة الرضوية'], keyEvents: ['ولاية العهد', 'مناظرات المأمون', 'زيارة خراسان'] },
  { id: 9, name: 'محمد بن علي', title: 'الإمام محمد الجواد (ع)', birth: '195 هـ', death: '220 هـ', period: '17 عاماً', description: 'الإمام التاسع وأصغر الأئمة سناً عند توليه الإمامة. برز في العلم والفقه رغم صغر سنه.', books: ['مصباح الجواد', 'الرسائل الجوادية'], keyEvents: ['الجوابات العلمية', 'مناظرات بغداد'] },
  { id: 10, name: 'علي بن محمد', title: 'الإمام علي الهادي (ع)', birth: '212 هـ', death: '254 هـ', period: '24 عاماً', description: 'الإمام العاشر الذي عاش في ظروف قاسية من الرقابة العباسية. أقام في سامراء وأدار شؤون الأمة بحكمة.', books: ['رسائل الهادي', 'المسائل الهادية'], keyEvents: ['الإقامة الجبرية في سامراء', 'إدارة شؤون الشيعة'] },
  { id: 11, name: 'الحسن بن علي', title: 'الإمام الحسن العسكري (ع)', birth: '232 هـ', death: '260 هـ', period: '6 أعوام', description: 'الإمام الحادي عشر وأب الإمام المهدي. عاصر أشد فترات الاضطهاد العباسي وأعدّ الأمة لغيبة الإمام الثاني عشر.', books: ['رسائل العسكري', 'الوصية'], keyEvents: ['السجن العباسي', 'الإعداد للغيبة'] },
  { id: 12, name: 'محمد بن الحسن', title: 'الإمام المهدي المنتظر (عج)', birth: '255 هـ', death: 'مُخَلَّد', period: 'الغيبة الكبرى', description: 'الإمام الثاني عشر والقائد المنتظر الذي بشر به النبي (ص). في غيبة كبرى منذ سنة 329 هـ، وسيظهر لملء الأرض قسطاً وعدلاً.', books: ['الرسائل في الغيبة', 'توقيعات صاحب الزمان'], keyEvents: ['الغيبة الصغرى', 'الغيبة الكبرى', 'التوقيعات'] },
];

const NAV_ITEMS = [
  { id: 'hero', label: 'الرئيسية', icon: Globe },
  { id: 'fetch-engine', label: 'إحضار الكتب', icon: BookType },
  { id: 'books-archive', label: 'الكتب', icon: Library },
  { id: 'summarizer', label: 'المُلخِّص', icon: Sparkles },
  { id: 'validator', label: 'تدقيق البحوث', icon: Shield },
  { id: 'thinker', label: 'المفكر الشيعي', icon: Brain },
  { id: 'biography', label: 'سيرة آل محمد', icon: Heart },
  { id: 'search', label: 'البحث المتطور', icon: Search },
];

const HERO_BUTTONS = [
  { icon: BookType, label: 'إحضار الكتب', section: 'fetch-engine' },
  { icon: Library, label: 'الكتب', section: 'books-archive' },
  { icon: Sparkles, label: 'المُلخِّص', section: 'summarizer' },
  { icon: Shield, label: 'تدقيق البحوث', section: 'validator' },
  { icon: Brain, label: 'المفكر الشيعي', section: 'thinker' },
  { icon: Heart, label: 'سيرة آل محمد', section: 'biography' },
  { icon: Search, label: 'البحث المتطور', section: 'search' },
];

/* ===================================================================
   MAIN PAGE COMPONENT
   =================================================================== */

export default function Home() {
  const [activeSection, setActiveSection] = useState('hero');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPortal, setShowPortal] = useState(true);
  // === مخزن الكتب الدائم (Persistent Book Storage via localStorage) ===
  const STORAGE_KEY = 'ali-library-books';
  const [books, setBooks] = useState<BookItem[]>([]);
  const [booksLoaded, setBooksLoaded] = useState(false);

  // Load books from localStorage AFTER mount (avoids hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const restored = parsed.map((b: any) => ({ ...b, addedAt: new Date(b.addedAt) }));
          setBooks(restored);
        }
      }
    } catch (e) {
      console.warn('Failed to load books from localStorage:', e);
    }
    setBooksLoaded(true);
  }, []);

  // Save books to localStorage whenever they change (only after initial load)
  useEffect(() => {
    if (!booksLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch (e) {
      console.warn('Failed to save books to localStorage:', e);
    }
  }, [books, booksLoaded]);

  useEffect(() => {
    const handleScroll = () => {
      const sections = NAV_ITEMS.map(item => item.id);
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.getBoundingClientRect().top <= 150) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#0a0a0f' }}>
      {/* Cosmic Portal Loading Animation */}
      {showPortal && <CosmicPortal onComplete={() => setShowPortal(false)} />}

      {/* Geometric Background Overlay - Dark */}
      <div className="fixed inset-0 geo-pattern pointer-events-none z-0" />
      <div className="fixed inset-0 grid-overlay pointer-events-none z-0" />

      {/* Cosmic Floating Particles */}
      <CosmicParticles />

      {/* Floating Book Quotes Background - responds to scroll & mouse */}
      <FloatingBookQuotes />

      {/* Global Geometric Hover Effects on all buttons & interactive elements */}
      <GeoHoverEffect />

      {/* Navigation */}
      <Navigation
        activeSection={activeSection}
        scrollToSection={scrollToSection}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <MobileMenu
            scrollToSection={scrollToSection}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <HeroSection scrollToSection={scrollToSection} />

      {/* About Section */}
      <AboutSection />

      {/* Main Content Sections */}
      <main className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <FetchEngineSection books={books} setBooks={setBooks} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <BooksArchiveSection books={books} setBooks={setBooks} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <SummarizerSection />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <ValidatorSection />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <ThinkerSection />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <BiographySection />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <AdvancedSearchSection />
        </motion.div>
      </main>

      {/* Footer */}
      <FooterSection />

    </div>
  );
}

/* ===================================================================
   NAVIGATION
   =================================================================== */

function Navigation({ activeSection, scrollToSection, mobileMenuOpen, setMobileMenuOpen }: {
  activeSection: string;
  scrollToSection: (id: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
}) {
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('hero')}>
            <img src={LOGO_URL} alt="مكتبة العلي" className="w-9 h-9 rounded-full object-cover border border-emerald-500/30" />
            <div className="hidden sm:block">
              <h1 className="text-gray-100 font-bold text-base leading-tight">مكتبة العلي</h1>
              <p className="text-emerald-400 text-[10px]">Al-Ali Digital Library</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  onMouseEnter={() => setHoveredNav(item.id)}
                  onMouseLeave={() => setHoveredNav(null)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border overflow-hidden
                    ${isActive ? 'nav-active' : 'text-gray-400 hover:text-gray-100'}`}
                >
                  {/* Geometric hover background */}
                  <AnimatePresence>
                    {hoveredNav === item.id && !isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0, rotate: -90 }}
                        animate={{ scale: 1, opacity: 0.15, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0, rotate: 90 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 border-2 border-emerald-500/40"
                        style={{ clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)' }}
                      />
                    )}
                  </AnimatePresence>
                  <Icon size={14} className="relative z-10" />
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </div>
          <button
            className="lg:hidden p-2 rounded-lg text-gray-100 hover:bg-[#0d1117] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

function MobileMenu({ scrollToSection, setMobileMenuOpen }: {
  scrollToSection: (id: string) => void;
  setMobileMenuOpen: (v: boolean) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
      <div className="absolute top-16 left-0 right-0 bg-[#0d1117]/95 backdrop-blur-xl border-b border-emerald-500/15 p-4">
        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => scrollToSection(item.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-100 hover:bg-[#1a1a2e] transition-all text-sm font-medium w-full text-right">
                <Icon size={18} className="text-emerald-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ===================================================================
   HERO SECTION
   =================================================================== */

function HeroSection({ scrollToSection }: { scrollToSection: (id: string) => void }) {
  return (
    <section id="hero" className="relative flex flex-col items-center justify-center pt-20 pb-8 px-4" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Dark Geometric Decorations - MORE PROMINENT */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="absolute top-1/4 left-[8%] w-48 h-48 rotate-geo opacity-[0.25]">
          <div className="w-full h-full border-2 border-emerald-400/30 rounded-full" />
        </div>
        <div className="absolute bottom-1/3 right-[6%] w-64 h-64 rotate-geo opacity-[0.15]" style={{ animationDirection: 'reverse', animationDuration: '18s' }}>
          <div className="w-full h-full border border-emerald-400/20" style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }} />
        </div>
        <div className="absolute top-[15%] right-[20%] w-28 h-28 diamond-rotate opacity-[0.2]">
          <div className="w-full h-full border border-[#D4AF37]/25 rotate-45" />
        </div>
        <div className="absolute bottom-[15%] left-[15%] w-40 h-40 rotate-geo opacity-[0.12]" style={{ animationDuration: '20s', animationDirection: 'reverse' }}>
          <div className="w-full h-full border border-[#D4AF37]/15" style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} />
        </div>
        <div className="absolute top-[40%] left-[40%] w-20 h-20 triangle-morph opacity-[0.1]" style={{ animationDuration: '5s' }}>
          <div className="w-full h-full bg-emerald-500/5" style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }} />
        </div>
        <div className="absolute top-[60%] right-[35%] w-16 h-16 hexagon-spin opacity-[0.15]">
          <div className="w-full h-full border border-emerald-400/20 hex-clip" />
        </div>
        {/* Glow particles */}
        <div className="absolute top-[30%] left-[25%] w-3 h-3 glow-particle glow-particle-green" style={{ animationDelay: '0s' }} />
        <div className="absolute top-[50%] right-[30%] w-2 h-2 glow-particle glow-particle-gold" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-[30%] left-[45%] w-2.5 h-2.5 glow-particle glow-particle-green" style={{ animationDelay: '3s' }} />
      </div>

      {/* Orbital Logo System */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div initial={{ opacity: 0, scale: 0, rotate: -180 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }} className="relative">
          {/* Orbital Rings */}
          <div className="absolute inset-[-70px] rounded-full border border-emerald-400/25 orbit-1" />
          <div className="absolute inset-[-95px] rounded-full border border-emerald-400/20 orbit-2" />
          <div className="absolute inset-[-120px] rounded-full border border-[#D4AF37]/15 orbit-3" />
          <div className="absolute inset-[-145px] rounded-full border border-[#D4AF37]/10 orbit-4" />

          {/* Orbiting Dots */}
          <div className="absolute inset-0 orbit-1">
            <div className="absolute -top-[3px] left-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-sm shadow-emerald-400/50" />
          </div>
          <div className="absolute inset-0 orbit-2">
            <div className="absolute -top-[3px] left-1/2 w-1 h-1 bg-[#D4AF37] rounded-full shadow-sm shadow-[#D4AF37]/40" />
          </div>
          <div className="absolute inset-0 orbit-3">
            <div className="absolute -top-[3px] left-1/2 w-1.5 h-1.5 bg-emerald-300 rounded-full shadow-sm shadow-emerald-300/40" />
          </div>
          <div className="absolute inset-0 orbit-4">
            <div className="absolute -top-[2px] left-1/2 w-1 h-1 bg-[#D4AF37]/70 rounded-full shadow-sm shadow-[#D4AF37]/30" />
          </div>

          {/* Pulse Rings */}
          <div className="absolute inset-[-30px] rounded-full border border-emerald-400/20 pulse-ring" />
          <div className="absolute inset-[-50px] rounded-full border border-[#D4AF37]/12 pulse-ring" style={{ animationDelay: '1s' }} />

          {/* Logo Container */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[#0d1117] flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <div className="absolute inset-0 rounded-full shimmer-bg" />
            <img src={LOGO_URL} alt="مكتبة العلي" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="mt-8 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-100 mb-2">
            مكتبة العلي <span className="text-white" style={{ color: '#ffffff' }}>الرقمية</span>
          </h1>
          <p className="text-emerald-400 text-base sm:text-lg mb-1">Al-Ali Digital Library</p>
          <p className="text-gray-400 text-sm max-w-lg mx-auto leading-relaxed px-4">
            مختبر بحثي ذكي متخصص في الدراسات الإسلامية والفكر الشيعي
            <br />
            مدعوم بالذكاء الاصطناعي
          </p>
        </motion.div>

        {/* Compact Button Row - Dark Theme */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8 }} className="mt-10 px-4 w-full max-w-3xl">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {HERO_BUTTONS.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.section}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => scrollToSection(item.section)}
                  className="relative group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d1117]/80 border border-emerald-500/20 text-gray-200 hover:border-emerald-500/40 backdrop-blur-xl transition-all duration-200 text-sm font-medium cursor-pointer overflow-hidden"
                >
                  {/* Hexagon wireframe behind on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <motion.div
                      initial={false}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                      className="absolute w-12 h-12 border border-emerald-500/20"
                      style={{ clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)' }}
                    />
                  </div>
                  {/* Glow ripple on hover */}
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ animation: 'cosmic-hover-glow 1.5s ease-in-out infinite' }}
                  />
                  <Icon size={16} className="text-emerald-400 relative z-10" />
                  <span className="relative z-10">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ===================================================================
   ABOUT SECTION
   =================================================================== */

function AboutSection() {
  return (
    <section className="relative py-16 px-4" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="section-divider mb-16" />
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-8">عن مكتبة العلي الرقمية</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-6 hover:shadow-lg hover:shadow-emerald-500/5 backdrop-blur-xl transition-shadow duration-300"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-fit mb-4">
              <Globe size={22} className="text-emerald-400" />
            </div>
            <h3 className="text-gray-100 font-bold text-base mb-3">ما هو هذا الموقع؟</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              مكتبة العلي الرقمية هي منصة إلكترونية متقدمة تُعنى بتوفير بيئة بحثية ذكية متخصصة في الدراسات الإسلامية والفكر الشيعي الإمامي. تجمع المنصة بين التقنية الحديثة والذكاء الاصطناعي لتقديم أدوات بحثية فريدة تساعد الباحثين والطلاب والمهتمين في الوصول إلى المعارف الدينية بسهولة ودقة عالية.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-[#0d1117]/80 border border-[#D4AF37]/15 rounded-2xl p-6 hover:shadow-lg hover:shadow-[#D4AF37]/5 backdrop-blur-xl transition-shadow duration-300"
          >
            <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 w-fit mb-4">
              <Zap size={22} className="text-[#D4AF37]" />
            </div>
            <h3 className="text-gray-100 font-bold text-base mb-3">الهدف من المنصة</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              نسعى إلى تمكين الباحثين من تلخيص المراجع الطويلة بضغطة واحدة، وتدقيق البحوث العلمية ومقارنتها بالمصادر الأصلية لتعزيز دقتها وقوتها الاستدلالية. كما نهدف إلى توفير محاور عقائدي ذكي يجيب على الأسئلة الفكرية بعمق وأمانة علمية، مع بناء قاعدة بيانات شاملة لحياة المعصومين (ع) وتراثهم الفكري.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-6 hover:shadow-lg hover:shadow-emerald-500/5 backdrop-blur-xl transition-shadow duration-300"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-fit mb-4">
              <Brain size={22} className="text-emerald-400" />
            </div>
            <h3 className="text-gray-100 font-bold text-base mb-3">كيف يعمل النظام؟</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              يعتمد النظام على محرك ذكاء اصطناعي متطور لتحليل النصوص العربية وفهم سياقها الديني. عند رفع أي نص أو بحث، يقوم النظام بمعالجته فوراً وتقديم النتائج المطلوبة: تلخيص دقيق، تدقيق علمي، أو محاورة عقائدية عميقة. يمكنكم أيضاً البحث الموضوعي والوصول إلى قاعدة بيانات الأئمة الاثني عشر تفاعلياً.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ===================================================================
   BOOK FETCH ENGINE + BOOKS LIBRARY
   =================================================================== */

function FetchEngineSection({ books, setBooks }: { books: BookItem[]; setBooks: React.Dispatch<React.SetStateAction<BookItem[]>> }) {
  const [bookName, setBookName] = useState('');
  const [bookUrl, setBookUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Scan state
  const [scrapeUrl, setScrapeUrl] = useState('https://web.archive.org/web/20250105004220/http://shiaonlinelibrary.com/الكتب');
  const [scraping, setScraping] = useState(false);
  const [scrapedPdfs, setScrapedPdfs] = useState<ScrapedBook[]>([]);
  const [scrapeError, setScrapeError] = useState('');
  const [showScrapeResults, setShowScrapeResults] = useState(false);
  // iFrame Modal state
  // التوجيه لصفحة القارئ
  const router = useRouter();
  const navigateToReader = useCallback((bookUrl: string, bookTitle: string) => {
    const params = new URLSearchParams({ url: bookUrl, title: bookTitle });
    router.push(`/reader?${params.toString()}`);
  }, [router]);

  const validateAndAddBook = () => {
    setError('');
    if (!bookName.trim()) { setError('يجب إدخال اسم الكتاب'); return; }
    setLoading(true);
    setTimeout(() => {
      setBooks(prev => [{ id: Date.now().toString(), name: bookName.trim(), url: bookUrl.trim() || '', addedAt: new Date(), category: 'other' }, ...prev]);
      setBookName(''); setBookUrl(''); setLoading(false);
    }, 800);
  };

  const handleSmartScrape = async () => {
    setScrapeError('');
    if (!scrapeUrl.trim()) { setScrapeError('يجب إدخال رابط الموقع'); return; }
    try { new URL(scrapeUrl); } catch { setScrapeError('الرابط غير صالح'); return; }
    setScraping(true);
    setScrapedPdfs([]);
    setShowScrapeResults(false);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl }),
      });
      const data = await res.json();
      if (data.success && data.books && data.books.length > 0) {
        const mapped = data.books.map((b: any) => ({
          id: b.id,
          title: b.title || b.name,
          name: b.title || b.name,
          author: b.author || '',
          part: b.part || '',
          pages: b.part || '',
          url: b.url,
          pdfUrl: b.pdfUrl || '',
          selected: true,
          category: 'other',
          source: b.source || 'shia-library',
        }));
        // Lazy Loading: إظهار الكتب تدريجياً
        setScrapedPdfs([]);
        setShowScrapeResults(true);
        setScrapeError(`المحرك الذكي يستخرج ${mapped.length} كتاب...`);
        for (let i = 0; i < mapped.length; i++) {
          await new Promise(r => setTimeout(r, 50));
          setScrapedPdfs(prev => [...prev, mapped[i]]);
        }
        setScrapeError(`تم استخراج ${mapped.length} كتاب بواسطة المحرك الذكي المحلي`);
      } else {
        const msg = data.message || data.error || 'لم يتم العثور على كتب. تأكد أن الرابط يشير لمكتبة أو فهرس.';
        setScrapeError(msg);
      }
    } catch {
      setScrapeError('فشل الاتصال بالخادم. حاول مرة أخرى.');
    }
    setScraping(false);
  };

  const toggleScrapeSelect = (index: number) => {
    setScrapedPdfs(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p));
  };

  const updateScrapeCategory = (index: number, cat: string) => {
    setScrapedPdfs(prev => prev.map((p, i) => i === index ? { ...p, category: cat } : p));
  };

  const autoCategorize = async (name: string): Promise<string> => {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'categorize', content: name }),
      });
      const data = await res.json();
      if (data.success && data.result?.category) {
        const label = data.result.category;
        return CATEGORY_MAP[label] || 'other';
      }
    } catch {}
    return 'other';
  };

  const addSelectedBooks = async () => {
    const selected = scrapedPdfs.filter(p => p.selected);
    if (selected.length === 0) return;
    setLoading(true);
    const newBooks: BookItem[] = [];
    for (const pdf of selected) {
      const displayName = pdf.title || pdf.name || 'كتاب بدون عنوان';
      const bookUrl = pdf.url || '';
      // تأكد من أن الرابط فريد ويشير لكتاب محدد (يحتوي رقم_)
      if (!bookUrl || (!/\d+_/.test(bookUrl) && !bookUrl.includes('shiaonlinelibrary'))) continue;
      // تجنب إضافة نفس الرابط مرتين
      if (newBooks.some(b => b.url === bookUrl)) continue;
      newBooks.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        name: pdf.author ? `${displayName} — ${pdf.author}` : displayName,
        url: bookUrl,
        addedAt: new Date(),
        category: pdf.category || 'other',
        confidence: pdf.confidence,
      });
    }
    if (newBooks.length > 0) {
      setBooks(prev => {
        // إزالة الكتب المكررة بناءً على الرابط
        const existingUrls = new Set(prev.map(b => b.url));
        const unique = newBooks.filter(b => !existingUrls.has(b.url));
        return [...unique, ...prev];
      });
    }
    setScrapedPdfs([]);
    setShowScrapeResults(false);
    setScrapeUrl('');
    setScrapeError('');
    setLoading(false);
    if (newBooks.length > 0) {
      setTimeout(() => {
        const el = document.getElementById('books-archive');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  };

  return (
    <section id="fetch-engine" className="relative py-20 px-4" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="max-w-5xl mx-auto">
        <SectionHeader icon={BookOpen} title="محرك استخراج الكتب" subtitle="محرك استخراج ذكي محلي يحلل الروابط ويفلتر المحتوى — ويعرض الكتب مباشرة من المصدر" />

        {/* === SCRAPER TOOL === */}
        <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-6 sm:p-8 mt-8 backdrop-blur-xl shadow-lg shadow-black/20">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 rounded-full bg-emerald-500/10"><Zap size={16} className="text-emerald-400" /></div>
            <span className="text-gray-200 text-sm font-medium">محرك الإحضار الذكي</span>
            <div className="flex-1 h-px bg-emerald-500/10" />
          </div>

          {/* Manual Fetch */}
          <div className="mb-6">
            <h4 className="text-gray-300 text-xs font-semibold mb-3 flex items-center gap-2">
              <BookMarked size={14} className="text-emerald-400" />
              إحضار يدوي
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-500 text-xs mb-2 font-medium">اسم الكتاب</label>
                <input type="text" value={bookName} onChange={e => setBookName(e.target.value)} placeholder="مثال: نهج البلاغة - الإمام علي" className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/15 text-gray-100 text-sm input-glow focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-gray-500 text-xs mb-2 font-medium">رابط الكتاب (PDF فقط)</label>
                <input type="text" value={bookUrl} onChange={e => setBookUrl(e.target.value)} placeholder="https://example.com/book.pdf" className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/15 text-gray-100 text-sm input-glow focus:outline-none transition-all" dir="ltr" />
              </div>
            </div>
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" /><span className="text-red-400 text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <button onClick={validateAndAddBook} disabled={loading} className="btn-green px-6 py-3 rounded-xl text-white font-medium text-sm flex items-center gap-2 disabled:opacity-50 transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <BookMarked size={16} />}
              <span>{loading ? 'جارٍ الإحضار...' : 'إحضار يدوي'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="section-divider my-6" />

          {/* Smart Crawl */}
          <div>
            <h4 className="text-gray-300 text-xs font-semibold mb-3 flex items-center gap-2">
              <Bug size={14} className="text-[#D4AF37]" />
              محرك الاستخراج الشامل <span className="text-[10px] text-gray-500">(محرك ذكي محلي — تحليل الروابط والفهرسة)</span>
            </h4>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1">
                <input type="text" value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} placeholder="https://example.com/library" className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-[#D4AF37]/20 text-gray-100 text-sm input-glow focus:outline-none transition-all" dir="ltr" />
              </div>
              <button onClick={handleSmartScrape} disabled={scraping} className="btn-gold px-6 py-3 rounded-xl text-[#0a0a0f] font-medium text-sm flex items-center gap-2 disabled:opacity-50 transition-all shrink-0">
                {scraping ? <Loader2 size={16} className="animate-spin" /> : <Bug size={16} />}
                <span>{scraping ? 'جارٍ التحليل...' : 'استخراج الكتب'}</span>
              </button>
            </div>
            <AnimatePresence>
              {scrapeError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border mb-4 ${scrapeError.includes('تم') ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-red-500/10 border-red-500/20'}`}>
                  {scrapeError.includes('تم')
                    ? <><CheckCircle2 size={16} className="text-emerald-400 shrink-0" /><span className="text-emerald-300 text-sm">{scrapeError}</span></>
                    : <><AlertTriangle size={16} className="text-red-400 shrink-0" /><span className="text-red-400 text-sm">{scrapeError}</span></>
                  }
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrape progress — AI analyzing */}
            {scraping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
                  <Sparkles size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#D4AF37]" />
                </div>
                <span className="text-gray-300 text-sm font-medium">المحرك الذكي يحلل الصفحة...</span>
                <span className="text-gray-500 text-xs">جارٍ فحص الروابط واستخراج الكتب</span>
                <div className="w-52 h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#D4AF37] to-emerald-500 rounded-full" style={{ animation: 'shimmer 2s linear infinite', width: '70%' }} />
                </div>
              </motion.div>
            )}

            {/* Scrape Results — AI Powered */}
            <AnimatePresence>
              {showScrapeResults && scrapedPdfs.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-200 text-sm font-medium flex items-center gap-2">
                      <Sparkles size={14} className="text-[#D4AF37]" />
                      تم استخراج {scrapedPdfs.length} كتاب
                      <span className="text-gray-500 text-[10px]">(المحرك الذكي المحلي)</span>
                    </span>
                    <div className="flex gap-2">
                      <button onClick={addSelectedBooks} disabled={loading} className="btn-green px-4 py-2 rounded-lg text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        <span>إضافة المحدد ({scrapedPdfs.filter(p => p.selected).length})</span>
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto space-y-2 pl-2" style={{ scrollbarWidth: 'thin' }}>
                    {scrapedPdfs.map((pdf, index) => (
                      <motion.div key={pdf.id || index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.02 }}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all group ${pdf.selected ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-[#111827] border-emerald-500/10 opacity-60'}`}>
                        <input type="checkbox" checked={pdf.selected} onChange={() => toggleScrapeSelect(index)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 rounded accent-emerald-500 shrink-0 mt-1 cursor-pointer" />
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigateToReader(pdf.url, pdf.title || pdf.name || 'كتاب')}>
                          <p className="text-gray-100 text-sm font-bold leading-relaxed hover:text-emerald-300 transition-colors">{pdf.title || pdf.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {pdf.author && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#D4AF37]/80">
                                <BookMarked size={10} /> {pdf.author}
                              </span>
                            )}
                            {pdf.pages && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                                <FileText size={10} /> {pdf.pages} صفحة
                              </span>
                            )}
                            {pdf.url && pdf.url.endsWith('.pdf') && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/60">
                                <FileText size={10} /> PDF
                              </span>
                            )}
                          </div>
                        </div>
                        {/* قراءة في صفحة القارئ */}
                        {pdf.url && (
                          <button onClick={() => navigateToReader(pdf.url, pdf.title || pdf.name || 'كتاب')}
                            className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all shrink-0"
                            title="فتح في صفحة القراءة">
                            <BookOpen size={15} />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Feature Tags */}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
            <div className="flex items-center gap-1"><Zap size={12} className="text-emerald-500" /><span className="text-gray-400">محرك ذكي محلي: تحليل روابط + فحص HTML</span></div>
            <div className="flex items-center gap-1"><Eye size={12} className="text-emerald-500" /><span className="text-gray-400">قراءة مباشرة من المصدر عبر iFrame</span></div>
            <div className="flex items-center gap-1"><Zap size={12} className="text-[#D4AF37]" /><span className="text-gray-400">Lazy Loading: ظهور الكتب تدريجياً</span></div>
          </div>
        </div>

        {/* رابط الانتقال للمخزن */}
        {books.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center">
            <button onClick={() => { const el = document.getElementById('books-archive'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all">
              <Library size={16} /><span>عرض المكتبة ({books.length} كتاب)</span>
              <ChevronLeft size={16} />
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ===================================================================
   BOOKS ARCHIVE (المخزن - مع تجميع الموسوعات والسلاسل)
   =================================================================== */

// === دالة استخراج الكلمة الأساسية من اسم الكتاب للتجميع ===
function getBaseName(name: string): string {
  // إزالة اسم المؤلف بعد "—"
  const withoutAuthor = name.split('—')[0].trim();
  // إزالة الكلمات الشائعة
  const cleaned = withoutAuthor
    .replace(/^(الكتاب|الجزء|المجلد)\s*/i, '')
    .replace(/\s*(الجزء|المجلد)\s*\d+.*$/i, '')
    .trim();
  // أخذ أول كلمتين كاسم أساسي
  const words = cleaned.split(/\s+/);
  return words.slice(0, 2).join(' ');
}

// === دالة تجميع الكتب المتشابهة ===
interface BookGroup {
  type: 'single' | 'series';
  baseName: string;
  books: BookItem[];
}

function groupBooks(books: BookItem[]): BookGroup[] {
  if (books.length === 0) return [];

  // خريطة التجميع: baseName → مصفوفة كتب
  const groupsMap = new Map<string, BookItem[]>();

  for (const book of books) {
    const base = getBaseName(book.name);
    if (!groupsMap.has(base)) {
      groupsMap.set(base, []);
    }
    groupsMap.get(base)!.push(book);
  }

  const groups: BookGroup[] = [];
  for (const [baseName, groupBooks] of groupsMap) {
    if (groupBooks.length > 1) {
      groups.push({ type: 'series', baseName, books: groupBooks });
    } else {
      groups.push({ type: 'single', baseName, books: groupBooks });
    }
  }

  // ترتيب: الموسوعات أولاً (الأكثر كتباً) ثم المفردات
  groups.sort((a, b) => b.books.length - a.books.length);

  return groups;
}

function BooksArchiveSection({ books, setBooks }: { books: BookItem[]; setBooks: React.Dispatch<React.SetStateAction<BookItem[]>> }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const router = useRouter();

  const removeBook = (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
  };

  const removeGroup = (groupBooks: BookItem[]) => {
    const ids = new Set(groupBooks.map(b => b.id));
    setBooks(prev => prev.filter(b => !ids.has(b.id)));
  };

  const navigateToReader = (bookUrl: string, bookTitle: string) => {
    const params = new URLSearchParams({ url: bookUrl, title: bookTitle });
    router.push(`/reader?${params.toString()}`);
  };

  const toggleGroup = (baseName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(baseName)) {
        next.delete(baseName);
      } else {
        next.add(baseName);
      }
      return next;
    });
  };

  const filteredBooks = activeCategory === 'all'
    ? books
    : books.filter(b => b.category === activeCategory);

  const bookGroups = groupBooks(filteredBooks);

  return (
    <section id="books-archive" className="relative py-20 px-4" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="section-divider mb-20" />
      <div className="max-w-5xl mx-auto">
        <SectionHeader icon={Library} title="المكتبة الرقمية" subtitle="مخزن الكتب المشفوطة والمصنفة تلقائياً — الموسوعات والسلاسل متجمعة" />

        <div className="flex items-center justify-between mb-6 mt-8">
          <h3 className="text-gray-200 text-sm font-semibold flex items-center gap-2">
            <Library size={16} className="text-emerald-400" />
            <span>رفوف الكتب</span>
            <span className="text-emerald-400/50 text-xs">({books.length} كتاب)</span>
          </h3>
          {books.length > 0 && (
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <Layers size={11} /> الموسوعات متجمعة تلقائياً
            </span>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6" style={{ scrollbarWidth: 'none' }}>
          {BOOK_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            const count = cat.id === 'all' ? books.length : books.filter(b => b.category === cat.id).length;
            return (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border whitespace-nowrap shrink-0
                  ${isActive
                    ? 'category-active'
                    : 'text-gray-400 bg-[#0d1117]/60 border-emerald-500/10 hover:border-emerald-500/20 hover:text-gray-200'
                  }`}>
                <Icon size={13} />
                <span>{cat.label}</span>
                {count > 0 && <span className="text-[10px] opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Books Grid — مع تجميع الموسوعات */}
        {bookGroups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookGroups.map((group, index) => {
              if (group.type === 'series' && group.books.length > 1) {
                // === بطاقة موسوعة/سلسلة ===
                const isExpanded = expandedGroups.has(group.baseName);
                const catLabel = CATEGORY_LABEL_MAP[group.books[0].category] || 'أخرى';
                return (
                  <motion.div key={`group-${group.baseName}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                    className="bg-[#0d1117]/80 border border-[#D4AF37]/20 rounded-xl backdrop-blur-xl transition-all overflow-hidden hover:shadow-lg hover:shadow-[#D4AF37]/5"
                    style={{ gridColumn: 'span 1' }}>
                    {/* Header */}
                    <div className="p-4 cursor-pointer" onClick={() => toggleGroup(group.baseName)}>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 shrink-0">
                          <Layers size={18} className="text-[#D4AF37]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-gray-100 font-bold text-sm mb-1 truncate">{group.baseName}</h4>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px]">موسوعة</span>
                            <span className="text-gray-500 text-[10px]">{group.books.length} أجزاء</span>
                          </div>
                        </div>
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronDown size={16} className="text-[#D4AF37]/60 mt-1" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Expanded Parts */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-[#D4AF37]/10">
                          <div className="p-3 space-y-1.5 bg-[#0a0a0f]/40">
                            {group.books.map((book) => (
                              <div key={book.id}
                                className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-[#111827] transition-all cursor-pointer group/part"
                                onClick={() => navigateToReader(book.url, book.name)}>
                                <BookOpen size={14} className="text-emerald-400/60 shrink-0" />
                                <span className="flex-1 text-gray-300 text-xs truncate hover:text-emerald-300 transition-colors">{book.name}</span>
                                <button onClick={(e) => { e.stopPropagation(); removeBook(book.id); }}
                                  className="opacity-0 group-hover/part:opacity-100 p-1 rounded text-red-400/50 hover:text-red-400 transition-all shrink-0">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                            {/* زر حذف الكل */}
                            <div className="flex justify-center pt-1">
                              <button onClick={(e) => { e.stopPropagation(); removeGroup(group.books); }}
                                className="text-red-400/40 text-[10px] hover:text-red-400 transition-colors px-3 py-1">
                                حذف السلسلة كلها
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              }

              // === بطاقة كتاب مفرد ===
              const book = group.books[0];
              const catLabel = CATEGORY_LABEL_MAP[book.category] || 'أخرى';
              return (
                <motion.div key={book.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  className="book-card bg-[#0d1117]/80 border border-emerald-500/15 rounded-xl p-4 hover:shadow-lg hover:shadow-emerald-500/5 backdrop-blur-xl transition-all group cursor-pointer"
                  onClick={() => navigateToReader(book.url, book.name)}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15 shrink-0">
                      <BookOpen size={18} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-gray-100 font-semibold text-sm mb-1 truncate">{book.name}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px]">{catLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                        <span className="inline-flex items-center gap-1 text-[#D4AF37] text-xs opacity-70">
                          <Eye size={12} /><span>اضغط لقراءة الكتاب</span>
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); removeBook(book.id); }} className="inline-flex items-center gap-1 text-red-400/50 text-xs hover:text-red-400 transition-colors ml-auto">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="p-4 rounded-full bg-[#0d1117] border border-emerald-500/10">
              <Library size={36} className="text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">
              {books.length === 0 ? 'لا توجد كتب بعد. انتقل إلى "إحضار الكتب" لاستخراج كتب من المواقع.' : 'لا توجد كتب في هذا القسم.'}
            </p>
            {books.length === 0 && (
              <button onClick={() => { const el = document.getElementById('fetch-engine'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs hover:bg-[#D4AF37]/15 transition-all">
                <BookType size={14} /><span>الذهاب لإحضار الكتب</span>
              </button>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ===================================================================
   SUMMARIZER SECTION
   =================================================================== */

function SummarizerSection() {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setFileName(file.name); const reader = new FileReader(); reader.onload = (event) => setText(event.target?.result as string); reader.readAsText(file); }
  };

  const handleSummarize = async () => {
    if (!text.trim() || loading) return;
    setLoading(true); setResult('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summarize', content: text }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.result);
      } else {
        setResult(data.error || 'حدث خطأ غير معروف');
      }
    } catch (e: any) {
      setResult(`خطأ في الاتصال: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <section id="summarizer" className="relative py-20 px-4" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="section-divider mb-20" />
      <div className="max-w-5xl mx-auto">
        <SectionHeader icon={Sparkles} title="وحدة الأستاذ الذكي" subtitle="ارفع صفحات أو أبواب كاملة من الكتب ليقوم الذكاء الاصطناعي بتلخيصها واستخراج زبدة المطالب" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-6 backdrop-blur-xl shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-200 text-sm font-medium flex items-center gap-2"><Upload size={16} /><span>إدخال النص</span></h3>
              <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#111827] border border-emerald-500/15 text-gray-300 text-xs hover:border-emerald-500/25 transition-colors flex items-center gap-1">
                <FileText size={12} /><span>رفع ملف</span>
                <input type="file" accept=".txt,.md,.pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            {fileName && <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15 mb-3"><FileText size={14} className="text-emerald-400" /><span className="text-gray-300 text-xs truncate">{fileName}</span></div>}
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="الصق هنا النص المراد تلخيصه..." className="w-full h-64 px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/15 text-gray-100 text-sm input-glow focus:outline-none transition-all resize-none leading-relaxed" />
            <div className="flex items-center justify-between mt-4">
              <span className="text-gray-500 text-[11px]">{text.length} حرف</span>
              <button onClick={handleSummarize} disabled={loading || !text.trim()} className="btn-green px-5 py-2.5 rounded-xl text-white font-medium text-sm flex items-center gap-2 disabled:opacity-50 transition-all">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>{loading ? 'جارٍ التلخيص...' : 'تلخيص الآن'}</span>
              </button>
            </div>
          </div>
          <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-6 backdrop-blur-xl shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 mb-4"><Eye size={16} className="text-emerald-400" /><h3 className="text-gray-200 text-sm font-medium">النتيجة</h3></div>
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-gray-400">
                <Loader2 size={32} className="animate-spin text-emerald-400" /><span className="text-sm">جارٍ التحليل والتلخيص...</span>
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" /><div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" /><div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" /></div>
              </div>
            ) : result ? (
              <div className="h-64 overflow-y-auto px-4 py-3 rounded-xl bg-[#111827]/50 border border-emerald-500/10">
                <div className="prose prose-sm max-w-none prose-invert text-gray-200 leading-relaxed text-sm prose-headings:text-emerald-300 prose-strong:text-[#D4AF37] prose-li:text-gray-300"><ReactMarkdown>{result}</ReactMarkdown></div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-600 gap-2"><Sparkles size={40} /><span className="text-sm text-gray-500">ستظهر النتيجة هنا</span></div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===================================================================
   RESEARCH VALIDATOR SECTION
   =================================================================== */

function ValidatorSection() {
  const [research, setResearch] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setFileName(file.name); const reader = new FileReader(); reader.onload = (event) => setResearch(event.target?.result as string); reader.readAsText(file); }
  };

  const handleValidate = async () => {
    if (!research.trim()) return; setLoading(true); setResult('');
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'validate', content: research }) });
      const data = await res.json();
      if (data.success) {
        setResult(data.result);
      } else {
        setResult(`خطأ: ${data.error || 'غير معروف'}`);
      }
    } catch (e: any) {
      setResult(`خطأ في الاتصال: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <section id="validator" className="relative py-20 px-4" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="section-divider mb-20" />
      <div className="max-w-5xl mx-auto">
        <SectionHeader icon={Shield} title="تدقيق البحوث - Research Validator" subtitle="بوابة لرفع البحوث الدينية، مقارنتها بالمصادر الأصلية، تعديل الأخطاء، وإضافة أدلة وقرائن أقوى" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-6 backdrop-blur-xl shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-200 text-sm font-medium flex items-center gap-2"><Upload size={16} /><span>رفع البحث</span></h3>
              <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#111827] border border-emerald-500/15 text-gray-300 text-xs hover:border-emerald-500/25 transition-colors flex items-center gap-1">
                <FileText size={12} /><span>رفع ملف</span>
                <input type="file" accept=".txt,.md,.doc,.docx" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            {fileName && <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15 mb-3"><FileText size={14} className="text-emerald-400" /><span className="text-gray-300 text-xs truncate">{fileName}</span></div>}
            <textarea value={research} onChange={e => setResearch(e.target.value)} placeholder="الصق البحث أو ارفعه هنا..." className="w-full h-64 px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/15 text-gray-100 text-sm input-glow focus:outline-none transition-all resize-none leading-relaxed" />
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400/70 text-[10px] border border-emerald-500/15">مقارنة بالمصادر</span>
                <span className="px-2 py-1 rounded-md bg-[#D4AF37]/10 text-[#D4AF37]/70 text-[10px] border border-[#D4AF37]/15">تصحيح الأخطاء</span>
                <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400/70 text-[10px] border border-emerald-500/15">تقوية الأدلة</span>
              </div>
              <button onClick={handleValidate} disabled={loading || !research.trim()} className="btn-green px-5 py-2.5 rounded-xl text-white font-medium text-sm flex items-center gap-2 disabled:opacity-50 transition-all">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                <span>{loading ? 'جارٍ التدقيق...' : 'تدقيق البحث'}</span>
              </button>
            </div>
          </div>
          <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-6 backdrop-blur-xl shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 mb-4"><CheckCircle2 size={16} className="text-emerald-400" /><h3 className="text-gray-200 text-sm font-medium">نتائج التدقيق</h3></div>
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-gray-400">
                <Loader2 size={32} className="animate-spin text-emerald-400" /><span className="text-sm">جارٍ التحليل والمقارنة بالمصادر...</span>
                <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" /><div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" /><div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" /></div>
              </div>
            ) : result ? (
              <div className="h-64 overflow-y-auto px-4 py-3 rounded-xl bg-[#111827]/50 border border-emerald-500/10">
                <div className="prose prose-sm max-w-none prose-invert text-gray-200 leading-relaxed text-sm prose-headings:text-emerald-300 prose-strong:text-[#D4AF37] prose-li:text-gray-300"><ReactMarkdown>{result}</ReactMarkdown></div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-600 gap-2"><Shield size={40} /><span className="text-sm text-gray-500">ستظهر نتائج التدقيق هنا</span></div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===================================================================
   SHIA THINKER AI SECTION
   =================================================================== */

function ThinkerSection() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]); setInput(''); setLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'thinker', content: input.trim(), messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: data.result }]);
      } else {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: data.error || 'حدث خطأ' }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: `خطأ في الاتصال: ${e.message}` }]);
    }
    setLoading(false);
  };

  const suggestedQuestions = ['ما هي أدلة الإمامة من القرآن الكريم؟', 'ما الفرق بين التشيع والفرق الإسلامية الأخرى؟', 'ما معنى الغيبة الصغرى والكبرى؟', 'شرح فلسفي لمسألة التوحيد'];

  return (
    <section id="thinker" className="relative py-20 px-4" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="section-divider mb-20" />
      <div className="max-w-4xl mx-auto">
        <SectionHeader icon={Brain} title="المفكر الشيعي AI" subtitle="محاور عقائدي وفلسفي لتحليل النصوص العميقة وتفكيك الشبهات بالحجة والمنطق" />
        <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl mt-8 overflow-hidden backdrop-blur-xl shadow-lg shadow-black/20">
          <div className="h-96 overflow-y-auto p-4 sm:p-6 space-y-4" style={{ backgroundColor: '#080812' }}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/15"><Brain size={40} className="text-emerald-400" /></div>
                <div>
                  <p className="text-gray-100 font-medium mb-2">المفكر الشيعي AI</p>
                  <p className="text-gray-500 text-sm max-w-md">مرحباً بك. أنا محاور متخصص في العقيدة والفلسفة الإسلامية. اسألني أي سؤال عقائدي أو فكري.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 w-full max-w-lg">
                  {suggestedQuestions.map((q, i) => (
                    <button key={i} onClick={() => setInput(q)} className="px-3 py-2 rounded-lg bg-[#0d1117] border border-emerald-500/15 text-gray-300 text-xs hover:border-emerald-500/30 transition-all text-right">{q}</button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`max-w-[85%] ${msg.role === 'user' ? 'mr-auto' : 'ml-auto'}`}>
                    <div className={`p-4 ${msg.role === 'user' ? 'chat-user' : 'chat-ai'}`}>
                      {msg.role === 'assistant' && <div className="flex items-center gap-1.5 mb-2"><div className="p-1 rounded-full bg-emerald-500/10"><Brain size={12} className="text-emerald-400" /></div><span className="text-emerald-400 text-[11px] font-medium">المفكر الشيعي</span></div>}
                      <div className="text-gray-200 text-sm leading-relaxed prose prose-sm max-w-none prose-invert prose-headings:text-emerald-300 prose-headings:font-bold prose-p:text-gray-300 prose-strong:text-[#D4AF37] prose-blockquote:border-emerald-500/30 prose-blockquote:text-gray-400 prose-li:text-gray-300 prose-hr:border-emerald-500/20"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[85%] ml-auto">
                    <div className="chat-ai p-4">
                      <div className="flex items-center gap-1.5 mb-2"><div className="p-1 rounded-full bg-emerald-500/10"><Brain size={12} className="text-emerald-400" /></div><span className="text-emerald-400 text-[11px] font-medium">المفكر الشيعي</span></div>
                      <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" /><div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" /><div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" /></div>
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </>
            )}
          </div>
          <div className="border-t border-emerald-500/10 p-4 bg-[#0d1117]">
            <div className="flex gap-3">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="اكتب سؤالك العقائدي أو الفلسفي هنا..."
                className="flex-1 px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/15 text-gray-100 text-sm input-glow focus:outline-none transition-all resize-none leading-relaxed" rows={1} style={{ minHeight: '44px', maxHeight: '120px' }} />
              <button onClick={handleSend} disabled={loading || !input.trim()} className="btn-green p-3 rounded-xl text-white disabled:opacity-50 transition-all shrink-0">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===================================================================
   BIOGRAPHY SECTION
   =================================================================== */

function BiographySection() {
  const [selectedImam, setSelectedImam] = useState<ImamData | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4;
  const totalPages = Math.ceil(IMAMS_DATA.length / itemsPerPage);
  const currentImams = IMAMS_DATA.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  return (
    <section id="biography" className="relative py-20 px-4" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="section-divider mb-20" />
      <div className="max-w-5xl mx-auto">
        <SectionHeader icon={Heart} title="سيرة آل محمد (ع)" subtitle="قاعدة بيانات هولوغرامية تفاعلية مخصصة لحياة المعصومين الأربعة عشر وكتبهم ومواقفهم" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          {currentImams.map((imam, index) => (
            <motion.div key={imam.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.02 }} onClick={() => setSelectedImam(imam)}
              className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-5 cursor-pointer group hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-500/25 backdrop-blur-xl transition-all">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <span className="text-emerald-400 font-bold text-lg">{imam.id}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-100 font-bold text-sm mb-0.5">{imam.name}</h3>
                  <p className="text-emerald-400 text-xs mb-2">{imam.title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{imam.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
                    <span>{imam.birth} - {imam.death}</span><span>|</span><span>{imam.period}</span><span>|</span><span>{imam.books.length} مصنف</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="p-2 rounded-lg bg-[#0d1117] border border-emerald-500/15 text-emerald-400 disabled:opacity-30 hover:bg-[#111827] transition-colors"><ChevronRight size={18} /></button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${currentPage === i ? 'bg-emerald-600 text-white' : 'bg-[#0d1117] border border-emerald-500/15 text-gray-300 hover:bg-[#111827]'}`}>{i + 1}</button>
            ))}
            <button onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage === totalPages - 1} className="p-2 rounded-lg bg-[#0d1117] border border-emerald-500/15 text-emerald-400 disabled:opacity-30 hover:bg-[#111827] transition-colors"><ChevronLeft size={18} /></button>
          </div>
        )}
        <AnimatePresence>
          {selectedImam && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImam(null)}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()}
                className="relative bg-[#0d1117] rounded-2xl p-6 sm:p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto border border-emerald-500/20 shadow-2xl">
                <button onClick={() => setSelectedImam(null)} className="absolute top-4 left-4 p-1.5 rounded-lg bg-[#111827] border border-emerald-500/15 text-gray-300 hover:bg-[#1a1a2e] transition-colors"><X size={18} /></button>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center"><span className="text-emerald-400 font-bold text-2xl">{selectedImam.id}</span></div>
                  <div><h2 className="text-gray-100 font-bold text-lg">{selectedImam.name}</h2><p className="text-emerald-400 text-sm">{selectedImam.title}</p></div>
                </div>
                <div className="space-y-5">
                  <div className="flex items-center gap-3 text-sm"><Star size={14} className="text-[#D4AF37] shrink-0" /><span className="text-gray-500">الفترة:</span><span className="text-gray-200">{selectedImam.birth} - {selectedImam.death}</span><span className="text-gray-600 text-xs">({selectedImam.period})</span></div>
                  <p className="text-gray-300 text-sm leading-relaxed">{selectedImam.description}</p>
                  <div>
                    <h4 className="text-gray-200 font-medium text-sm mb-3 flex items-center gap-2"><Zap size={14} className="text-[#D4AF37]" /><span>أحداث ومواقف بارزة</span></h4>
                    <div className="flex flex-wrap gap-2">{selectedImam.keyEvents.map((event, i) => (<span key={i} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15 text-gray-300 text-xs">{event}</span>))}</div>
                  </div>
                  <div>
                    <h4 className="text-gray-200 font-medium text-sm mb-3 flex items-center gap-2"><BookOpen size={14} className="text-emerald-400" /><span>المؤلفات والكتب</span></h4>
                    <div className="flex flex-wrap gap-2">{selectedImam.books.map((book, i) => (<span key={i} className="px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/15 text-[#D4AF37] text-xs flex items-center gap-1"><BookMarked size={10} className="text-[#D4AF37]" />{book}</span>))}</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ===================================================================
   ADVANCED SEARCH SECTION
   =================================================================== */

function AdvancedSearchSection() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return; setLoading(true); setResults('');
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'search', content: query }) });
      const data = await res.json();
      setResults(data.success ? data.result : 'حدث خطأ: ' + (data.error || ''));
    } catch { setResults('فشل الاتصال بالخادم. حاول مرة أخرى.'); }
    setLoading(false);
  };

  return (
    <section id="search" className="relative py-20 px-4" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="section-divider mb-20" />
      <div className="max-w-4xl mx-auto">
        <SectionHeader icon={Search} title="البحث المتطور" subtitle="بحث موضوعي يعتمد على المنطق والمعنى وليس مجرد الكلمات - مفهومي وعميق" />
        <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl mt-8 p-6 sm:p-8 backdrop-blur-xl shadow-lg shadow-black/20">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                placeholder="ابحث عن موضوع، مسألة فقهية، مفهوم عقائدي..."
                className="w-full pr-11 pl-4 py-3.5 rounded-xl bg-[#111827] border border-emerald-500/15 text-gray-100 text-sm input-glow focus:outline-none transition-all" />
            </div>
            <button onClick={handleSearch} disabled={loading || !query.trim()} className="btn-green px-6 py-3.5 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all shrink-0">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span>{loading ? 'جارٍ البحث...' : 'بحث موضوعي'}</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {['التوحيد', 'الإمامة', 'العدل الإلهي', 'النبوة', 'المعاد', 'فقه الصلاة', 'أصول الدين', 'فروع الدين'].map(tag => (
              <button key={tag} onClick={() => setQuery(tag)} className="px-3 py-1.5 rounded-lg bg-[#111827] border border-emerald-500/15 text-gray-300 text-xs hover:border-emerald-500/25 transition-all">{tag}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-6 text-[11px] text-gray-500"><Brain size={12} /><span>يعتمد على تحليل المعنى والمفهوم وليس مجرد مطابقة الكلمات</span></div>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 size={32} className="animate-spin text-emerald-400" /><span className="text-sm">جارٍ التحليل الموضوعي...</span>
              <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" /><div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" /><div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" /></div>
            </div>
          ) : results ? (
            <div className="rounded-xl bg-[#111827]/50 border border-emerald-500/10 p-5">
              <div className="flex items-center gap-2 mb-3"><CheckCircle2 size={16} className="text-emerald-400" /><span className="text-gray-200 text-sm font-medium">نتائج البحث الموضوعي</span></div>
              <div className="prose prose-sm max-w-none prose-invert text-gray-200 leading-relaxed text-sm prose-headings:text-emerald-300 prose-strong:text-[#D4AF37] prose-li:text-gray-300"><ReactMarkdown>{results}</ReactMarkdown></div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ===================================================================
   FOOTER
   =================================================================== */

function FooterSection() {
  return (
    <footer className="relative py-12 px-4 border-t border-emerald-500/10" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="max-w-5xl mx-auto text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src={LOGO_URL} alt="مكتبة العلي" className="w-8 h-8 rounded-full border border-emerald-500/20" />
          <span className="text-gray-200 font-bold text-sm">مكتبة العلي الرقمية</span>
        </div>
        <p className="text-gray-500 text-xs mb-4">مختبر بحثي ذكي متخصص في الدراسات الإسلامية والفكر الشيعي</p>
        <div className="flex items-center justify-center gap-4 mb-4 text-[11px] text-gray-600">
          <span>مدعوم بالذكاء الاصطناعي</span><span>|</span><span>تصميم هندسي معقد</span><span>|</span><span>Al-Ali Digital Library</span>
        </div>
        <div className="flex items-center justify-center gap-1 text-gray-600/50 text-[10px]"><Quote size={10} /><span>بسم الله الرحمن الرحيم</span></div>
      </div>
    </footer>
  );
}

/* ===================================================================
   SHARED COMPONENTS
   =================================================================== */

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex p-3 rounded-2xl bg-[#0d1117]/80 border border-emerald-500/20 mb-4 backdrop-blur-xl">
        <Icon size={24} className="text-emerald-400" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-3">{title}</h2>
      <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">{subtitle}</p>
    </div>
  );
}
