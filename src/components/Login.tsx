import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../App';
import { BookOpen, Mail, Lock, ArrowRight, Eye, EyeOff, GraduationCap, School, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [role, setRole] = useState<'teacher' | 'student' | 'admin'>('student');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { setProfile, profile } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (profile) {
      navigate('/');
    }
  }, [profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (isResetting) {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Password reset email sent. Please check your inbox.');
        setIsResetting(false);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role !== role) {
            throw new Error(`Invalid role. This account is registered as a ${userData.role}.`);
          }
          setProfile(userData as any);
          navigate('/');
        } else {
          throw new Error('User profile not found.');
        }
      }
    } catch (err: any) {
      let message = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      }
      setError(message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-200">
            <BookOpen size={32} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900">{isResetting ? 'Reset Password' : 'Welcome Back'}</h2>
          <p className="text-slate-500 mt-2">{isResetting ? 'Enter your email and new password' : 'Sign in to continue to EduFlow'}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm mb-6 border border-emerald-100">
            {success}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {!isResetting && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                  role === 'student' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <GraduationCap size={18} />
                <span className="text-[10px] font-bold">Student</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                  role === 'teacher' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <School size={18} />
                <span className="text-[10px] font-bold">Teacher</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                  role === 'admin' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <ShieldCheck size={18} />
                <span className="text-[10px] font-bold">Admin</span>
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{isResetting ? 'New Password' : 'Password'}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={isResetting ? newPassword : password}
                onChange={(e) => isResetting ? setNewPassword(e.target.value) : setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {!isResetting && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsResetting(true);
                  setError('');
                  setSuccess('');
                }}
                className="text-sm font-bold text-indigo-600 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (isResetting ? 'Resetting...' : 'Signing in...') : (isResetting ? 'Reset Password' : 'Sign In')}
            {!loading && <ArrowRight size={20} />}
          </button>

          {isResetting && (
            <button
              type="button"
              onClick={() => {
                setIsResetting(false);
                setError('');
                setSuccess('');
              }}
              className="w-full text-slate-500 font-bold py-2 hover:text-slate-700 transition-colors"
            >
              Back to Sign In
            </button>
          )}
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-bold hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
