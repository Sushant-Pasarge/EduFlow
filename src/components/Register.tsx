import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../App';
import { BookOpen, Mail, Lock, User, ArrowRight, GraduationCap, School, Eye, EyeOff, ChevronDown, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'teacher' | 'student' | 'admin'>('student');
  const [university, setUniversity] = useState('');
  const [usn, setUsn] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setProfile, profile, signOut } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (profile && !success) {
      navigate('/');
    }
  }, [profile, navigate, success]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!university) {
      setError('Please select a university');
      return;
    }
    if (role === 'student' && !usn) {
      setError('Please enter your USN');
      return;
    }
    if ((role === 'teacher' || role === 'admin') && !secretCode) {
      setError(`Please enter the ${role} verification code`);
      return;
    }

    // Simple secret code check (In a real app, this would be validated on the server)
    if (role === 'teacher' && secretCode !== 'TEACHER2026') {
      setError('Invalid teacher verification code');
      return;
    }
    if (role === 'admin' && secretCode !== 'ADMIN2026') {
      setError('Invalid admin verification code');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userData = {
        uid: user.uid,
        email: email.toLowerCase(),
        name: name,
        role,
        university,
        usn: role === 'student' ? usn.toUpperCase() : null,
        semester: null,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      
      // Sign out so user has to log in manually
      await signOut();
      
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      let message = err.message;
      if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      }
      setError(message || 'Failed to register');
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
          <h2 className="text-3xl font-bold text-slate-900">Create Account</h2>
          <p className="text-slate-500 mt-2">Join EduFlow learning community</p>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <ArrowRight size={40} className="rotate-[-45deg]" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Account Created!</h3>
            <p className="text-slate-600 mb-8">Your account has been successfully created. Redirecting you to login...</p>
            <Link 
              to="/login" 
              className="inline-flex items-center justify-center px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              Go to Login
            </Link>
          </motion.div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">University</label>
            <div className="relative">
              <School className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <select
                required
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="" disabled>Select University</option>
                <option value="R R Institute of Technology">R R Institute of Technology</option>
                <option value="Visvesvaraya Technological University">Visvesvaraya Technological University</option>
                <option value="Bangalore University">Bangalore University</option>
                <option value="MS Ramaiah Institute of Technology">MS Ramaiah Institute of Technology</option>
                <option value="RV College of Engineering">RV College of Engineering</option>
                <option value="Other University">Other University</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
          </div>

          {role === 'student' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <label className="block text-sm font-semibold text-slate-700 mb-2">USN (University Seat Number)</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  required={role === 'student'}
                  value={usn}
                  onChange={(e) => {
                    setUsn(e.target.value.toUpperCase());
                    setError('');
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="1RR20CS001"
                />
              </div>
            </motion.div>
          )}

          {(role === 'teacher' || role === 'admin') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <label className="block text-sm font-semibold text-slate-700 mb-2">{role === 'teacher' ? 'Teacher' : 'Admin'} Verification Code</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  required
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Enter secret code"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Contact administration for the verification code.</p>
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">I am a...</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  role === 'student' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <GraduationCap size={20} />
                <span className="font-bold text-xs">Student</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  role === 'teacher' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <School size={20} />
                <span className="font-bold text-xs">Teacher</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  role === 'admin' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <ShieldCheck size={20} />
                <span className="font-bold text-xs">Admin</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </>
    )}
  </motion.div>
    </div>
  );
}
