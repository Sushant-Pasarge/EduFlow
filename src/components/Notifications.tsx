import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../App';
import { Notification, Course } from '../types';
import { Bell, Plus, X, Loader2, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newNotif, setNewNotif] = useState({
    title: '',
    message: '',
    courseId: '',
    semester: 'all',
    file: null as File | null
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!profile) return;
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    try {
      const allCourses = await api.courses.getAll();
      setCourses(allCourses);

      const notificationsData = await api.notifications.getAll(profile?.role === 'student' ? profile.semester : undefined);
      setNotifications(notificationsData);

      // Update last viewed timestamp
      if (profile) {
        localStorage.setItem(`lastViewedNotifs_${profile.uid}`, Date.now().toString());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', newNotif.title);
      formData.append('message', newNotif.message);
      formData.append('courseId', newNotif.courseId);
      formData.append('semester', newNotif.semester);
      if (newNotif.file) {
        formData.append('file', newNotif.file);
      }

      await api.notifications.create(formData, (p) => setProgress(p));
      
      setProgress(100);

      setNewNotif({ title: '', message: '', courseId: '', semester: 'all', file: null });
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">Stay updated with the latest announcements.</p>
        </div>
        {profile?.role === 'teacher' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
          >
            <Plus size={20} />
            Post Announcement
          </button>
        )}
      </header>

      <div className="space-y-4">
        {notifications.length > 0 ? notifications.map(notif => (
          <div key={notif.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex gap-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <Bell size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-900">{notif.title}</h3>
                <span className="text-xs font-bold text-slate-400 uppercase">
                  {format(new Date(notif.timestamp), 'MMM dd, hh:mm a')}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">{notif.message}</p>
              {notif.fileUrl && (
                <div className="mt-3">
                  <a 
                    href={notif.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Plus size={14} className="rotate-45" />
                    View Attachment
                  </a>
                </div>
              )}
              {notif.courseId && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded-md">
                    {courses.find(c => c.id === notif.courseId)?.courseName || 'Course Update'}
                  </span>
                  {notif.semester && notif.semester !== 'all' && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-md">
                      Semester {notif.semester}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="py-20 text-center">
            <Bell size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">No notifications yet.</p>
          </div>
        )}
      </div>

      {/* Post Notification Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">New Announcement</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handlePost} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                  <input
                    type="text"
                    required
                    value={newNotif.title}
                    onChange={(e) => setNewNotif({ ...newNotif, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Class Rescheduled"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Course (Optional)</label>
                  <select
                    value={newNotif.courseId}
                    onChange={(e) => setNewNotif({ ...newNotif, courseId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">All Courses</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.courseName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Target Semester</label>
                  <select
                    value={newNotif.semester}
                    onChange={(e) => setNewNotif({ ...newNotif, semester: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="all">All Semesters</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem.toString()}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                  <textarea
                    rows={4}
                    required
                    value={newNotif.message}
                    onChange={(e) => setNewNotif({ ...newNotif, message: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Write your announcement here..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Attachment (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setNewNotif({ ...newNotif, file: e.target.files?.[0] || null })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                {loading && (
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                    <motion.div 
                      className="bg-indigo-600 h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Post Announcement'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
