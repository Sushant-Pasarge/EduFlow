import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';
import { Material, Course } from '../types';
import { Plus, BookOpen, File, Image, FileText, Download, X, Loader2, Upload, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function Materials() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const courseFilter = searchParams.get('courseId');

  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    courseId: ''
  });

  useEffect(() => {
    if (!profile) return;
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    try {
      const allCourses = await api.courses.getAll();
      setCourses(allCourses);

      const allMaterials = await api.materials.getAll();
      setMaterials(allMaterials);
    } catch (error) {
      console.error(error);
    }
  };

  const filteredMaterials = courseFilter 
    ? materials.filter(m => m.courseId === courseFilter)
    : materials;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !file) return;
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      console.log('Starting material upload in UI...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', newMaterial.title);
      formData.append('description', newMaterial.description);
      formData.append('courseId', newMaterial.courseId);

      console.log('Calling api.materials.upload...');
      await api.materials.upload(formData, (p) => {
        console.log(`Material Upload Progress: ${p}%`);
        setProgress(p);
      });
      
      setProgress(100);
      console.log('Material upload completed in UI');
      
      setNewMaterial({ title: '', description: '', courseId: '' });
      setFile(null);
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('UI Material Upload Error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="text-red-500" size={24} />;
    if (type.includes('image')) return <Image className="text-blue-500" size={24} />;
    return <File className="text-slate-500" size={24} />;
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Study Materials</h1>
          <p className="text-slate-500 mt-1">
            {courseFilter 
              ? `Showing materials for ${courses.find(c => c.id === courseFilter)?.courseName || 'Selected Course'}`
              : 'Access lecture notes, PDFs, and other resources.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {courseFilter && (
            <button
              onClick={() => setSearchParams({})}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl transition-all"
            >
              <X size={16} />
              Clear Filter
            </button>
          )}
          {profile?.role === 'teacher' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
            >
              <Plus size={20} />
              Upload Material
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMaterials.length > 0 ? filteredMaterials.map(material => (
          <div key={material.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                {getFileIcon(material.fileType)}
              </div>
              <a 
                href={material.fileUrl} 
                download={material.fileName}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Download size={20} />
              </a>
            </div>
            <h3 className="font-bold text-slate-900 line-clamp-1">{material.title}</h3>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mt-1">
              {courses.find(c => c.id === material.courseId)?.courseName || 'General'}
            </p>
            <p className="text-sm text-slate-500 mt-3 line-clamp-2">{material.description || 'No description provided.'}</p>
            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {format(new Date(material.createdAt), 'MMM dd, yyyy')}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {(Math.random() * 5 + 1).toFixed(1)} MB
              </span>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center">
            <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">No materials uploaded yet.</p>
          </div>
        )}
      </div>

      {/* Upload Material Modal */}
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
                <h2 className="text-2xl font-bold text-slate-900">Upload Material</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                  <input
                    type="text"
                    required
                    value={newMaterial.title}
                    onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Lecture 1: Introduction"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={newMaterial.description}
                    onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Briefly describe the material..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Course</label>
                  <select
                    required
                    value={newMaterial.courseId}
                    onChange={(e) => setNewMaterial({ ...newMaterial, courseId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Course</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.courseName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">File</label>
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
                        {file ? file.name : 'Select PDF, Image, or Document'}
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
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Upload Material'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
