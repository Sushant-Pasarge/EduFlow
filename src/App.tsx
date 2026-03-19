import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { api } from './api';
import { UserProfile } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Login from './components/Login';
import Register from './components/Register';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import CourseManagement from './components/CourseManagement';
import Assignments from './components/Assignments';
import Materials from './components/Materials';
import Notifications from './components/Notifications';
import Timetable from './components/Timetable';
import Attendance from './components/Attendance';
import StudentList from './components/StudentList';
import Profile from './components/Profile';
import AdminDashboard from './components/AdminDashboard';
import { LogOut, BookOpen, Bell, Calendar, FileText, User as UserIcon, LayoutDashboard, Menu, X, ShieldCheck, CheckSquare, GraduationCap, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Auth Context ---
interface AuthContextType {
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Layout Component ---
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Assignments', path: '/assignments', icon: FileText },
    { name: 'Materials', path: '/materials', icon: BookOpen },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Timetable', path: '/timetable', icon: Calendar },
    { name: 'Attendance', path: '/attendance', icon: CheckSquare },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ];

  if (profile?.role === 'student') {
    navItems.splice(1, 0, { name: 'Courses', path: '/courses', icon: BookOpen });
  }

  if (profile?.role === 'teacher') {
    navItems.splice(1, 0, { name: 'Courses', path: '/courses', icon: BookOpen });
    navItems.splice(2, 0, { name: 'Students', path: '/students', icon: Users });
  }

  if (profile?.role === 'admin') {
    navItems.splice(1, 0, { name: 'Admin', path: '/admin', icon: ShieldCheck });
    navItems.splice(2, 0, { name: 'Students', path: '/students', icon: Users });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <BookOpen size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">EduFlow</h1>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors group"
            >
              <item.icon size={20} className="group-hover:text-indigo-600" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <button
            onClick={() => signOut().then(() => navigate('/login'))}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
          >
            <LogOut size={20} className="group-hover:text-red-600" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <BookOpen size={18} />
          </div>
          <span className="font-bold text-slate-900">EduFlow</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed inset-0 z-40 md:hidden bg-white pt-16 px-6"
          >
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 p-4 text-slate-700 hover:bg-slate-50 rounded-xl"
                >
                  <item.icon size={22} />
                  <span className="text-lg font-medium">{item.name}</span>
                </Link>
              ))}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  signOut().then(() => navigate('/login'));
                }}
                className="flex items-center gap-4 p-4 w-full text-red-600 hover:bg-red-50 rounded-xl"
              >
                <LogOut size={22} />
                <span className="text-lg font-medium">Sign Out</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

// --- Protected Route ---
const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" />;
  }

  return <Layout>{children}</Layout>;
};

// --- Semester Selection Modal ---
const SemesterSelectionModal: React.FC<{ onSelect: (sem: string) => void, onSignOut: () => void }> = ({ onSelect, onSignOut }) => {
  const [selected, setSelected] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, { semester: selected }, { merge: true });
        onSelect(selected);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center"
      >
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <GraduationCap size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Your Semester</h2>
        <p className="text-slate-500 mb-8">Please select your current semester to continue.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-medium"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
              <option key={sem} value={sem.toString()}>Semester {sem}</option>
            ))}
          </select>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70 transition-all"
          >
            {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm Selection'}
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all"
          >
            Sign Out
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // This might happen if registration is incomplete or using a different method
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      localStorage.removeItem('token'); // Keep for legacy if needed, but Firebase handles it
      setProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ profile, loading, signOut, setProfile }}>
      {profile?.role === 'student' && !profile.semester && (
        <SemesterSelectionModal 
          onSelect={(sem) => setProfile({ ...profile, semester: sem })} 
          onSignOut={signOut}
        />
      )}
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              {profile?.role === 'admin' ? <AdminDashboard /> : 
               profile?.role === 'teacher' ? <TeacherDashboard /> : 
               <StudentDashboard />}
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/courses" element={
            <ProtectedRoute>
              <CourseManagement />
            </ProtectedRoute>
          } />
          
          <Route path="/assignments" element={
            <ProtectedRoute>
              <Assignments />
            </ProtectedRoute>
          } />
          
          <Route path="/materials" element={
            <ProtectedRoute>
              <Materials />
            </ProtectedRoute>
          } />
          
          <Route path="/notifications" element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } />
          
          <Route path="/timetable" element={
            <ProtectedRoute>
              <Timetable />
            </ProtectedRoute>
          } />

          <Route path="/attendance" element={
            <ProtectedRoute>
              <Attendance />
            </ProtectedRoute>
          } />

          <Route path="/students" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <StudentList />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}
