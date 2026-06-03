'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Phone, Lock, User, Eye, EyeOff, Loader2,
  LogIn, UserPlus, ShieldCheck, LogOut, ChevronDown,
  Camera, ArrowRight
} from 'lucide-react';

const LOGO_URL = 'https://www.image2url.com/r2/default/images/1776215661522-3ce7e2b6-4b67-46d7-898b-85a767165977.png';

/* ===================================================================
   LOGIN MODAL
   =================================================================== */
function LoginModal({ onClose, onSwitchToRegister, onLoginSuccess }: {
  onClose: () => void;
  onSwitchToRegister: () => void;
  onLoginSuccess: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone.trim() || !password) {
      setError('يرجى إدخال رقم الهاتف وكلمة السر');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          password,
          redirect: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          onLoginSuccess();
          onClose();
        } else {
          setError('رقم الهاتف أو كلمة السر غير صحيحة');
        }
      } else {
        setError('رقم الهاتف أو كلمة السر غير صحيحة');
      }
    } catch {
      // Fallback: try signIn directly via the auth system
      try {
        const formData = new FormData();
        formData.append('phone', phone.trim());
        formData.append('password', password);
        formData.append('callbackUrl', '/');
        formData.append('redirect', 'false');

        const res2 = await fetch('/api/auth/signin/credentials', {
          method: 'POST',
          body: formData,
        });
        if (res2.ok) {
          const data2 = await res2.json();
          if (data2.url || !data2.error) {
            onLoginSuccess();
            onClose();
          } else {
            setError(data2.error || 'رقم الهاتف أو كلمة السر غير صحيحة');
          }
        } else {
          setError('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
        }
      } catch {
        setError('فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
      }
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md bg-[#0d1117]/95 border border-emerald-500/20 rounded-3xl backdrop-blur-2xl shadow-2xl shadow-emerald-500/5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Geometric Decorations */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        <div className="absolute top-4 right-4 w-16 h-16 border border-emerald-500/10 rounded-full opacity-30 rotate-45" />
        <div className="absolute bottom-4 left-4 w-20 h-20 border border-[#D4AF37]/8 rounded-full opacity-20" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-all z-10"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-16 h-16 mx-auto rounded-full bg-[#0a0a0f] border-2 border-emerald-500/30 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10"
          >
            <img src={LOGO_URL} alt="مكتبة العلي" className="w-12 h-12 rounded-full object-cover" />
          </motion.div>
          <h2 className="text-xl font-bold text-gray-100 mb-1">تسجيل الدخول</h2>
          <p className="text-gray-400 text-sm">مرحباً بك في مكتبة العلي الرقمية</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8">
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phone Input */}
          <div className="mb-4">
            <label className="block text-gray-400 text-xs font-medium mb-2">رقم الهاتف</label>
            <div className="relative group">
              <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/50 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+964XXXXXXXXX"
                className="w-full pr-10 pl-4 py-3 rounded-xl bg-[#111827]/80 border border-emerald-500/15 text-gray-100 text-sm placeholder:text-gray-600 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all duration-300"
                style={{ textAlign: 'right' }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label className="block text-gray-400 text-xs font-medium mb-2">كلمة السر</label>
            <div className="relative group">
              <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/50 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-10 pl-12 py-3 rounded-xl bg-[#111827]/80 border border-emerald-500/15 text-gray-100 text-sm placeholder:text-gray-600 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all duration-300"
                style={{ textAlign: 'right' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-shadow duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />
            </div>
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                <span>تسجيل الدخول</span>
              </>
            )}
          </motion.button>

          {/* Switch to Register */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              ليس لديك حساب؟{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors underline underline-offset-4 decoration-emerald-500/30 hover:decoration-emerald-400/50"
              >
                إنشاء حساب جديد
              </button>
            </p>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ===================================================================
   REGISTER MODAL
   =================================================================== */
function RegisterModal({ onClose, onSwitchToLogin, onRegisterSuccess }: {
  onClose: () => void;
  onSwitchToLogin: () => void;
  onRegisterSuccess: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !phone.trim() || !password) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const nameWords = fullName.trim().split(/\s+/);
    if (nameWords.length < 2) {
      setError('يرجى إدخال الاسم الكامل (الاسم الأول والأخير على الأقل)');
      return;
    }

    if (password.length < 6) {
      setError('كلمة السر يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا السر غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          password,
          fullName: fullName.trim(),
          address: '',
          country: '',
        }),
      });
      const data = await res.json();

      if (data.success) {
        onRegisterSuccess();
        onClose();
      } else {
        setError(data.error || 'فشل في إنشاء الحساب');
      }
    } catch {
      setError('فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md bg-[#0d1117]/95 border border-[#D4AF37]/20 rounded-3xl backdrop-blur-2xl shadow-2xl shadow-[#D4AF37]/5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
        <div className="absolute top-4 right-4 w-16 h-16 border border-[#D4AF37]/10 rounded-full opacity-30 rotate-45" />
        <div className="absolute bottom-4 left-4 w-20 h-20 border border-emerald-500/8 rounded-full opacity-20" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-all z-10"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center">
          <motion.div
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-16 h-16 mx-auto rounded-full bg-[#0a0a0f] border-2 border-[#D4AF37]/30 flex items-center justify-center mb-4 shadow-lg shadow-[#D4AF37]/10"
          >
            <UserPlus size={24} className="text-[#D4AF37]" />
          </motion.div>
          <h2 className="text-xl font-bold text-gray-100 mb-1">إنشاء حساب جديد</h2>
          <p className="text-gray-400 text-sm">انضم إلى مكتبة العلي الرقمية</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8">
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Full Name */}
          <div className="mb-4">
            <label className="block text-gray-400 text-xs font-medium mb-2">الاسم الكامل</label>
            <div className="relative group">
              <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37]/50 group-focus-within:text-[#D4AF37] transition-colors" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم الأول والأخير"
                className="w-full pr-10 pl-4 py-3 rounded-xl bg-[#111827]/80 border border-[#D4AF37]/15 text-gray-100 text-sm placeholder:text-gray-600 focus:border-[#D4AF37]/40 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none transition-all duration-300 text-right"
              />
            </div>
          </div>

          {/* Phone Input */}
          <div className="mb-4">
            <label className="block text-gray-400 text-xs font-medium mb-2">رقم الهاتف</label>
            <div className="relative group">
              <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37]/50 group-focus-within:text-[#D4AF37] transition-colors" />
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+964XXXXXXXXX"
                className="w-full pr-10 pl-4 py-3 rounded-xl bg-[#111827]/80 border border-[#D4AF37]/15 text-gray-100 text-sm placeholder:text-gray-600 focus:border-[#D4AF37]/40 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none transition-all duration-300"
                style={{ textAlign: 'right' }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-4">
            <label className="block text-gray-400 text-xs font-medium mb-2">كلمة السر</label>
            <div className="relative group">
              <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37]/50 group-focus-within:text-[#D4AF37] transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
                className="w-full pr-10 pl-12 py-3 rounded-xl bg-[#111827]/80 border border-[#D4AF37]/15 text-gray-100 text-sm placeholder:text-gray-600 focus:border-[#D4AF37]/40 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none transition-all duration-300"
                style={{ textAlign: 'right' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="mb-6">
            <label className="block text-gray-400 text-xs font-medium mb-2">تأكيد كلمة السر</label>
            <div className="relative group">
              <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37]/50 group-focus-within:text-[#D4AF37] transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة السر"
                className="w-full pr-10 pl-4 py-3 rounded-xl bg-[#111827]/80 border border-[#D4AF37]/15 text-gray-100 text-sm placeholder:text-gray-600 focus:border-[#D4AF37]/40 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none transition-all duration-300"
                style={{ textAlign: 'right' }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#b8962e] text-[#0a0a0f] font-bold text-sm shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/30 transition-shadow duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />
            </div>
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <UserPlus size={18} />
                <span>إنشاء الحساب</span>
              </>
            )}
          </motion.button>

          {/* Switch to Login */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              لديك حساب بالفعل؟{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-[#D4AF37] hover:text-[#e0c050] font-medium transition-colors underline underline-offset-4 decoration-[#D4AF37]/30 hover:decoration-[#D4AF37]/50"
              >
                تسجيل الدخول
              </button>
            </p>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ===================================================================
   SUCCESS TOAST
   =================================================================== */
function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -50, x: '-50%' }}
      className="fixed top-20 left-1/2 z-[70] px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-xl shadow-lg shadow-emerald-500/10"
    >
      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
        <ShieldCheck size={16} />
        <span>{message}</span>
        <button onClick={onClose} className="mr-2 text-emerald-500/60 hover:text-emerald-400"><X size={14} /></button>
      </div>
    </motion.div>
  );
}

/* ===================================================================
   MAIN AUTH MODALS EXPORT
   =================================================================== */
export default function AuthModals({ session, onRefresh }: {
  session: { user: any } | null;
  onRefresh: () => Promise<void>;
}) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openLogin = () => setAuthMode('login');
  const openRegister = () => setAuthMode('register');
  const closeAuth = () => setAuthMode(null);

  const handleLoginSuccess = async () => {
    await onRefresh();
    setToast('تم تسجيل الدخول بنجاح');
    setTimeout(() => setToast(null), 3000);
  };

  const handleRegisterSuccess = () => {
    setToast('تم إنشاء الحساب! يمكنك الآن تسجيل الدخول');
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      await onRefresh();
      setToast('تم تسجيل الخروج');
      setTimeout(() => setToast(null), 2000);
    } catch {
      // Force refresh anyway
      await onRefresh();
    }
  };

  const userName = session?.user?.displayName || session?.user?.name || session?.user?.phone || '';
  const userRole = session?.user?.role || 'user';
  const isAdmin = userRole === 'owner' || userRole === 'admin';

  return (
    <>
      {/* === Auth Buttons (shown when NOT logged in) === */}
      {!session && (
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openLogin}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 overflow-hidden"
          >
            <LogIn size={13} />
            <span className="hidden sm:inline">تسجيل الدخول</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openRegister}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10 overflow-hidden"
          >
            <UserPlus size={13} />
            <span className="hidden sm:inline">حساب جديد</span>
          </motion.button>
        </div>
      )}

      {/* === User Menu (shown when logged in) === */}
      {session && (
        <div className="relative" ref={menuRef}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/5 transition-all duration-300"
          >
            {/* Avatar */}
            {session.user?.image ? (
              <img src={session.user.image} alt="" className="w-6 h-6 rounded-full object-cover border border-emerald-500/30" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <User size={12} className="text-emerald-400" />
              </div>
            )}
            <span className="text-gray-200 text-xs font-medium max-w-[100px] truncate">{userName || 'مستخدم'}</span>
            {isAdmin && (
              <span className="text-[8px] px-1 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">مشرف</span>
            )}
            <ChevronDown size={12} className={`text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </motion.button>

          {/* Dropdown */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full mt-2 left-0 min-w-[200px] bg-[#0d1117]/98 border border-emerald-500/15 rounded-2xl backdrop-blur-2xl shadow-xl shadow-black/30 overflow-hidden z-50"
              >
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-emerald-500/10 bg-emerald-500/5">
                  <div className="flex items-center gap-3">
                    {session.user?.image ? (
                      <img src={session.user.image} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500/30" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center">
                        <User size={16} className="text-emerald-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-100 text-sm font-medium truncate">{userName || 'مستخدم'}</p>
                      <p className="text-gray-500 text-[10px] truncate" dir="ltr">{session.user?.phone || ''}</p>
                    </div>
                    {isAdmin && (
                      <ShieldCheck size={14} className="text-[#D4AF37]" />
                    )}
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-1.5">
                  {isAdmin && (
                    <a
                      href="/admin"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-300 hover:bg-[#1a1a2e] hover:text-gray-100 transition-all text-sm"
                    >
                      <ShieldCheck size={14} className="text-[#D4AF37]" />
                      <span>لوحة التحكم</span>
                    </a>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm text-right"
                  >
                    <LogOut size={14} />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* === Auth Modals === */}
      <AnimatePresence>
        {authMode === 'login' && (
          <LoginModal
            key="login"
            onClose={closeAuth}
            onSwitchToRegister={() => { setAuthMode('register'); }}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
        {authMode === 'register' && (
          <RegisterModal
            key="register"
            onClose={closeAuth}
            onSwitchToLogin={() => { setAuthMode('login'); }}
            onRegisterSuccess={handleRegisterSuccess}
          />
        )}
      </AnimatePresence>

      {/* === Success Toast === */}
      <AnimatePresence>
        {toast && <SuccessToast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Close menu on outside click */}
      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}
    </>
  );
}
