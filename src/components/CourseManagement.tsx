import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';
import { Course } from '../types';
import { Plus, BookOpen, Trash2, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CourseManagement() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newCourse, setNewCourse] = useState({ courseName: '', description: '', studentsCount: 0 });

  useEffect(() => {
    if (!profile) return;
    fetchCourses();
  }, [profile]);

  const fetchCourses = async () => {
    try {
      const allCourses = await api.courses.getAll();
      
      if (profile?.role === 'teacher') {
        setCourses(allCourses.filter((c: Course) => c.teacherId === profile?.uid));
      } else if (profile?.role === 'student') {
        const enrolledCourses = await api.courses.getEnrolled();
        const enrolledIds = new Set(enrolledCourses.map(c => c.id));
        
        setCourses(allCourses.map(course => ({
          ...course,
          isEnrolled: enrolledIds.has(course.id)
        })));
      } else {
        setCourses(allCourses);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    try {
      await api.courses.create(newCourse);
      setNewCourse({ courseName: '', description: '', studentsCount: 0 });
      setIsModalOpen(false);
      fetchCourses();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);

  const handleEnroll = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    setEnrollingId(courseId);
    try {
      await api.courses.enroll(courseId);
      fetchCourses();
    } catch (error) {
      console.error(error);
    } finally {
      setEnrollingId(null);
    }
  };

  const handleUnenroll = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    setUnenrollingId(courseId);
    try {
      await api.courses.unenroll(courseId);
      fetchCourses();
    } catch (error) {
      console.error(error);
    } finally {
      setUnenrollingId(null);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await api.courses.delete(id); 
      fetchCourses();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {profile?.role === 'teacher' ? 'Course Management' : 
             profile?.role === 'admin' ? 'Global Course Management' : 'All Courses'}
          </h1>
          <p className="text-slate-500 mt-1">
            {profile?.role === 'teacher' 
              ? 'Create and manage your educational courses.' 
              : profile?.role === 'admin'
              ? 'Monitor and manage all courses across the platform.'
              : 'Browse and access materials for your courses.'}
          </p>
        </div>
        {(profile?.role === 'teacher' || profile?.role === 'admin') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
          >
            <Plus size={20} />
            Create Course
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => (
          <div 
            key={course.id} 
            onClick={() => navigate(`/materials?courseId=${course.id}`)}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative cursor-pointer"
          >
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <BookOpen size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{course.courseName}</h3>
            <p className="text-slate-500 mt-2 text-sm line-clamp-2">{course.description || 'No description provided.'}</p>
            
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {course.materialCount || 0} {course.materialCount === 1 ? 'Module' : 'Modules'}
              </span>
              {profile?.role === 'student' && (
                course.isEnrolled ? (
                  <button 
                    onClick={(e) => handleUnenroll(e, course.id)}
                    disabled={unenrollingId === course.id}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {unenrollingId === course.id ? (
                      <div className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    {unenrollingId === course.id ? 'Unenrolling...' : 'Unenroll'}
                  </button>
                ) : (
                  <button 
                    onClick={(e) => handleEnroll(e, course.id)}
                    disabled={enrollingId === course.id}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {enrollingId === course.id ? (
                      <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    {enrollingId === course.id ? 'Enrolling...' : 'Enroll Now'}
                  </button>
                )
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {profile?.role === 'teacher' ? 'Created: ' : 'Instructor: '}
                {profile?.role === 'teacher' 
                  ? new Date(course.createdAt).toLocaleDateString() 
                  : course.teacherName}
              </span>
              {(profile?.role === 'teacher' || profile?.role === 'admin') && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCourse(course.id);
                  }}
                  className="text-slate-300 hover:text-red-600 transition-colors p-2"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Course Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">New Course</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Course Name</label>
                  <input
                    type="text"
                    required
                    value={newCourse.courseName}
                    onChange={(e) => setNewCourse({ ...newCourse, courseName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Advanced Web Development"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                  <textarea
                    rows={4}
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="What will students learn in this course?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Total Students in Class</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newCourse.studentsCount}
                    onChange={(e) => setNewCourse({ ...newCourse, studentsCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. 30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Course'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
