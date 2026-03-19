import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';
import { Course, Assignment, Notification, TimetableEntry, Attendance, Submission } from '../types';
import { BookOpen, FileText, Bell, Clock, ChevronRight, GraduationCap, UserCheck, UserX, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    
    // Fetch All Courses
    try {
      const allCourses = await api.courses.getAll();
      const enrolledCourses = await api.courses.getEnrolled();
      const enrolledIds = new Set(enrolledCourses.map(c => c.id));
      setCourses(enrolledCourses);
      
      // Show some courses to explore, including their enrollment status
      const explore = allCourses.map(c => ({
        ...c,
        isEnrolled: enrolledIds.has(c.id)
      })).slice(0, 4);
      setAvailableCourses(explore);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }

    // Fetch Assignments
    try {
      const allAssignments = await api.assignments.getAll();
      setUpcomingAssignments(allAssignments.slice(0, 5));
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }

    // Fetch Submissions
    try {
      const allSubmissions = await api.submissions.getForStudent(profile.uid);
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }

    // Fetch Notifications
    try {
      const allNotifications = await api.notifications.getAll(profile.semester);
      setNotifications(allNotifications.slice(0, 5));
      const lastViewed = localStorage.getItem(`lastViewedNotifs_${profile.uid}`) || '0';
      const unread = allNotifications.filter(n => new Date(n.timestamp).getTime() > parseInt(lastViewed)).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }

    // Fetch Timetable
    try {
      const allTimetable = await api.timetable.getAll();
      setTimetable(allTimetable);
    } catch (error) {
      console.error('Error fetching timetable:', error);
    }

    // Fetch Attendance
    try {
      const attendanceData = await api.attendance.get({
        semester: profile.semester || '1'
      });
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);

  const handleEnroll = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    setEnrollingId(courseId);
    
    // Optimistic update
    setAvailableCourses(prev => prev.map(c => c.id === courseId ? { ...c, isEnrolled: true } : c));
    
    try {
      await api.courses.enroll(courseId);
      await fetchData();
    } catch (error) {
      console.error(error);
      // Rollback
      setAvailableCourses(prev => prev.map(c => c.id === courseId ? { ...c, isEnrolled: false } : c));
    } finally {
      setEnrollingId(null);
    }
  };

  const handleUnenroll = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    setUnenrollingId(courseId);
    
    // Optimistic update
    setAvailableCourses(prev => prev.map(c => c.id === courseId ? { ...c, isEnrolled: false } : c));
    setCourses(prev => prev.filter(c => c.id !== courseId));
    
    try {
      await api.courses.unenroll(courseId);
      await fetchData();
    } catch (error) {
      console.error(error);
      // Refresh to original state
      fetchData();
    } finally {
      setUnenrollingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome, {profile?.name}!</h1>
          <p className="text-slate-500 mt-1">Ready to learn something new today?</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student ID</p>
            <p className="text-sm font-bold text-slate-900">#STU-{profile?.uid.slice(0, 6).toUpperCase()}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Courses & Assignments */}
        <div className="lg:col-span-2 space-y-8">
          {/* Courses Grid */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Your Courses</h2>
              <Link to="/courses" className="text-sm font-bold text-indigo-600 hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.length > 0 ? courses.map(course => (
                <div 
                  key={course.id} 
                  onClick={() => navigate(`/materials?courseId=${course.id}`)}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <BookOpen size={24} />
                    </div>
                    <button 
                      onClick={(e) => handleUnenroll(e, course.id)}
                      disabled={unenrollingId === course.id}
                      className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {unenrollingId === course.id ? (
                        <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : null}
                      {unenrollingId === course.id ? 'Unenrolling...' : 'Unenroll'}
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{course.courseName}</h3>
                  <p className="text-sm text-slate-500 mt-1">Instructor: {course.teacherName}</p>
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">
                      {course.materialCount || 0} {course.materialCount === 1 ? 'Module' : 'Modules'}
                    </span>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                </div>
              )) : (
                <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
                  <p className="text-slate-400 font-medium mb-4">No courses enrolled yet.</p>
                  <Link 
                    to="/courses" 
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100"
                  >
                    <BookOpen size={20} />
                    Discover Courses
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Explore Courses */}
          {availableCourses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Explore Courses</h2>
                <Link to="/courses" className="text-sm font-bold text-indigo-600 hover:underline">View All</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableCourses.map(course => (
                  <div 
                    key={course.id} 
                    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <BookOpen size={24} />
                      </div>
                      {course.isEnrolled ? (
                        <button 
                          onClick={(e) => handleUnenroll(e, course.id)}
                          disabled={unenrollingId === course.id}
                          className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {unenrollingId === course.id ? (
                            <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : null}
                          {unenrollingId === course.id ? 'Unenrolling...' : 'Unenroll'}
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => handleEnroll(e, course.id)}
                          disabled={enrollingId === course.id}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {enrollingId === course.id ? (
                            <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          ) : null}
                          {enrollingId === course.id ? 'Enrolling...' : 'Enroll Now'}
                        </button>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900">{course.courseName}</h3>
                    <p className="text-sm text-slate-500 mt-1">Instructor: {course.teacherName}</p>
                    <div className="mt-4 pt-4 border-t border-slate-50">
                      <p className="text-xs text-slate-400 line-clamp-2">{course.description || 'No description available.'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Assignments */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Upcoming Assignments</h2>
              <Link to="/assignments" className="text-sm font-bold text-indigo-600 hover:underline">View All</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {upcomingAssignments.length > 0 ? upcomingAssignments.map(assignment => (
                <div key={assignment.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{assignment.title}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1.5">
                        <Clock size={14} />
                        Due: {format(new Date(assignment.deadline), 'MMM dd, hh:mm a')}
                      </p>
                    </div>
                  </div>
                  {submissions.some(s => s.assignmentId === assignment.id) ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-lg">
                      <CheckCircle size={16} />
                      <span>Submitted</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => navigate('/assignments', { state: { submitAssignmentId: assignment.id } })}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                      Submit
                    </button>
                  )}
                </div>
              )) : (
                <div className="p-10 text-center">
                  <p className="text-slate-400">No pending assignments. Great job!</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Notifications & Timetable Preview */}
        <div className="space-y-8">
          {/* Notifications */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
              <Link 
                to="/notifications" 
                className="relative text-slate-400 hover:text-indigo-600 transition-colors"
                onClick={() => {
                  localStorage.setItem(`lastViewedNotifs_${profile?.uid}`, Date.now().toString());
                  setUnreadCount(0);
                }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
            <div className="p-6 space-y-6">
              {notifications.length > 0 ? notifications.map(notif => (
                <div key={notif.id} className="flex gap-4">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{notif.title}</h4>
                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">{notif.message}</p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-2 block">
                      {format(new Date(notif.timestamp), 'hh:mm a')}
                    </span>
                  </div>
                </div>
              )) : (
                <p className="text-slate-400 text-center py-4">No new notifications.</p>
              )}
            </div>
          </section>

          {/* Quick Timetable Preview */}
          <section className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Today's Schedule</h2>
              <Clock size={20} className="opacity-60" />
            </div>
            <div className="space-y-4">
              {timetable.length > 0 ? timetable.slice(0, 2).map(entry => (
                <div key={entry.id} className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                  <p className="text-xs font-bold text-white/60 uppercase">{entry.startTime} - {entry.endTime}</p>
                  <p className="font-bold mt-1">{entry.courseName || 'Class'}</p>
                  <p className="text-sm text-white/80">{entry.day}</p>
                </div>
              )) : (
                <p className="text-sm text-white/60 text-center py-4">No classes scheduled for today.</p>
              )}
            </div>
            <Link to="/timetable" className="block text-center mt-6 text-sm font-bold hover:underline">
              View Full Timetable
            </Link>
          </section>

          {/* Attendance Summary */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Attendance</h2>
              <Link to="/attendance" className="text-sm font-bold text-indigo-600 hover:underline">Details</Link>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-emerald-600">
                    {attendance.filter(a => a.status === 'present').length}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Present</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-rose-600">
                    {attendance.filter(a => a.status === 'absent').length}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Absent</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Records</p>
                {attendance.slice(0, 3).map(record => (
                  <div key={record.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 truncate max-w-[120px]">{record.courseName}</span>
                    <div className={`flex items-center gap-1 font-bold ${record.status === 'present' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {record.status === 'present' ? <UserCheck size={14} /> : <UserX size={14} />}
                      {format(new Date(record.date), 'MMM dd')}
                    </div>
                  </div>
                ))}
                {attendance.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-2">No attendance records yet.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
