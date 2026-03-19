import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';
import { Assignment, Course, Submission } from '../types';
import { Plus, FileText, Calendar, Clock, Upload, X, Loader2, ExternalLink, CheckCircle, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function Assignments() {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isViewSubmissionsModalOpen, setIsViewSubmissionsModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    deadline: '',
    courseId: ''
  });

  useEffect(() => {
    if (!profile) return;
    fetchData();
  }, [profile]);

  const location = useLocation();
  const locationState = location.state as { submitAssignmentId?: string } | null;

  useEffect(() => {
    if (locationState?.submitAssignmentId) {
      setSelectedAssignmentId(locationState.submitAssignmentId);
      setIsSubmitModalOpen(true);
      // Clear state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [locationState]);

  const fetchData = async () => {
    setInitialLoading(true);
    try {
      const allCourses = await api.courses.getAll();
      setCourses(allCourses);

      const allAssignments = await api.assignments.getAll();
      if (profile?.role === 'teacher') {
        setAssignments(allAssignments.filter((a: Assignment) => a.teacherId === profile.uid));
      } else {
        setAssignments(allAssignments);
      }

      const allSubmissions = profile?.role === 'student' 
        ? await api.submissions.getForStudent(profile.uid)
        : await api.submissions.getAll();
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error(error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      console.log('Starting assignment creation in UI...');
      const formData = new FormData();
      if (file) formData.append('file', file);
      formData.append('title', newAssignment.title);
      formData.append('description', newAssignment.description);
      formData.append('deadline', newAssignment.deadline);
      formData.append('courseId', newAssignment.courseId);

      console.log('Calling api.assignments.create...');
      await api.assignments.create(formData, (p) => {
        console.log(`Assignment Creation Progress: ${p}%`);
        setProgress(p);
      });
      
      setProgress(100);
      console.log('Assignment creation completed in UI');

      setNewAssignment({ title: '', description: '', deadline: '', courseId: '' });
      setFile(null);
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('UI Assignment Creation Error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedAssignmentId || !file) return;
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      console.log('Starting submission process in UI...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assignmentId', selectedAssignmentId);

      console.log('Calling api.submissions.submit...');
      await api.submissions.submit(formData, (p) => {
        console.log(`UI Progress: ${p}%`);
        setProgress(p);
      });
      
      setProgress(100);
      console.log('Submission process completed in UI');

      setFile(null);
      setSelectedAssignmentId(null);
      setIsSubmitModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('UI Submission Error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assignments</h1>
          <p className="text-slate-500 mt-1">
            {profile?.role === 'teacher' ? 'Manage and track student assignments.' : 'View and submit your course assignments.'}
          </p>
        </div>
        {profile?.role === 'teacher' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
          >
            <Plus size={20} />
            Post Assignment
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6">
        {initialLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto text-indigo-600 animate-spin mb-4" size={48} />
            <p className="text-slate-400 font-medium">Loading assignments...</p>
          </div>
        ) : assignments.length > 0 ? assignments.map(assignment => (
          <div key={assignment.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                <FileText size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-slate-900">{assignment.title}</h3>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-md">
                    {courses.find(c => c.id === assignment.courseId)?.courseName || 'General'}
                  </span>
                </div>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{assignment.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <Calendar size={16} />
                    <span>Due: {format(new Date(assignment.deadline), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={16} />
                    <span>{format(new Date(assignment.deadline), 'hh:mm a')}</span>
                  </div>
                  {assignment.fileUrl && (
                    <a 
                      href={assignment.fileUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-indigo-600 hover:underline"
                    >
                      <ExternalLink size={16} />
                      <span>View Material</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {profile?.role === 'teacher' ? (
                <button 
                  onClick={() => {
                    setSelectedAssignmentId(assignment.id);
                    setIsViewSubmissionsModalOpen(true);
                  }}
                  className="px-6 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  View Submissions
                </button>
              ) : (
                submissions.some(s => s.assignmentId === assignment.id) ? (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold px-6 py-2.5 bg-emerald-50 rounded-xl">
                    <CheckCircle size={20} />
                    <span>Submitted</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setSelectedAssignmentId(assignment.id);
                      setIsSubmitModalOpen(true);
                    }}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                  >
                    Submit Now
                  </button>
                )
              )}
            </div>
          </div>
        )) : (
          <div className="py-20 text-center">
            <FileText size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">No assignments found.</p>
          </div>
        )}
      </div>

      {/* Post Assignment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Post New Assignment</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                    <input
                      type="text"
                      required
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. Final Project Proposal"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Course</label>
                    <select
                      required
                      value={newAssignment.courseId}
                      onChange={(e) => setNewAssignment({ ...newAssignment, courseId: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Select Course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.courseName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Deadline</label>
                    <input
                      type="datetime-local"
                      required
                      value={newAssignment.deadline}
                      onChange={(e) => setNewAssignment({ ...newAssignment, deadline: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                    <textarea
                      rows={4}
                      value={newAssignment.description}
                      onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      placeholder="Assignment details and instructions..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Attachment (Optional)</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-300 transition-colors cursor-pointer relative">
                      <input
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="text-slate-400" size={32} />
                        <p className="text-sm font-medium text-slate-500">
                          {file ? file.name : 'Click or drag to upload assignment file'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {loading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>Uploading...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Post Assignment'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submit Assignment Modal */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Submit Assignment</h2>
                <button 
                  onClick={() => {
                    setIsSubmitModalOpen(false);
                    setFile(null);
                    setError(null);
                  }} 
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmitAssignment} className="space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-1">
                      {assignments.find(a => a.id === selectedAssignmentId)?.title || 'Loading assignment details...'}
                    </h4>
                    <p className="text-sm text-slate-500">
                      Please attach your completed work document below.
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-300 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      required
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="text-slate-400" size={32} />
                      <p className="text-sm font-medium text-slate-500">
                        {file ? file.name : 'Click or drag to upload submission'}
                      </p>
                    </div>
                  </div>
                </div>

                {loading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>Uploading...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !file}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Submit Assignment'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Submissions Modal (Teacher) */}
      <AnimatePresence>
        {isViewSubmissionsModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl p-8 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Student Submissions</h2>
                  <p className="text-slate-500 text-sm">
                    {assignments.find(a => a.id === selectedAssignmentId)?.title}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsViewSubmissionsModalOpen(false);
                    setSelectedAssignmentId(null);
                  }} 
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {submissions.filter(s => s.assignmentId === selectedAssignmentId).length > 0 ? (
                  <div className="space-y-4">
                    {submissions.filter(s => s.assignmentId === selectedAssignmentId).map(submission => (
                      <div key={submission.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                            <UserIcon size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{submission.studentName}</p>
                            <p className="text-xs text-slate-500">
                              Submitted: {format(new Date(submission.submittedAt), 'MMM dd, yyyy hh:mm a')}
                            </p>
                          </div>
                        </div>
                        <a 
                          href={submission.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition-colors text-sm"
                        >
                          <ExternalLink size={16} />
                          View File
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <FileText size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-400 font-medium">No submissions yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
