import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../App';
import { Course, Assignment } from '../types';
import { BookOpen, Users, FileText, CheckCircle, Clock, Plus, ChevronRight, Edit2, X, Loader2, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    pendingSubmissions: 0
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStats, setEditStats] = useState({
    totalStudents: 0,
    pendingSubmissions: 0
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      try {
        // Fetch Courses
        const allCourses = await api.courses.getAll();
        const coursesList = allCourses.filter((c: Course) => c.teacherId === profile.uid);
        setCourses(coursesList);

        // Fetch Recent Assignments
        const allAssignments = await api.assignments.getAll();
        const assignmentsList = allAssignments
          .filter((a: Assignment) => a.teacherId === profile.uid)
          .slice(0, 5);
        setRecentAssignments(assignmentsList);

        // Fetch Stats
        const teacherStats = await api.teacher.getStats();
        setStats(teacherStats);
        setEditStats({
          totalStudents: teacherStats.totalStudents,
          pendingSubmissions: teacherStats.pendingSubmissions
        });
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, [profile]);

  const handleUpdateStats = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.teacher.updateStats(editStats);
      setStats(prev => ({
        ...prev,
        ...editStats
      }));
      setIsEditModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Welcome, Prof. {profile?.name}</h1>
        <p className="text-slate-500 mt-1">Here's what's happening in your classes today.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <BookOpen size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Courses</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalCourses}</p>
          </div>
        </div>
        <div 
          onClick={() => setIsEditModalOpen(true)}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 cursor-pointer hover:border-indigo-200 transition-all group"
        >
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <Users size={28} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">Total Students</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalStudents}</p>
          </div>
          <Edit2 size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div 
          onClick={() => setIsEditModalOpen(true)}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 cursor-pointer hover:border-indigo-200 transition-all group"
        >
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <Clock size={28} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">Pending Reviews</p>
            <p className="text-2xl font-bold text-slate-900">{stats.pendingSubmissions}</p>
          </div>
          <Edit2 size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Courses Section */}
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Your Courses</h2>
            <Link to="/courses" className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors">
              <Plus size={20} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {courses.length > 0 ? courses.map(course => (
              <div key={course.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{course.courseName}</h3>
                    <p className="text-sm text-slate-500">{course.description || 'No description'}</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-indigo-600 transition-colors" size={20} />
              </div>
            )) : (
              <div className="p-10 text-center">
                <p className="text-slate-400">No courses created yet.</p>
                <Link to="/courses" className="text-indigo-600 font-medium mt-2 inline-block">Create your first course</Link>
              </div>
            )}
          </div>
        </section>

        {/* Recent Assignments */}
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent Assignments</h2>
            <Link to="/assignments" className="text-sm font-bold text-indigo-600 hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentAssignments.length > 0 ? recentAssignments.map(assignment => (
              <div key={assignment.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{assignment.title}</h3>
                    <p className="text-sm text-slate-500">Due: {format(new Date(assignment.deadline), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                   <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-full">
                     {assignment.submissionCount || 0}/{assignment.totalStudents || 0} Submissions
                   </span>
                </div>
              </div>
            )) : (
              <div className="p-10 text-center">
                <p className="text-slate-400">No assignments posted yet.</p>
              </div>
            )}
          </div>
        </section>
        
        {/* Quick Announcement */}
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Quick Announcement</h2>
            <Link to="/notifications" className="text-sm font-bold text-indigo-600 hover:underline">View All</Link>
          </div>
          <div className="p-6">
            <p className="text-slate-500 text-sm mb-4">Post a quick announcement to all your students or specific courses.</p>
            <Link 
              to="/notifications" 
              className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all border-2 border-dashed border-indigo-200"
            >
              <Bell size={20} />
              Open Notification Center
            </Link>
          </div>
        </section>
      </div>

      {/* Edit Stats Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Edit Dashboard Stats</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateStats} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Total Students</label>
                  <input
                    type="number"
                    required
                    value={editStats.totalStudents}
                    onChange={(e) => setEditStats({ ...editStats, totalStudents: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Pending Reviews</label>
                  <input
                    type="number"
                    required
                    value={editStats.pendingSubmissions}
                    onChange={(e) => setEditStats({ ...editStats, pendingSubmissions: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
