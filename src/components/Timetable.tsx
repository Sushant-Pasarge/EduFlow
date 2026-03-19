import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../App';
import { TimetableEntry, Course } from '../types';
import { Calendar, Plus, X, Loader2, Clock, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Timetable() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newEntry, setNewEntry] = useState({
    courseId: '',
    day: 'Monday',
    startTime: '',
    endTime: '',
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

      const timetableData = await api.timetable.getAll();
      setEntries(timetableData.map((data: any) => ({
        ...data,
        courseName: allCourses.find((c: Course) => c.id === data.courseId)?.courseName || 'Unknown Course'
      })));
    } catch (error) {
      console.error(error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('courseId', newEntry.courseId);
      formData.append('day', newEntry.day);
      formData.append('startTime', newEntry.startTime);
      formData.append('endTime', newEntry.endTime);
      formData.append('teacherName', profile.name);
      formData.append('room', 'Room 302');
      if (newEntry.file) {
        formData.append('file', newEntry.file);
      }

      await api.timetable.create(formData, (p) => setProgress(p));
      
      setProgress(100);

      setNewEntry({ courseId: '', day: 'Monday', startTime: '', endTime: '', file: null });
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
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Weekly Timetable</h1>
          <p className="text-slate-500 mt-1">Manage and view your class schedules.</p>
        </div>
        {profile?.role === 'teacher' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
          >
            <Plus size={20} />
            Add Schedule
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        {DAYS.map(day => (
          <div key={day} className="space-y-4">
            <div className="bg-indigo-600 text-white p-4 rounded-2xl text-center font-bold shadow-md">
              {day}
            </div>
            <div className="space-y-3">
              {entries.filter(e => e.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime)).map(entry => (
                <div key={entry.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                    {entry.startTime} - {entry.endTime}
                  </p>
                  <h4 className="font-bold text-slate-900 text-sm leading-tight">{entry.courseName}</h4>
                  {entry.fileUrl && (
                    <div className="mt-2">
                      <a 
                        href={entry.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
                      >
                        <Clock size={10} />
                        View Schedule
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-3 text-slate-400">
                    <MapPin size={12} />
                    <span className="text-[10px] font-medium">Room 302</span>
                  </div>
                </div>
              ))}
              {entries.filter(e => e.day === day).length === 0 && (
                <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-300 uppercase">No Classes</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Entry Modal */}
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
                <h2 className="text-2xl font-bold text-slate-900">Add Schedule</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Course</label>
                  <select
                    required
                    value={newEntry.courseId}
                    onChange={(e) => setNewEntry({ ...newEntry, courseId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Course</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.courseName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Day</label>
                  <select
                    required
                    value={newEntry.day}
                    onChange={(e) => setNewEntry({ ...newEntry, day: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      required
                      value={newEntry.startTime}
                      onChange={(e) => setNewEntry({ ...newEntry, startTime: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">End Time</label>
                    <input
                      type="time"
                      required
                      value={newEntry.endTime}
                      onChange={(e) => setNewEntry({ ...newEntry, endTime: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Schedule File (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setNewEntry({ ...newEntry, file: e.target.files?.[0] || null })}
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
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Add Schedule'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
