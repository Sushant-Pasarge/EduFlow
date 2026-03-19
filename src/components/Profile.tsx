import React, { useState } from 'react';
import { useAuth } from '../App';
import { User, Mail, Shield, Calendar, LogOut, Camera, School, Edit2, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../api';
import { motion, AnimatePresence } from 'motion/react';

export default function Profile() {
  const { profile, signOut, setProfile } = useAuth();
  const [isEditingSem, setIsEditingSem] = useState(false);
  const [newSem, setNewSem] = useState(profile?.semester || '1');
  const [loading, setLoading] = useState(false);

  if (!profile) return null;

  const handleUpdateSem = async () => {
    setLoading(true);
    try {
      await api.auth.updateSemester(newSem);
      setProfile({ ...profile, semester: newSem });
      setIsEditingSem(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Your Profile</h1>
        <p className="text-slate-500 mt-1">Manage your account settings and preferences.</p>
      </header>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Cover Photo Placeholder */}
        <div className="h-32 bg-indigo-600 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 bg-white rounded-3xl p-1 shadow-lg">
              <div className="w-full h-full bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 relative group">
                <User size={48} />
                <button className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{profile.name}</h2>
              <p className="text-slate-500 flex items-center gap-2 mt-1">
                <Mail size={16} />
                {profile.email}
              </p>
              {profile.university && (
                <p className="text-slate-500 flex items-center gap-2 mt-1">
                  <School size={16} />
                  {profile.university}
                </p>
              )}
              {profile.semester && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-slate-500 flex items-center gap-2">
                    <Calendar size={16} />
                    Semester {profile.semester}
                  </p>
                  <button 
                    onClick={() => setIsEditingSem(true)}
                    className="p-1 hover:bg-slate-100 rounded-md text-indigo-600 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
                profile.role === 'teacher' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {profile.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3 text-slate-400 mb-4">
                <Shield size={20} />
                <span className="text-xs font-bold uppercase tracking-wider">Account Security</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Password: ••••••••••••</p>
              <button className="text-indigo-600 text-sm font-bold mt-3 hover:underline">Change Password</button>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3 text-slate-400 mb-4">
                <Calendar size={20} />
                <span className="text-xs font-bold uppercase tracking-wider">Member Since</span>
              </div>
              <p className="text-sm font-medium text-slate-700">
                {profile.createdAt ? format(new Date(profile.createdAt), 'MMMM dd, yyyy') : 'N/A'}
              </p>
              <p className="text-xs text-slate-400 mt-3">Account verified via Email</p>
            </div>
          </div>

          <div className="mt-10 pt-10 border-t border-slate-100">
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-red-600 font-bold hover:bg-red-50 px-6 py-3 rounded-2xl transition-all"
            >
              <LogOut size={20} />
              Sign Out from all devices
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditingSem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Update Semester</h3>
                  <p className="text-sm text-slate-500">Select your current semester</p>
                </div>
              </div>

              <div className="space-y-6">
                <select
                  value={newSem}
                  onChange={(e) => setNewSem(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem.toString()}>Semester {sem}</option>
                  ))}
                </select>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditingSem(false)}
                    className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateSem}
                    disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Update'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
