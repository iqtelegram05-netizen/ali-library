'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, signOut } from 'next-auth/react';
import {
  LogIn, UserPlus, Phone, Lock, Eye, EyeOff, User, MapPin,
  Globe, Camera, Loader2, CheckCircle2, AlertTriangle, X,
  MessageCircle, HelpCircle, ArrowLeft, Upload, Shield
} from 'lucide-react';

/* ===================================================================
   Login Modal — Phone + Password authentication
   =================================================================== */

function LoginModal({ isOpen, onClose, onSwitchToRegister }: {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        phone: phone.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('رقم الهاتف أو كلمة السر غير صحيحة');
      } else {
        onClose();
        window.location.reload();
      }
    } catch {
      setError('حدث خطأ أثناء تسجيل الدخول');
    }
    setLoading(false);
  };

  const handleForgotPassword = () => {
    onClose();
    window.open('https://wa.me/9647700000000?text=' + encodeURIComponent('مرحباً، نسيت كلمة السر لحسابي في مكتبة العلي. رقم الهاتف: ' + phone), '_blank');
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-[#0d1117] border border-emerald-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-gray-100 font-bold text-lg flex items-center gap-2">
            <LogIn size={20} className="text-emerald-400" />
            تسجيل الدخول
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100 transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
              <Phone size={14} className="text-emerald-400" />
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+964 7XX XXX XXXX"
              className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/20 text-gray-100 text-sm placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-all"
              dir="ltr"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
              <Lock size={14} className="text-emerald-400" />
              كلمة السر
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة السر"
                className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/20 text-gray-100 text-sm placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-all"
                dir="rtl"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-all"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-all"
            >
              <HelpCircle size={12} />
              نسيت كلمة السر؟ تواصل مع الدعم
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        {/* Switch to Register */}
        <div className="mt-5 pt-4 border-t border-emerald-500/10 text-center">
          <p className="text-gray-500 text-xs mb-2">ليس لديك حساب؟</p>
          <button
            onClick={() => { onClose(); onSwitchToRegister(); }}
            className="flex items-center justify-center gap-1.5 mx-auto px-4 py-2 rounded-xl bg-[#111827] border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-sm transition-all"
          >
            <UserPlus size={14} />
            إنشاء حساب جديد
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ===================================================================
   Register Modal — New account creation with photo uploads
   =================================================================== */

function RegisterModal({ isOpen, onClose, onSwitchToLogin }: {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const idPhotoRef = useRef<HTMLInputElement>(null);
  const facePhotoRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 800;
          let w = img.width;
          let h = img.height;
          if (w > h) { h = (h / w) * MAX; w = MAX; }
          else { w = (w / h) * MAX; h = MAX; }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          } else {
            reject(new Error('Canvas context failed'));
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'id' | 'face') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار صورة بصيغة JPEG أو PNG');
      return;
    }

    try {
      const compressed = await compressImage(file);
      if (type === 'id') setIdPhoto(compressed);
      else setFacePhoto(compressed);
      setError('');
    } catch {
      setError('فشل في معالجة الصورة');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim() || !password || !fullName.trim() || !address.trim() || !country.trim() || !idPhoto || !facePhoto) {
      setError('جميع الحقول مطلوبة');
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
          address: address.trim(),
          country: country.trim(),
          idPhoto,
          facePhoto,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'فشل في إنشاء الحساب');
      }
    } catch {
      setError('فشل الاتصال بالخادم');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-[#0d1117] border border-emerald-500/20 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-gray-100 font-bold text-lg flex items-center gap-2">
            <UserPlus size={20} className="text-emerald-400" />
            إنشاء حساب جديد
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="text-center py-8">
            <CheckCircle2 size={56} className="text-emerald-400 mx-auto mb-4" />
            <h4 className="text-gray-100 font-bold text-lg mb-2">تم إنشاء الحساب بنجاح!</h4>
            <p className="text-gray-400 text-sm mb-6">سيتم مراجعة بياناتك من قبل الإدارة. يمكنك تسجيل الدخول الآن.</p>
            <button
              onClick={() => { onClose(); onSwitchToLogin(); }}
              className="flex items-center justify-center gap-2 mx-auto px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium transition-all"
            >
              <LogIn size={16} />
              تسجيل الدخول الآن
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3].map(s => (
                <div key={s} className={`flex items-center gap-1.5 ${step >= s ? 'text-emerald-400' : 'text-gray-600'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                    step > s ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                    step === s ? 'bg-emerald-500/30 border-emerald-500/50 text-emerald-400' :
                    'bg-[#111827] border-gray-700 text-gray-600'
                  }`}>
                    {step > s ? <CheckCircle2 size={14} /> : s}
                  </div>
                  <span className="text-[10px] hidden sm:inline">
                    {s === 1 ? 'المعلومات الأساسية' : s === 2 ? 'العنوان والصور' : 'كلمة السر'}
                  </span>
                  {s < 3 && <div className={`w-6 h-px ${step > s ? 'bg-emerald-500/40' : 'bg-gray-700'}`} />}
                </div>
              ))}
            </div>

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                    <User size={14} className="text-emerald-400" />
                    الاسم الثلاثي
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="الاسم الأول والثاني والأخير"
                    className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/20 text-gray-100 text-sm placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-all"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                    <Phone size={14} className="text-emerald-400" />
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+964 7XX XXX XXXX"
                    className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/20 text-gray-100 text-sm placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-all"
                    dir="ltr"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => { if (fullName.trim() && phone.trim()) setStep(2); else setError('يرجى ملء جميع الحقول'); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium transition-all"
                >
                  التالي
                </button>
              </div>
            )}

            {/* Step 2: Address & Photos */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-400" />
                    مكان السكن
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="المدينة / المنطقة"
                    className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/20 text-gray-100 text-sm placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-all"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                    <Globe size={14} className="text-emerald-400" />
                    البلد
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="العراق، إيران،..."
                    className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/20 text-gray-100 text-sm placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-all"
                    dir="rtl"
                  />
                </div>

                {/* ID Photo Upload */}
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                    <Shield size={14} className="text-emerald-400" />
                    صورة الهوية
                  </label>
                  <input type="file" ref={idPhotoRef} accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'id')} />
                  {idPhoto ? (
                    <div className="relative rounded-xl overflow-hidden border border-emerald-500/30">
                      <img src={idPhoto} alt="صورة الهوية" className="w-full h-32 object-cover" />
                      <button
                        type="button"
                        onClick={() => { setIdPhoto(null); if (idPhotoRef.current) idPhotoRef.current.value = ''; }}
                        className="absolute top-2 right-2 p-1 rounded-lg bg-black/50 text-white hover:bg-black/70"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => idPhotoRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl bg-[#111827] border border-dashed border-emerald-500/20 text-gray-400 hover:border-emerald-500/40 hover:text-emerald-400 transition-all"
                    >
                      <Upload size={16} />
                      <span className="text-xs">اضغط لرفع صورة الهوية</span>
                    </button>
                  )}
                </div>

                {/* Face Photo Upload */}
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                    <Camera size={14} className="text-emerald-400" />
                    صورة الوجه (صورة شخصية واضحة)
                  </label>
                  <input type="file" ref={facePhotoRef} accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'face')} />
                  {facePhoto ? (
                    <div className="relative rounded-xl overflow-hidden border border-emerald-500/30">
                      <img src={facePhoto} alt="صورة الوجه" className="w-full h-32 object-cover" />
                      <button
                        type="button"
                        onClick={() => { setFacePhoto(null); if (facePhotoRef.current) facePhotoRef.current.value = ''; }}
                        className="absolute top-2 right-2 p-1 rounded-lg bg-black/50 text-white hover:bg-black/70"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => facePhotoRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl bg-[#111827] border border-dashed border-emerald-500/20 text-gray-400 hover:border-emerald-500/40 hover:text-emerald-400 transition-all"
                    >
                      <Camera size={16} />
                      <span className="text-xs">اضغط لرفع صورة شخصية</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center justify-center gap-1 px-4 py-3 rounded-xl bg-[#111827] border border-gray-700/50 text-gray-400 text-sm transition-all"
                  >
                    <ArrowLeft size={14} />
                    رجوع
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!address.trim() || !country.trim() || !idPhoto || !facePhoto) {
                        setError('يرجى ملء جميع الحقول ورفع الصور');
                      } else {
                        setError('');
                        setStep(3);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium transition-all"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Password */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                    <Lock size={14} className="text-emerald-400" />
                    كلمة السر
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6 أحرف على الأقل"
                      className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/20 text-gray-100 text-sm placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-all"
                      dir="rtl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                    <Lock size={14} className="text-emerald-400" />
                    تأكيد كلمة السر
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة السر"
                    className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-emerald-500/20 text-gray-100 text-sm placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-all"
                    dir="rtl"
                  />
                </div>

                {/* Summary */}
                <div className="p-3 bg-[#111827] rounded-xl border border-emerald-500/10 text-xs space-y-1">
                  <p className="text-gray-500 font-medium mb-1">ملخص التسجيل:</p>
                  <p className="text-gray-400"><span className="text-gray-500">الاسم:</span> {fullName}</p>
                  <p className="text-gray-400"><span className="text-gray-500">الهاتف:</span> {phone}</p>
                  <p className="text-gray-400"><span className="text-gray-500">العنوان:</span> {address}، {country}</p>
                  <p className="text-gray-400"><span className="text-gray-500">صورة الهوية:</span> {idPhoto ? 'مرفقة ✓' : 'غير مرفقة ✗'}</p>
                  <p className="text-gray-400"><span className="text-gray-500">صورة الوجه:</span> {facePhoto ? 'مرفقة ✓' : 'غير مرفقة ✗'}</p>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-xs">{error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setStep(2); setError(''); }}
                    className="flex items-center justify-center gap-1 px-4 py-3 rounded-xl bg-[#111827] border border-gray-700/50 text-gray-400 text-sm transition-all"
                  >
                    <ArrowLeft size={14} />
                    رجوع
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {loading ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب'}
                  </button>
                </div>
              </div>
            )}

            {/* Switch to Login */}
            <div className="mt-4 pt-3 border-t border-emerald-500/10 text-center">
              <p className="text-gray-500 text-xs">لديك حساب بالفعل؟</p>
              <button
                type="button"
                onClick={() => { onClose(); onSwitchToLogin(); }}
                className="text-emerald-400 hover:text-emerald-300 text-xs mt-1 transition-all"
              >
                تسجيل الدخول
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ===================================================================
   Forgot Password Modal — Contact support via WhatsApp
   =================================================================== */

function ForgotPasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const handleContact = () => {
    window.open('https://wa.me/9647700000000?text=' + encodeURIComponent('مرحباً، نسيت كلمة السر لحسابي في مكتبة العلي الرقمية. أرجو المساعدة في إعادة تعيينها.'), '_blank');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-[#0d1117] border border-emerald-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center"
      >
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-gray-100 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <MessageCircle size={28} className="text-emerald-400" />
        </div>
        <h3 className="text-gray-100 font-bold text-lg mb-2">نسيت كلمة السر؟</h3>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          لإعادة تعيين كلمة السر، يرجى التواصل مع فريق الدعم مباشرة عبر واتساب. سنقوم بالتحقق من هويتك وإعادة تعيين كلمة السر لك.
        </p>

        <button
          onClick={handleContact}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium transition-all"
        >
          <MessageCircle size={16} />
          تواصل مع الدعم عبر واتساب
        </button>
      </motion.div>
    </motion.div>
  );
}

export { LoginModal, RegisterModal, ForgotPasswordModal };
