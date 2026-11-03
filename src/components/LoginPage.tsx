import React, { useState } from 'react';
import { UserSession } from '../types';
import { 
  User, 
  KeyRound, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; user?: UserSession; message: string }> | { success: boolean; user?: UserSession; message: string };
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    const cleanPass = password.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    if (!cleanUser) {
      setErrorMessage('กรุณากรอก ID (ชื่อผู้ใช้งาน)');
      return;
    }
    if (!cleanPass) {
      setErrorMessage('กรุณากรอก Password (รหัสผ่าน)');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await Promise.resolve(onLogin(cleanUser, cleanPass));
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.message || 'ID หรือ Password ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('ID หรือ Password ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 font-sans select-none"
      style={{
        background: 'radial-gradient(ellipse 95% 85% at 75% 45%, #173b75 0%, #0f244a 38%, #09152b 78%, #040913 100%)'
      }}
    >
      {/* Central Login Card */}
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-9 max-w-[430px] w-full mx-auto animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
        {/* Brand Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white border border-slate-200 p-2 shadow-sm flex items-center justify-center">
            <img 
              src="/nexus-logo.png" 
              alt="School Management System" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
              ระบบบริหารจัดการงานวิชาการและธุรการ
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            กรุณากรอก ID และ Password เพื่อเข้าสู่ระบบ
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs sm:text-sm animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} autoComplete="off" data-form-type="other" className="space-y-4">
          {/* ID Input */}
          <div>
            <label 
              htmlFor="login-id" 
              className="block text-xs font-bold text-slate-800 mb-1.5"
            >
              ID (ชื่อผู้ใช้งาน) <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center bg-[#edf4ff] border border-blue-100 rounded-xl focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:border-purple-500 transition-all">
              <div className="pl-3.5 pr-2 text-slate-400 flex items-center pointer-events-none">
                <User className="w-4 h-4" />
              </div>
              <input
                id="login-id"
                name="auth_uid"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                autoFocus
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                data-lpignore="true"
                data-form-type="other"
                spellCheck={false}
                placeholder="กรอกชื่อผู้ใช้งาน"
                className="w-full py-2.5 pr-4 text-sm bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label 
              htmlFor="login-password" 
              className="block text-xs font-bold text-slate-800 mb-1.5"
            >
              Password (รหัสผ่าน) <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center bg-[#edf4ff] border border-blue-100 rounded-xl focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:border-purple-500 transition-all">
              <div className="pl-3.5 pr-2 text-slate-400 flex items-center pointer-events-none">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="login-password"
                name="auth_code"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-form-type="other"
                placeholder="••••••"
                className="w-full py-2.5 pr-10 text-sm bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                tabIndex={-1}
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Inactivity Security Box */}
          <div className="p-3 bg-[#faf5ff] border border-purple-200/80 rounded-xl flex items-start gap-2.5 text-xs text-purple-900">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px] font-medium">
              ปลอดภัยสูง: ตรวจจับ Inactivity และตัดเซสชันเมื่อไม่มีการใช้งาน 15 นาที
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-3 px-4 bg-[#173b75] hover:bg-[#11274d] active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ (Sign In)</span>
              </>
            )}
          </button>


        </form>
      </div>
    </div>
  );
};
