import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../App';
import { UserProfile } from '../types';
import { Search, Filter, Mail, School, GraduationCap, Loader2, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

export default function StudentList() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const users = await api.admin.getUsers();
      setStudents(users.filter((u: any) => u.role === 'student'));
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const studentName = student.name || '';
    const studentEmail = student.email || '';
    const studentUsn = student.usn || '';

    const matchesSearch = 
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentUsn.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSemester = semesterFilter === 'all' || student.semester === semesterFilter;
    
    return matchesSearch && matchesSemester;
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Student Directory</h1>
        <p className="text-slate-500">View and filter all students across the institution</p>
      </header>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, email, or USN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="relative w-full md:w-64">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none font-bold text-slate-700"
          >
            <option value="all">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
              <option key={sem} value={sem.toString()}>Semester {sem}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm font-bold uppercase tracking-wider">
                <th className="px-8 py-5">Student</th>
                <th className="px-8 py-5">USN</th>
                <th className="px-8 py-5 text-center">Semester</th>
                <th className="px-8 py-5">University</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-indigo-600 mb-4" size={40} />
                    <p className="text-slate-500 font-medium">Loading student directory...</p>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <UserIcon size={40} />
                    </div>
                    <p className="text-slate-400 font-medium">No students found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-lg">
                          {(student.name || 'U').charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{student.name || 'Unknown'}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-1">
                            <Mail size={14} />
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="font-mono text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-lg w-fit text-sm">
                        {student.usn || 'N/A'}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      {student.semester ? (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-sm font-bold border border-emerald-100">
                          <GraduationCap size={16} />
                          Sem {student.semester}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-sm italic">Not set</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm text-slate-600 flex items-center gap-2">
                        <School size={16} className="text-slate-400" />
                        {student.university || 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
