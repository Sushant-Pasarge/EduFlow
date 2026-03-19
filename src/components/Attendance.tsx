import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../App';
import { Attendance as AttendanceType, Course, UserProfile } from '../types';
import { CheckCircle2, XCircle, Clock, Search, Filter, Save, Loader2, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function Attendance() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [attendance, setAttendance] = useState<AttendanceType[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  
  // Filters
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(profile?.semester || '1');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Marking state
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'late'>>({});

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      if (profile?.role === 'teacher' || profile?.role === 'admin') {
        fetchStudents();
      }
      fetchAttendance();
    }
  }, [selectedCourse, selectedSemester, selectedDate]);

  const fetchCourses = async () => {
    try {
      const data = await api.courses.getAll();
      const enrolledCourses = profile?.role === 'student' 
        ? data.filter((c: any) => c.isEnrolled)
        : data;
      setCourses(enrolledCourses);
      
      if (enrolledCourses.length > 0) {
        setSelectedCourse(enrolledCourses[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchStudents = async () => {
    if (!selectedCourse) return;
    try {
      const data = await api.courses.getStudents(selectedCourse);
      setStudents(data);
      // Initialize attendance map with 'present' by default for new marking
      const initialMap: Record<string, 'present' | 'absent' | 'late'> = {};
      data.forEach((s: any) => {
        initialMap[s.uid] = 'present';
      });
      setAttendanceMap(initialMap);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const data = await api.attendance.get({
        courseId: selectedCourse || undefined,
        semester: selectedSemester,
        date: selectedDate
      });
      setAttendance(data);
      
      // If data exists, update the map for editing
      if (data.length > 0) {
        const existingMap: Record<string, 'present' | 'absent' | 'late'> = {};
        data.forEach((record: AttendanceType) => {
          existingMap[record.studentId] = record.status;
        });
        setAttendanceMap(prev => ({ ...prev, ...existingMap }));
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!selectedCourse || !selectedSemester || !selectedDate) return;
    setMarking(true);
    try {
      const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
        studentId,
        courseId: selectedCourse,
        date: selectedDate,
        status,
        semester: selectedSemester
      }));
      
      await api.attendance.mark(records);
      await fetchAttendance();
      alert('Attendance marked successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to mark attendance');
    } finally {
      setMarking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'absent': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'late': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle2 size={16} />;
      case 'absent': return <XCircle size={16} />;
      case 'late': return <Clock size={16} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Attendance Module</h1>
          <p className="text-slate-500">Track and manage student attendance</p>
        </div>
        {(profile?.role === 'teacher' || profile?.role === 'admin') && (
          <button
            onClick={handleMarkAttendance}
            disabled={marking || students.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {marking ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Attendance
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <Filter size={16} /> Course / Class
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {profile?.role === 'student' && <option value="">All Enrolled Courses</option>}
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.courseName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Semester</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
              <option key={sem} value={sem.toString()}>Semester {sem}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Attendance List (RecyclerView style) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {profile?.role === 'student' ? 'My Attendance' : 'Student List'}
          </h2>
          <div className="text-sm text-slate-500 font-medium">
            {profile?.role === 'student' ? (
              attendance.length > 0 ? `Status: ${attendance[0].status.toUpperCase()}` : 'No record for this date'
            ) : (
              `${students.length} Students Enrolled`
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {profile?.role === 'student' ? 'Course' : 'Student'}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {profile?.role === 'student' ? 'Instructor' : 'USN'}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                {(profile?.role === 'teacher' || profile?.role === 'admin') && (
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={32} />
                    <p className="text-slate-500 font-medium">Loading attendance records...</p>
                  </td>
                </tr>
              ) : profile?.role === 'student' ? (
                attendance.length > 0 ? (
                  attendance.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{record.courseName}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {courses.find(c => c.id === record.courseId)?.teacherName || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`mx-auto w-fit flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase ${getStatusColor(record.status)}`}>
                          {getStatusIcon(record.status)}
                          {record.status}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <AlertCircle className="mx-auto text-slate-200 mb-2" size={48} />
                      <p className="text-slate-400 font-medium">No attendance record found for this date.</p>
                    </td>
                  </tr>
                )
              ) : students.length > 0 ? (
                (() => {
                  const filtered = students.filter(s => s.semester === selectedSemester);
                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <p className="text-slate-400 font-medium">No students found for Semester {selectedSemester} in this course.</p>
                        </td>
                      </tr>
                    );
                  }
                  return filtered.map((student) => {
                    const currentStatus = attendanceMap[student.uid] || 'absent';
                    return (
                      <tr key={student.uid} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{student.name || student.fullName || 'Unknown'}</div>
                          <div className="text-xs text-slate-400">{student.email}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-sm">{student.usn || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <div className={`mx-auto w-fit flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase ${getStatusColor(currentStatus)}`}>
                            {getStatusIcon(currentStatus)}
                            {currentStatus}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setAttendanceMap(prev => ({ ...prev, [student.uid]: 'present' }))}
                              className={`p-2 rounded-lg transition-all ${currentStatus === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'}`}
                              title="Mark Present"
                            >
                              <UserCheck size={18} />
                            </button>
                            <button
                              onClick={() => setAttendanceMap(prev => ({ ...prev, [student.uid]: 'absent' }))}
                              className={`p-2 rounded-lg transition-all ${currentStatus === 'absent' ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500'}`}
                              title="Mark Absent"
                            >
                              <UserX size={18} />
                            </button>
                            <button
                              onClick={() => setAttendanceMap(prev => ({ ...prev, [student.uid]: 'late' }))}
                              className={`p-2 rounded-lg transition-all ${currentStatus === 'late' ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500'}`}
                              title="Mark Late"
                            >
                              <Clock size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <p className="text-slate-400 font-medium">No students enrolled in this course.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
