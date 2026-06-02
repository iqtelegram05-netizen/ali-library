'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Users, Shield, Trash2, Crown,
  Loader2, ArrowRight, LogOut, AlertTriangle,
  CheckCircle2, Settings, UserPlus, Pencil, X,
  Eye, Database, Activity, TrendingUp, Search,
  Save, BarChart3, Globe, UserCog, Key, Lock,
  Zap, Sparkles, BookMarked, FileText, Bug,
} from 'lucide-react';

interface BookData {
  id: string;
  name: string;
  url: string;
  category: string;
  createdAt: string;
  addedBy?: string | null;
}

interface UserData {
  id: string;
  name: string | null;
  displayName: string | null;
  email: string;
  role: string;
  image: string | null;
  createdAt: string;
}

const ADMIN_SECRET_STORAGE = 'ali-admin-secret';

const fetchBooks = async (): Promise<BookData[]> => {
  const res = await fetch('/api/books');
  const data = await res.json();
  return data.success ? data.books : [];
};

const getAdminHeaders = (): Record<string, string> => {
  const secret = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_SECRET_STORAGE) : '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${secret}`,
  };
};

const fetchUsers = async (): Promise<UserData[]> => {
  const res = await fetch('/api/admin/users', { headers: getAdminHeaders() });
  const data = await res.json();
  return data.success ? data.users : [];
};

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [secretInput, setSecretInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [books, setBooks] = useState<BookData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fetch' | 'books' | 'users' | 'settings'>('dashboard');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [editBookName, setEditBookName] = useState('');
  const [editBookCategory, setEditBookCategory] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch engine state
  const [bookName, setBookName] = useState('');
  const [bookUrl, setBookUrl] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [fetchLoading, setFetchLoading] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('https://web.archive.org/web/20250105004220/http://shiaonlinelibrary.com/الكتب');
  const [scraping, setScraping] = useState(false);
  const [scrapedPdfs, setScrapedPdfs] = useState<{ id?: string; title?: string; name?: string; author?: string; pages?: string; url: string; selected: boolean; category?: string }[]>([]);
  const [scrapeError, setScrapeError] = useState('');
  const [showScrapeResults, setShowScrapeResults] = useState(false);

  // Check if already authenticated on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('ali-admin-auth');
      if (auth === 'true') {
        setIsAuthenticated(true);
      }
      setIsCheckingAuth(false);
    }
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      const [booksData, usersData] = await Promise.all([fetchBooks(), fetchUsers()]);
      setBooks(booksData);
      setUsers(usersData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secretInput }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('ali-admin-auth', 'true');
        localStorage.setItem(ADMIN_SECRET_STORAGE, secretInput);
        setIsAuthenticated(true);
      } else {
        setAuthError('المفتاح السري غير صحيح');
      }
    } catch {
      setAuthError('فشل الاتصال بالخادم');
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('ali-admin-auth');
    localStorage.removeItem(ADMIN_SECRET_STORAGE);
    setIsAuthenticated(false);
    setBooks([]);
    setUsers([]);
    setToast({ message: 'تم تسجيل الخروج بنجاح', type: 'success' });
    setTimeout(() => setToast(null), 2000);
    router.push('/');
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const deleteBook = async (id: string) => {
    try {
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE', headers: getAdminHeaders() });
      const data = await res.json();
      if (data.success) {
        setBooks(prev => prev.filter(b => b.id !== id));
        setDeleteConfirm(null);
        showToast('تم حذف الكتاب بنجاح', 'success');
      }
    } catch (e) { console.error(e); }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
        showToast('تم تحديث دور المستخدم', 'success');
      }
    } catch (e) { console.error(e); }
  };

  const startEditBook = (book: BookData) => {
    setEditBookId(book.id);
    setEditBookName(book.name);
    setEditBookCategory(book.category);
  };

  const cancelEditBook = () => {
    setEditBookId(null);
    setEditBookName('');
    setEditBookCategory('');
  };

  const saveEditBook = async (id: string) => {
    if (!editBookName.trim()) return;
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ name: editBookName.trim(), category: editBookCategory }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('تم تحديث الكتاب بنجاح', 'success');
        cancelEditBook();
        await loadData();
      } else {
        showToast(data.error || 'فشل في تحديث الكتاب', 'error');
      }
    } catch (e) { console.error(e); showToast('فشل الاتصال بالخادم', 'error'); }
  };

  // ===== FETCH ENGINE HANDLERS =====
  const handleManualAdd = async () => {
    setFetchError('');
    if (!bookName.trim()) { setFetchError('يجب إدخال اسم الكتاب'); return; }
    setFetchLoading(true);
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ name: bookName.trim(), url: bookUrl.trim() || '', category: 'other' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('تم إضافة الكتاب بنجاح', 'success');
        setBookName(''); setBookUrl('');
        await loadData();
      } else { setFetchError(data.error || 'فشل في إضافة الكتاب'); }
    } catch { setFetchError('فشل الاتصال بالخادم'); }
    setFetchLoading(false);
  };

  const handleSmartScrape = async () => {
    setScrapeError('');
    if (!scrapeUrl.trim()) { setScrapeError('يجب إدخال رابط الموقع'); return; }
    try { new URL(scrapeUrl); } catch { setScrapeError('الرابط غير صالح'); return; }
    setScraping(true); setScrapedPdfs([]); setShowScrapeResults(false);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl }),
      });
      const data = await res.json();
      if (data.success && data.books && data.books.length > 0) {
        const mapped = data.books.map((b: any) => ({
          id: b.id, title: b.title || b.name, name: b.title || b.name, author: b.author || '',
          pages: b.part || '', url: b.url, selected: true, category: 'other', source: b.source || 'shia-library',
        }));
        setScrapedPdfs([]); setShowScrapeResults(true);
        setScrapeError(`المحرك الذكي يستخرج ${mapped.length} كتاب...`);
        for (let i = 0; i < mapped.length; i++) {
          await new Promise(r => setTimeout(r, 50));
          setScrapedPdfs(prev => [...prev, mapped[i]]);
        }
        setScrapeError(`تم استخراج ${mapped.length} كتاب بنجاح`);
      } else {
        setScrapeError(data.message || data.error || 'لم يتم العثور على كتب');
      }
    } catch { setScrapeError('فشل الاتصال بالخادم'); }
    setScraping(false);
  };

  const toggleScrapeSelect = (index: number) => {
    setScrapedPdfs(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p));
  };

  const addSelectedBooks = async () => {
    const selected = scrapedPdfs.filter(p => p.selected);
    if (selected.length === 0) return;
    setFetchLoading(true); let addedCount = 0;
    for (const pdf of selected) {
      const displayName = pdf.title || pdf.name || 'كتاب بدون عنوان';
      const url = pdf.url || '';
      if (!url || (!/\d+_/.test(url) && !url.includes('shiaonlinelibrary'))) continue;
      try {
        const res = await fetch('/api/books', {
          method: 'POST', headers: getAdminHeaders(),
          body: JSON.stringify({ name: pdf.author ? `${displayName} — ${pdf.author}` : displayName, url, category: pdf.category || 'other' }),
        });
        const data = await res.json();
        if (data.success) addedCount++;
      } catch { /* skip */ }
    }
    setScrapedPdfs([]); setShowScrapeResults(false); setScrapeError('');
    setFetchLoading(false);
    if (addedCount > 0) {
      showToast(`تم إضافة ${addedCount} كتاب بنجاح`, 'success');
      await loadData();
    } else { setScrapeError('لم يتم إضافة أي كتاب جديد'); }
  };

  // ===== AUTH CHECKING STATE =====
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  // ===== LOGIN GATE =====
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0a0a0f' }}>
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-[15%] w-48 h-48 border border-emerald-500/10 rounded-full opacity-20" />
          <div className="absolute bottom-1/3 right-[10%] w-64 h-64 border border-[#D4AF37]/8 rounded-full opacity-15" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md"
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent rounded-t-3xl" />

          <div className="bg-[#0d1117]/95 border border-emerald-500/20 rounded-3xl backdrop-blur-2xl shadow-2xl shadow-emerald-500/5 overflow-hidden p-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-16 h-16 rounded-full bg-[#0a0a0f] border-2 border-emerald-500/30 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10"
              >
                <Key size={24} className="text-emerald-400" />
              </motion.div>
              <h1 className="text-xl font-bold text-gray-100 mb-1">لوحة التحكم</h1>
              <p className="text-gray-400 text-sm">أدخل المفتاح السري للوصول</p>
            </div>

            <form onSubmit={handleLogin}>
              {/* Error */}
              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center"
                >
                  {authError}
                </motion.div>
              )}

              {/* Password Input */}
              <div className="mb-6">
                <label className="block text-gray-400 text-xs font-medium mb-2">المفتاح السري</label>
                <div className="relative group">
                  <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/50 group-focus-within:text-emerald-400 transition-colors" />
                  <input
                    type="password"
                    dir="ltr"
                    value={secretInput}
                    onChange={(e) => setSecretInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-4 py-3 rounded-xl bg-[#111827]/80 border border-emerald-500/15 text-gray-100 text-sm placeholder:text-gray-600 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all duration-300"
                    autoFocus
                  />
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={authLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-shadow duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {authLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Key size={18} />
                    <span>دخول لوحة التحكم</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Back link */}
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push('/')}
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors flex items-center gap-1.5 mx-auto"
              >
                <ArrowRight size={14} />
                <span>العودة للرئيسية</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ===== ADMIN DASHBOARD =====
  const CATEGORY_LABELS: Record<string, string> = {
    tafsir: 'تفسير', aqaid: 'عقائد', fiqh: 'فقه', mantique: 'منطق',
    falsafa: 'فلسفة', tarikh: 'تاريخ', dua: 'أدعية', other: 'أخرى',
  };
  const ROLE_LABELS: Record<string, string> = {
    owner: 'المالك', admin: 'مشرف', user: 'مستخدم',
  };
  const ROLE_COLORS: Record<string, string> = {
    owner: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20',
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    user: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  // Category counts
  const categoryCounts = books.reduce((acc, b) => {
    acc[b.category] = (acc[b.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter data
  const filteredBooks = books.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (CATEGORY_LABELS[b.category] || '').includes(searchQuery)
  );
  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalBooks = books.length;
  const totalUsers = users.length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;
  const totalOwners = users.filter(u => u.role === 'owner').length;
  const recentUsers = users.filter(u => {
    const diff = Date.now() - new Date(u.createdAt).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl border shadow-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/20 border-red-500/30 text-red-400'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} className="inline ml-2" /> : <AlertTriangle size={16} className="inline ml-2" />}
          {toast.message}
        </motion.div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-50" style={{ backgroundColor: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/')} className="p-2 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100 transition-all">
                <ArrowRight size={18} />
              </button>
              <div className="flex items-center gap-2">
                <Crown size={20} className="text-[#f59e0b]" />
                <h1 className="text-gray-100 font-bold text-base">لوحة التحكم</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20">
                المالك
              </span>
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all" title="تسجيل الخروج">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { icon: BookOpen, label: 'إجمالي الكتب', value: totalBooks, color: '#10b981', sub: `${Object.keys(categoryCounts).length} تصنيف` },
            { icon: Users, label: 'المستخدمين', value: totalUsers, color: '#D4AF37', sub: `${recentUsers} جدد هذا الأسبوع` },
            { icon: Shield, label: 'المشرفين', value: totalAdmins, color: '#8b5cf6', sub: `إضافة/إزالة مشرفين` },
            { icon: Crown, label: 'المالك', value: totalOwners, color: '#f59e0b', sub: 'تحكم كامل' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-4 backdrop-blur-xl hover:border-emerald-500/25 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={16} style={{ color: stat.color }} />
                <span className="text-gray-500 text-xs">{stat.label}</span>
              </div>
              <span className="text-2xl font-bold text-gray-100">{stat.value}</span>
              <p className="text-gray-600 text-[10px] mt-1">{stat.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'dashboard' as const, label: 'لوحة المعلومات', icon: BarChart3 },
            { id: 'fetch' as const, label: 'جلب الكتب', icon: Zap },
            { id: 'books' as const, label: 'إدارة الكتب', icon: BookOpen },
            { id: 'users' as const, label: 'إدارة المستخدمين', icon: Users },
            { id: 'settings' as const, label: 'الإعدادات', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-[#0d1117]/50 border border-emerald-500/10 text-gray-400 hover:text-gray-200'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {/* ===== DASHBOARD TAB ===== */}
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Category Distribution */}
            <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-gray-100 font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-400" />
                توزيع الكتب حسب التصنيف
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(categoryCounts).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([cat, count]) => (
                  <div key={cat} className="bg-[#111827] rounded-xl p-3 border border-emerald-500/10">
                    <p className="text-gray-400 text-xs">{CATEGORY_LABELS[cat] || cat}</p>
                    <p className="text-xl font-bold text-gray-100 mt-1">{count as number}</p>
                    <div className="w-full h-1 bg-[#1a1a2e] rounded-full mt-2">
                      <div
                        className="h-full bg-emerald-500/50 rounded-full transition-all duration-500"
                        style={{ width: `${((count as number) / totalBooks) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-gray-100 font-bold mb-4 flex items-center gap-2">
                <Activity size={18} className="text-emerald-400" />
                آخر المستخدمين المسجلين
              </h2>
              {users.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">لا يوجد مستخدمين بعد</p>
              ) : (
                <div className="space-y-2">
                  {users.slice(0, 5).map((user, i) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 bg-[#111827] rounded-xl border border-emerald-500/5">
                      <div className="w-8 text-gray-600 text-xs font-bold">{i + 1}</div>
                      {user.image ? (
                        <img src={user.image} alt="" className="w-8 h-8 rounded-full border border-emerald-500/20" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Users size={14} className="text-emerald-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-200 text-sm font-medium truncate">{user.displayName || user.name || 'بدون اسم'}</p>
                        <p className="text-gray-500 text-[10px] truncate" dir="ltr">{user.email}</p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${ROLE_COLORS[user.role] || ROLE_COLORS.user}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                      <span className="text-gray-600 text-[10px]">
                        {new Date(user.createdAt).toLocaleDateString('ar')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-[#0d1117]/80 border border-[#D4AF37]/15 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-gray-100 font-bold mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-[#D4AF37]" />
                إجراءات سريعة
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button onClick={() => setActiveTab('fetch')}
                  className="flex items-center gap-2 p-3 bg-[#111827] rounded-xl hover:bg-[#D4AF37]/10 border border-[#D4AF37]/10 hover:border-[#D4AF37]/20 transition-all text-sm text-gray-300">
                  <Zap size={16} className="text-[#D4AF37]" /> جلب كتب
                </button>
                <button onClick={() => setActiveTab('books')}
                  className="flex items-center gap-2 p-3 bg-[#111827] rounded-xl hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 transition-all text-sm text-gray-300">
                  <BookOpen size={16} className="text-emerald-400" /> إدارة الكتب
                </button>
                <button onClick={() => setActiveTab('users')}
                  className="flex items-center gap-2 p-3 bg-[#111827] rounded-xl hover:bg-purple-500/10 border border-purple-500/10 hover:border-purple-500/20 transition-all text-sm text-gray-300">
                  <UserCog size={16} className="text-purple-400" /> إدارة المشرفين
                </button>
                <button onClick={() => setActiveTab('settings')}
                  className="flex items-center gap-2 p-3 bg-[#111827] rounded-xl hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 transition-all text-sm text-gray-300">
                  <Settings size={16} className="text-emerald-400" /> الإعدادات
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== FETCH TAB ===== */}
        {activeTab === 'fetch' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Manual Add */}
            <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-gray-100 font-bold mb-4 flex items-center gap-2">
                <BookMarked size={18} className="text-emerald-400" />
                إحضار كتاب يدوي
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-500 text-xs mb-2 font-medium">اسم الكتاب</label>
                  <input type="text" value={bookName} onChange={e => setBookName(e.target.value)} placeholder="مثال: نهج البلاغة - الإمام علي" className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/15 text-gray-100 text-sm focus:border-emerald-500/40 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-gray-500 text-xs mb-2 font-medium">رابط الكتاب (PDF) — اختياري</label>
                  <input type="text" value={bookUrl} onChange={e => setBookUrl(e.target.value)} placeholder="https://example.com/book.pdf" className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/15 text-gray-100 text-sm focus:border-emerald-500/40 focus:outline-none transition-all" dir="ltr" />
                </div>
              </div>
              <AnimatePresence>
                {fetchError && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                    <AlertTriangle size={16} className="text-red-400 shrink-0" /><span className="text-red-400 text-sm">{fetchError}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <button onClick={handleManualAdd} disabled={fetchLoading} className="px-6 py-3 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white font-medium text-sm flex items-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-emerald-500/20">
                {fetchLoading ? <Loader2 size={16} className="animate-spin" /> : <BookMarked size={16} />}
                <span>{fetchLoading ? 'جارٍ الإحضار...' : 'إحضار الكتاب'}</span>
              </button>
            </div>

            {/* Smart Scrape Engine */}
            <div className="bg-[#0d1117]/80 border border-[#D4AF37]/15 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-gray-100 font-bold mb-1 flex items-center gap-2">
                <Bug size={18} className="text-[#D4AF37]" />
                محرك الاستخراج الشامل
              </h2>
              <p className="text-gray-500 text-xs mb-4">محرك ذكي محلي يحلل الروابط ويستخرج الكتب تلقائياً من المكتبات الإلكترونية</p>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1">
                  <input type="text" value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} placeholder="https://example.com/library" className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-[#D4AF37]/20 text-gray-100 text-sm focus:border-[#D4AF37]/40 focus:outline-none transition-all" dir="ltr" />
                </div>
                <button onClick={handleSmartScrape} disabled={scraping} className="px-6 py-3 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#b8941e] text-[#0a0a0f] font-bold text-sm flex items-center gap-2 disabled:opacity-50 transition-all shrink-0 hover:shadow-lg hover:shadow-[#D4AF37]/20">
                  {scraping ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  <span>{scraping ? 'جارٍ التحليل...' : 'استخراج الكتب'}</span>
                </button>
              </div>
              <AnimatePresence>
                {scrapeError && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`flex items-center gap-2 px-4 py-3 rounded-xl border mb-4 ${scrapeError.includes('تم') && !scrapeError.includes('لم') ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-red-500/10 border-red-500/20'}`}>
                    {scrapeError.includes('تم') && !scrapeError.includes('لم')
                      ? <><CheckCircle2 size={16} className="text-emerald-400 shrink-0" /><span className="text-emerald-300 text-sm">{scrapeError}</span></>
                      : <><AlertTriangle size={16} className="text-red-400 shrink-0" /><span className="text-red-400 text-sm">{scrapeError}</span></>
                    }
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Loading spinner */}
              {scraping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
                    <Sparkles size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#D4AF37]" />
                  </div>
                  <span className="text-gray-300 text-sm font-medium">المحرك الذكي يحلل الصفحة...</span>
                  <span className="text-gray-500 text-xs">جارٍ فحص الروابط واستخراج الكتب</span>
                </motion.div>
              )}
              {/* Scrape Results */}
              <AnimatePresence>
                {showScrapeResults && scrapedPdfs.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-200 text-sm font-medium flex items-center gap-2">
                        <Sparkles size={14} className="text-[#D4AF37]" />
                        تم استخراج {scrapedPdfs.length} كتاب
                      </span>
                      <button onClick={addSelectedBooks} disabled={fetchLoading} className="px-4 py-2 rounded-lg bg-gradient-to-l from-emerald-600 to-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/20 transition-all">
                        {fetchLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        <span>إضافة المحدد ({scrapedPdfs.filter(p => p.selected).length})</span>
                      </button>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto space-y-2 pl-2" style={{ scrollbarWidth: 'thin' }}>
                      {scrapedPdfs.map((pdf, index) => (
                        <motion.div key={pdf.id || index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.02 }}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${pdf.selected ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-[#111827] border-emerald-500/10 opacity-60'}`}>
                          <input type="checkbox" checked={pdf.selected} onChange={() => toggleScrapeSelect(index)} className="w-4 h-4 rounded accent-emerald-500 shrink-0 mt-1 cursor-pointer" />
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-100 text-sm font-bold leading-relaxed">{pdf.title || pdf.name}</p>
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
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ===== BOOKS TAB ===== */}
        {activeTab === 'books' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="البحث في الكتب..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-[#0d1117] border border-emerald-500/15 text-gray-200 text-sm placeholder-gray-600 outline-none focus:border-emerald-500/30 transition-all"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="px-5 py-4 border-b border-emerald-500/10 flex items-center justify-between">
                <h2 className="text-gray-100 font-bold">جميع الكتب ({filteredBooks.length})</h2>
                <button
                  onClick={() => { setActiveTab('dashboard'); router.push('/#fetch-engine'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all"
                >
                  <Eye size={14} />
                  المحرك
                </button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-emerald-400" size={24} />
                </div>
              ) : filteredBooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <BookOpen size={40} className="text-gray-600" />
                  <p className="text-gray-500 text-sm">لا توجد كتب بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-emerald-500/10">
                        <th className="text-right text-gray-500 text-xs font-medium px-5 py-3">#</th>
                        <th className="text-right text-gray-500 text-xs font-medium px-5 py-3">اسم الكتاب</th>
                        <th className="text-right text-gray-500 text-xs font-medium px-5 py-3 hidden sm:table-cell">التصنيف</th>
                        <th className="text-right text-gray-500 text-xs font-medium px-5 py-3 hidden md:table-cell">تاريخ الإضافة</th>
                        <th className="text-right text-gray-500 text-xs font-medium px-5 py-3">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBooks.map((book, i) => (
                        <tr key={book.id} className="border-b border-emerald-500/5 hover:bg-emerald-500/5 transition-colors">
                          <td className="px-5 py-3 text-gray-500 text-xs">{i + 1}</td>
                          <td className="px-5 py-3">
                            {editBookId === book.id ? (
                              <input
                                type="text"
                                value={editBookName}
                                onChange={(e) => setEditBookName(e.target.value)}
                                className="w-full px-2 py-1 rounded-lg bg-[#111827] border border-emerald-500/30 text-gray-200 text-sm outline-none"
                              />
                            ) : (
                              <>
                                <span className="text-gray-200 text-sm font-medium">{book.name}</span>
                                <div className="text-gray-500 text-[10px] mt-0.5 truncate max-w-[200px]" dir="ltr">{book.url}</div>
                              </>
                            )}
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell">
                            {editBookId === book.id ? (
                              <select
                                value={editBookCategory}
                                onChange={(e) => setEditBookCategory(e.target.value)}
                                className="bg-[#111827] border border-emerald-500/30 text-gray-300 text-xs rounded-lg px-2 py-1 outline-none"
                              >
                                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                                  <option key={k} value={k}>{v}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                                {CATEGORY_LABELS[book.category] || book.category}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs hidden md:table-cell">
                            {new Date(book.createdAt).toLocaleDateString('ar')}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1">
                              {editBookId === book.id && (
                                <>
                                  <button onClick={() => saveEditBook(book.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                                    <Save size={14} />
                                  </button>
                                  <button onClick={cancelEditBook} className="p-1.5 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 transition-all">
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                              {editBookId !== book.id && (
                                <>
                                  <button onClick={() => startEditBook(book)} className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="تعديل">
                                    <Pencil size={14} />
                                  </button>
                                  {deleteConfirm === book.id ? (
                                    <>
                                      <button onClick={() => deleteBook(book.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                                        <CheckCircle2 size={14} />
                                      </button>
                                      <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 transition-all">
                                        <X size={14} />
                                      </button>
                                    </>
                                  ) : (
                                    <button onClick={() => setDeleteConfirm(book.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="حذف">
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===== USERS TAB ===== */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="البحث في المستخدمين..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-[#0d1117] border border-emerald-500/15 text-gray-200 text-sm placeholder-gray-600 outline-none focus:border-emerald-500/30 transition-all"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="px-5 py-4 border-b border-emerald-500/10">
                <h2 className="text-gray-100 font-bold">المستخدمين ({filteredUsers.length})</h2>
              </div>
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Users size={40} className="text-gray-600" />
                  <p className="text-gray-500 text-sm">لا يوجد مستخدمين بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-emerald-500/10">
                        <th className="text-right text-gray-500 text-xs font-medium px-5 py-3">#</th>
                        <th className="text-right text-gray-500 text-xs font-medium px-5 py-3">المستخدم</th>
                        <th className="text-right text-gray-500 text-xs font-medium px-5 py-3">الدور</th>
                        <th className="text-right text-gray-500 text-xs font-medium px-5 py-3 hidden sm:table-cell">الاسم المعروض</th>
                        <th className="text-right text-gray-500 text-xs font-medium px-5 py-3 hidden sm:table-cell">تاريخ التسجيل</th>
                        <th className="text-right text-gray-500 text-xs font-medium px-5 py-3">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user, i) => (
                        <tr key={user.id} className="border-b border-emerald-500/5 hover:bg-emerald-500/5 transition-colors">
                          <td className="px-5 py-3 text-gray-500 text-xs">{i + 1}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              {user.image ? (
                                <img src={user.image} alt="" className="w-8 h-8 rounded-full border border-emerald-500/20" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center">
                                  <Users size={14} className="text-emerald-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="text-gray-200 text-sm font-medium block truncate">{user.name || 'بدون اسم'}</span>
                                <div className="text-gray-500 text-[10px] truncate" dir="ltr">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              user.role === 'owner' ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20' :
                              user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                              'bg-gray-500/10 text-gray-400 border-gray-500/20'
                            }`}>
                              {ROLE_LABELS[user.role] || user.role}
                            </span>
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell">
                            <span className="text-gray-300 text-xs">{user.displayName || '—'}</span>
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs hidden sm:table-cell">
                            {new Date(user.createdAt).toLocaleDateString('ar')}
                          </td>
                          <td className="px-5 py-3">
                            {user.role === 'owner' ? (
                              <div className="flex items-center gap-1">
                                <Crown size={14} className="text-[#f59e0b]" />
                                <span className="text-gray-600 text-[10px]">مالك</span>
                              </div>
                            ) : (
                              <select
                                value={user.role}
                                onChange={(e) => updateUserRole(user.id, e.target.value)}
                                className="bg-[#111827] border border-emerald-500/15 text-gray-300 text-xs rounded-lg px-2 py-1 outline-none focus:border-emerald-500/30 transition-all"
                              >
                                <option value="user">مستخدم</option>
                                <option value="admin">مشرف</option>
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===== SETTINGS TAB ===== */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Owner Settings */}
            <div className="bg-[#0d1117]/80 border border-[#D4AF37]/15 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-gray-100 font-bold mb-4 flex items-center gap-2">
                <Crown size={18} className="text-[#f59e0b]" />
                إعدادات المالك
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-[#111827] rounded-xl border border-[#D4AF37]/10">
                  <h3 className="text-gray-200 font-medium text-sm mb-2 flex items-center gap-2">
                    <UserPlus size={16} className="text-purple-400" />
                    رفع مشرف جديد
                  </h3>
                  <p className="text-gray-500 text-xs mb-3">
                    يمكنك رفع أي مستخدم إلى مشرف من خلال تبويب &quot;إدارة المستخدمين&quot;. المشرفون يمكنهم إضافة وحذف الكتب.
                  </p>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-xs font-medium transition-all"
                  >
                    <UserPlus size={14} />
                    إدارة المشرفين
                  </button>
                </div>

                <div className="p-4 bg-[#111827] rounded-xl border border-[#D4AF37]/10">
                  <h3 className="text-gray-200 font-medium text-sm mb-2 flex items-center gap-2">
                    <Key size={16} className="text-[#D4AF37]" />
                    المفتاح السري
                  </h3>
                  <p className="text-gray-500 text-xs mb-1">
                    لتغيير المفتاح السري، اضبط متغير البيئة <code className="text-[#D4AF37] bg-[#D4AF37]/10 px-1 rounded">ADMIN_SECRET</code> في إعدادات المشروع.
                  </p>
                  <p className="text-gray-600 text-[10px]">
                    المفتاح الافتراضي: ali-library-2025
                  </p>
                </div>
              </div>
            </div>

            {/* Site Settings */}
            <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-gray-100 font-bold mb-4 flex items-center gap-2">
                <Globe size={18} className="text-emerald-400" />
                معلومات الموقع
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#111827] rounded-xl">
                  <span className="text-gray-400 text-sm">الرابط</span>
                  <span className="text-emerald-400 text-xs" dir="ltr">ali-library.vercel.app</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#111827] rounded-xl">
                  <span className="text-gray-400 text-sm">إطار العمل</span>
                  <span className="text-gray-300 text-xs">Next.js 16 + Prisma</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#111827] rounded-xl">
                  <span className="text-gray-400 text-sm">قاعدة البيانات</span>
                  <span className="text-gray-300 text-xs">PostgreSQL</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#111827] rounded-xl">
                  <span className="text-gray-400 text-sm">المصادقة</span>
                  <span className="text-gray-300 text-xs">مفتاح سري + localStorage</span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-[#0d1117]/80 border border-red-500/15 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-red-400" />
                <h2 className="text-gray-100 font-bold">منطقة الخطر</h2>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm transition-all"
                >
                  <LogOut size={16} />
                  تسجيل الخروج من لوحة التحكم
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
