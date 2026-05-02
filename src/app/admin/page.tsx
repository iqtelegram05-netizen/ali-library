'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, Shield, Trash2, Crown,
  Loader2, ArrowRight, LogOut, AlertTriangle,
  CheckCircle2, Settings
} from 'lucide-react';

interface BookData {
  id: string;
  name: string;
  url: string;
  category: string;
  createdAt: string;
}

interface UserData {
  id: string;
  name: string | null;
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [books, setBooks] = useState<BookData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'books' | 'users' | 'settings'>('books');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn();
    }
  }, [status]);

  useEffect(() => {
    if (session) {
      const role = (session.user as any)?.role;
      if (role !== 'owner' && role !== 'admin') {
        router.push('/');
      }
    }
  }, [session, router]);

  useEffect(() => {
    if (session && ((session.user as any)?.role === 'owner' || (session.user as any)?.role === 'admin')) {
      let cancelled = false;
      (async () => {
        try {
          const [booksData, usersData] = await Promise.all([fetchBooks(), fetchUsers()]);
          if (!cancelled) {
            setBooks(booksData);
            setUsers(usersData);
          }
        } catch (e) { console.error(e); }
        if (!cancelled) setLoading(false);
      })();
      return () => { cancelled = true; };
    }
  }, [session]);

  const deleteBook = async (id: string) => {
    try {
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setBooks(prev => prev.filter(b => b.id !== id));
        setDeleteConfirm(null);
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
        const updatedUsers = await fetchUsers();
        setUsers(updatedUsers);
      }
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <div className="sticky top-0 z-50" style={{ backgroundColor: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/')} className="p-2 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100 transition-all">
                <ArrowRight size={18} />
              </button>
              <div className="flex items-center gap-2">
                <Shield size={20} className="text-emerald-400" />
                <h1 className="text-gray-100 font-bold text-base">لوحة التحكم</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {session.user.image && (
                <img src={session.user.image} alt="" className="w-8 h-8 rounded-full border border-emerald-500/30" />
              )}
              <span className="text-gray-300 text-sm hidden sm:block">{session.user.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {ROLE_LABELS[role] || role}
              </span>
              <button onClick={() => signOut()} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all" title="تسجيل الخروج">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { icon: BookOpen, label: 'إجمالي الكتب', value: books.length, color: '#10b981' },
            { icon: Users, label: 'المستخدمين', value: users.length, color: '#D4AF37' },
            { icon: Shield, label: 'المشرفين', value: users.filter(u => u.role === 'admin' || u.role === 'owner').length, color: '#8b5cf6' },
            { icon: Crown, label: 'المالك', value: users.filter(u => u.role === 'owner').length, color: '#f59e0b' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-4 backdrop-blur-xl"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={16} style={{ color: stat.color }} />
                <span className="text-gray-500 text-xs">{stat.label}</span>
              </div>
              <span className="text-2xl font-bold text-gray-100">{stat.value}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex gap-2 mb-6">
          {[
            { id: 'books' as const, label: 'إدارة الكتب', icon: BookOpen },
            { id: 'users' as const, label: 'إدارة المستخدمين', icon: Users },
            { id: 'settings' as const, label: 'الإعدادات', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
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
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        {/* Books Tab */}
        {activeTab === 'books' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="px-5 py-4 border-b border-emerald-500/10">
              <h2 className="text-gray-100 font-bold">جميع الكتب ({books.length})</h2>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-emerald-400" size={24} />
              </div>
            ) : books.length === 0 ? (
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
                    {books.map((book, i) => (
                      <tr key={book.id} className="border-b border-emerald-500/5 hover:bg-emerald-500/5 transition-colors">
                        <td className="px-5 py-3 text-gray-500 text-xs">{i + 1}</td>
                        <td className="px-5 py-3">
                          <span className="text-gray-200 text-sm font-medium">{book.name}</span>
                          <div className="text-gray-500 text-[10px] mt-0.5 truncate max-w-[200px]" dir="ltr">{book.url}</div>
                        </td>
                        <td className="px-5 py-3 hidden sm:table-cell">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                            {CATEGORY_LABELS[book.category] || book.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs hidden md:table-cell">
                          {new Date(book.createdAt).toLocaleDateString('ar')}
                        </td>
                        <td className="px-5 py-3">
                          {role === 'owner' && (
                            deleteConfirm === book.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => deleteBook(book.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                                  <CheckCircle2 size={14} />
                                </button>
                                <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 transition-all">
                                  <span className="text-xs">✕</span>
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(book.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="حذف">
                                <Trash2 size={14} />
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="px-5 py-4 border-b border-emerald-500/10">
              <h2 className="text-gray-100 font-bold">المستخدمين ({users.length})</h2>
            </div>
            {users.length === 0 ? (
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
                      <th className="text-right text-gray-500 text-xs font-medium px-5 py-3 hidden sm:table-cell">تاريخ التسجيل</th>
                      <th className="text-right text-gray-500 text-xs font-medium px-5 py-3">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={user.id} className="border-b border-emerald-500/5 hover:bg-emerald-500/5 transition-colors">
                        <td className="px-5 py-3 text-gray-500 text-xs">{i + 1}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {user.image && <img src={user.image} alt="" className="w-7 h-7 rounded-full" />}
                            <div>
                              <span className="text-gray-200 text-sm font-medium">{user.name || 'بدون اسم'}</span>
                              <div className="text-gray-500 text-[10px]">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            user.role === 'owner' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                            user.role === 'admin' ? 'bg-purple-500/10 text-purple-400' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs hidden sm:table-cell">
                          {new Date(user.createdAt).toLocaleDateString('ar')}
                        </td>
                        <td className="px-5 py-3">
                          {role === 'owner' && user.role !== 'owner' && (
                            <select
                              value={user.role}
                              onChange={(e) => updateUserRole(user.id, e.target.value)}
                              className="bg-[#111827] border border-emerald-500/15 text-gray-300 text-xs rounded-lg px-2 py-1 outline-none"
                            >
                              <option value="user">مستخدم</option>
                              <option value="admin">مشرف</option>
                            </select>
                          )}
                          {user.role === 'owner' && (
                            <Crown size={14} className="text-[#f59e0b]" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-[#0d1117]/80 border border-emerald-500/15 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-gray-100 font-bold mb-4">معلومات الحساب</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {session.user.image && <img src={session.user.image} alt="" className="w-12 h-12 rounded-full border border-emerald-500/30" />}
                  <div>
                    <p className="text-gray-100 font-medium">{session.user.name}</p>
                    <p className="text-gray-500 text-xs">{session.user.email}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#0d1117]/80 border border-[#D4AF37]/15 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-[#D4AF37]" />
                <h2 className="text-gray-100 font-bold">إعدادات متقدمة</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">لتغيير المالك الأول، يجب تعديل متغير البيئة OWNER_EMAIL في إعدادات المشروع على Vercel.</p>
              <p className="text-gray-500 text-xs">المالك الحالي هو الحساب الذي يتطابق بريده الإلكتروني مع متغير البيئة OWNER_EMAIL.</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
