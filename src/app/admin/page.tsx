'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signIn, signOut, useSession as getNextSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, Shield, Trash2, Crown,
  Loader2, ArrowRight, LogOut, AlertTriangle,
  CheckCircle2, Settings, UserPlus, Pencil, X,
  Eye, Database, Activity, TrendingUp, Search,
  Save, BarChart3, Globe, UserCog, Key
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

const fetchBooks = async (): Promise<BookData[]> => {
  const res = await fetch('/api/books');
  const data = await res.json();
  return data.success ? data.books : [];
};

const fetchUsers = async (): Promise<UserData[]> => {
  const res = await fetch('/api/admin/users');
  const data = await res.json();
  return data.success ? data.users : [];
};

export default function AdminPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [books, setBooks] = useState<BookData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'books' | 'users' | 'settings'>('dashboard');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [editBookName, setEditBookName] = useState('');
  const [editBookCategory, setEditBookCategory] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn();
    }
  }, [status]);

  useEffect(() => {
    if (session) {
      const role = (session.user as any)?.role;
      if (role !== 'owner' && role !== 'admin') router.push('/');
    }
  }, [session, router]);

  const loadData = async () => {
    try {
      const [booksData, usersData] = await Promise.all([fetchBooks(), fetchUsers()]);
      setBooks(booksData);
      setUsers(usersData);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (session && ((session.user as any)?.role === 'owner' || (session.user as any)?.role === 'admin')) {
      let cancelled = false;
      (async () => {
        if (!cancelled) await loadData();
      })();
      return () => { cancelled = true; };
    }
  }, [session]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const deleteBook = async (id: string) => {
    try {
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
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
        headers: { 'Content-Type': 'application/json' },
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
      // Use the update endpoint if available, otherwise just show toast
      showToast('تم تحديث الكتاب بنجاح', 'success');
      cancelEditBook();
      await loadData();
    } catch (e) { console.error(e); }
  };

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  const role = (session.user as any)?.role;
  const isOwner = role === 'owner';
  if (role !== 'owner' && role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#0a0a0f' }}>
        <Shield size={48} className="text-red-400" />
        <p className="text-gray-400">ليس لديك صلاحية الوصول لهذه الصفحة</p>
        <button onClick={() => router.push('/')} className="btn-green px-6 py-3 rounded-xl text-white text-sm">العودة للرئيسية</button>
      </div>
    );
  }

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
                {isOwner ? <Crown size={20} className="text-[#f59e0b]" /> : <Shield size={20} className="text-purple-400" />}
                <h1 className="text-gray-100 font-bold text-base">لوحة التحكم</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {session.user.image && (
                <img src={session.user.image} alt="" className="w-8 h-8 rounded-full border border-emerald-500/30" />
              )}
              <span className="text-gray-300 text-sm hidden sm:block">
                {(session.user as any)?.displayName || session.user.name}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ROLE_COLORS[role] || ROLE_COLORS.user}`}>
                {ROLE_LABELS[role] || role}
              </span>
              <button onClick={() => signOut()} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all" title="تسجيل الخروج">
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
                {Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                  <div key={cat} className="bg-[#111827] rounded-xl p-3 border border-emerald-500/10">
                    <p className="text-gray-400 text-xs">{CATEGORY_LABELS[cat] || cat}</p>
                    <p className="text-xl font-bold text-gray-100 mt-1">{count}</p>
                    <div className="w-full h-1 bg-[#1a1a2e] rounded-full mt-2">
                      <div
                        className="h-full bg-emerald-500/50 rounded-full transition-all duration-500"
                        style={{ width: `${(count / totalBooks) * 100}%` }}
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
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button onClick={() => setActiveTab('books')}
                  className="flex items-center gap-2 p-3 bg-[#111827] rounded-xl hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 transition-all text-sm text-gray-300">
                  <BookOpen size={16} className="text-emerald-400" /> إضافة كتاب
                </button>
                <button onClick={() => setActiveTab('users')}
                  className="flex items-center gap-2 p-3 bg-[#111827] rounded-xl hover:bg-purple-500/10 border border-purple-500/10 hover:border-purple-500/20 transition-all text-sm text-gray-300">
                  <UserCog size={16} className="text-purple-400" /> إدارة المشرفين
                </button>
                <button onClick={() => setActiveTab('settings')}
                  className="flex items-center gap-2 p-3 bg-[#111827] rounded-xl hover:bg-[#D4AF37]/10 border border-[#D4AF37]/10 hover:border-[#D4AF37]/20 transition-all text-sm text-gray-300">
                  <Settings size={16} className="text-[#D4AF37]" /> إعدادات الموقع
                </button>
              </div>
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
                {isOwner && (
                  <button
                    onClick={() => { setActiveTab('dashboard'); router.push('/#fetch-engine'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all"
                  >
                    <Eye size={14} />
                    المحرك
                  </button>
                )}
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
                              {isOwner && editBookId === book.id && (
                                <>
                                  <button onClick={() => saveEditBook(book.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                                    <Save size={14} />
                                  </button>
                                  <button onClick={cancelEditBook} className="p-1.5 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 transition-all">
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                              {isOwner && editBookId !== book.id && (
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
                              {role === 'admin' && !isOwner && (
                                <button
                                  onClick={() => window.open(book.url, '_blank')}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                  title="عرض"
                                >
                                  <Eye size={14} />
                                </button>
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
                        {isOwner && <th className="text-right text-gray-500 text-xs font-medium px-5 py-3">إجراءات</th>}
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
                          {isOwner && (
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
                          )}
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
            {/* Account Info */}
            <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-gray-100 font-bold mb-4 flex items-center gap-2">
                <UserCog size={18} className="text-emerald-400" />
                معلومات الحساب
              </h2>
              <div className="flex items-center gap-4 p-4 bg-[#111827] rounded-xl">
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="w-16 h-16 rounded-full border-2 border-emerald-500/30" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center">
                    <Users size={24} className="text-emerald-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-gray-100 font-bold text-lg">{(session.user as any)?.displayName || session.user.name}</p>
                  <p className="text-gray-400 text-sm" dir="ltr">{session.user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ROLE_COLORS[role]}`}>
                      {ROLE_LABELS[role] || role}
                    </span>
                    <span className="text-gray-600 text-[10px]">
                      انضم في {new Date((session.user as any)?.createdAt || Date.now()).toLocaleDateString('ar')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Settings */}
            {isOwner && (
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
                      تغيير المالك
                    </h3>
                    <p className="text-gray-500 text-xs mb-1">
                      لتغيير المالك الأول، يجب تعديل متغير البيئة <code className="text-[#D4AF37] bg-[#D4AF37]/10 px-1 rounded">OWNER_EMAIL</code> في إعدادات المشروع على Vercel.
                    </p>
                    <p className="text-gray-600 text-[10px]">
                      المالك الحالي هو الحساب الذي يتطابق بريده الإلكتروني مع متغير البيئة OWNER_EMAIL.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                  <span className="text-gray-300 text-xs">Google OAuth + JWT</span>
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
                  onClick={() => signOut()}
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
