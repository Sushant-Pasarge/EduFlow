import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../App';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  Users, 
  BookOpen, 
  Settings, 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Search,
  Mail,
  School,
  GraduationCap,
  Database,
  Table as TableIcon,
  ChevronRight,
  RefreshCw,
  Bell,
  Calendar,
  Plus,
  X,
  Loader2,
  Clock,
  ChevronDown,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'database' | 'notifications' | 'timetable' | 'courses' | 'materials'>('users');
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddNotifModalOpen, setIsAddNotifModalOpen] = useState(false);
  const [isAddTimetableModalOpen, setIsAddTimetableModalOpen] = useState(false);
  const { profile } = useAuth();

  // Add User Form State
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student' as 'student' | 'teacher' | 'admin',
    university: 'R R Institute of Technology',
    usn: ''
  });

  // Notification Form State
  const [newNotif, setNewNotif] = useState({
    title: '',
    message: '',
    courseId: '',
    semester: 'all',
    file: null as File | null
  });

  // Timetable Form State
  const [newTimetable, setNewTimetable] = useState({
    courseId: '',
    day: 'Monday',
    startTime: '',
    endTime: '',
    file: null as File | null
  });

  const [courses, setCourses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);

  const [materials, setMaterials] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchTables();
    fetchCourses();
    fetchNotifications();
    fetchTimetable();
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await api.materials.getAll();
      setMaterials(response);
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.admin.getUsers();
      setUsers(response);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      // In Firebase, we list our collections
      setTables([
        { name: 'users', count: users.length },
        { name: 'courses', count: courses.length },
        { name: 'materials', count: materials.length },
        { name: 'notifications', count: notifications.length },
        { name: 'timetable', count: timetable.length },
        { name: 'enrollments', count: 0 },
        { name: 'attendance', count: 0 }
      ]);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await api.courses.getAll();
      setCourses(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await api.notifications.getAll();
      setNotifications(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTimetable = async () => {
    try {
      const data = await api.timetable.getAll();
      setTimetable(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTableData = async (tableName: string) => {
    setDbLoading(true);
    setSelectedTable(tableName);
    try {
      let data = [];
      if (tableName === 'users') data = users;
      else if (tableName === 'courses') data = courses;
      else if (tableName === 'materials') data = materials;
      else if (tableName === 'notifications') data = notifications;
      else if (tableName === 'timetable') data = timetable;
      
      setTableData(data);
    } catch (error) {
      console.error(`Failed to fetch data for ${tableName}:`, error);
    } finally {
      setDbLoading(false);
    }
  };

  const deleteUser = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await api.admin.deleteUser(uid);
      setUsers(users.filter(u => u.uid !== uid));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('An error occurred while deleting the user');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create a secondary app to create user without signing out current admin
      const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        newUser.email, 
        newUser.password
      );
      const user = userCredential.user;

      const userData = {
        uid: user.uid,
        email: newUser.email.toLowerCase(),
        name: newUser.fullName,
        role: newUser.role,
        university: newUser.university,
        usn: newUser.role === 'student' ? newUser.usn.toUpperCase() : null,
        semester: null,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      await deleteApp(secondaryApp);

      setIsAddUserModalOpen(false);
      setNewUser({
        email: '',
        password: '',
        fullName: '',
        role: 'student',
        university: 'R R Institute of Technology',
        usn: ''
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to add user:', error);
      alert(error.message || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNotif = async (e: React.FormEvent) => {
    e.preventDefault();
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

      await api.notifications.create(formData);

      setIsAddNotifModalOpen(false);
      setNewNotif({ title: '', message: '', courseId: '', semester: 'all', file: null });
      fetchNotifications();
    } catch (error: any) {
      alert(error.message || 'Failed to post notification');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('courseId', newTimetable.courseId);
      formData.append('day', newTimetable.day);
      formData.append('startTime', newTimetable.startTime);
      formData.append('endTime', newTimetable.endTime);
      formData.append('teacherName', profile?.name || 'Admin');
      if (newTimetable.file) {
        formData.append('file', newTimetable.file);
      }

      await api.timetable.create(formData);

      setIsAddTimetableModalOpen(false);
      setNewTimetable({ courseId: '', day: 'Monday', startTime: '', endTime: '', file: null });
      fetchTimetable();
    } catch (error: any) {
      alert(error.message || 'Failed to add timetable entry');
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      await api.notifications.delete(id);
      fetchNotifications();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const deleteTimetableEntry = async (id: string) => {
    if (!window.confirm('Delete this timetable entry?')) return;
    try {
      await api.timetable.delete(id);
      fetchTimetable();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!window.confirm('Delete this material?')) return;
    try {
      const response = await fetch(`/api/materials/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) fetchMaterials();
      else alert('Failed to delete material');
    } catch (error) {
      console.error(error);
    }
  };

  const deleteCourse = async (id: string) => {
    if (!window.confirm('Delete this course? This will affect all related materials and assignments.')) return;
    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) fetchCourses();
      else alert('Failed to delete course');
    } catch (error) {
      console.error(error);
    }
  };

  const filteredUsers = users.filter(user => {
    const userName = user.name || user.fullName || '';
    const userEmail = user.email || '';
    const userUsn = user.usn || '';

    const matchesSearch = 
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userUsn.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSemester = semesterFilter === 'all' || user.semester === semesterFilter;
    
    return matchesSearch && matchesSemester;
  });

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldCheck size={64} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-slate-500">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Control Panel</h1>
          <p className="text-slate-500">Manage users, roles, and system settings</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAddUserModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <UserPlus size={20} />
            Add User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{users.length}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Users</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{courses.length}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Courses</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{materials.length}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Materials</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
              <Bell size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{notifications.length}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Notifs</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{timetable.length}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Schedule</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center">
              <RefreshCw size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{tables.length}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Tables</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={18} />
            User Management
          </div>
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'database' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database size={18} />
            Database Explorer
          </div>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'notifications' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell size={18} />
            Notifications
          </div>
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'timetable' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar size={18} />
            Timetable
          </div>
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'courses' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={18} />
            Courses
          </div>
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'materials' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database size={18} />
            Materials
          </div>
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-bottom border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900">User Management</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative w-full md:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  value={semesterFilter}
                  onChange={(e) => setSemesterFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                >
                  <option value="all">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem.toString()}>Semester {sem}</option>
                  ))}
                </select>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm font-semibold">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">University / USN</th>
                  <th className="px-6 py-4 text-center">Semester</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No users found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
                            {(user.name || user.fullName || 'U').charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{user.name || user.fullName || 'Unknown'}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail size={12} />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          user.role === 'admin' ? 'bg-red-50 text-red-600' :
                          user.role === 'teacher' ? 'bg-orange-50 text-orange-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700">{user.university}</div>
                        {user.usn && (
                          <div className="text-xs font-mono text-indigo-600 font-bold">{user.usn}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {user.semester ? (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">
                            Sem {user.semester}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs italic">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                            <Settings size={18} />
                          </button>
                          <button 
                            onClick={() => deleteUser(user.uid)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <TableIcon size={18} />
                  Tables
                </h3>
                <button onClick={fetchTables} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                  <RefreshCw size={16} />
                </button>
              </div>
              <div className="p-2">
                {tables.map((table) => (
                  <button
                    key={table.name}
                    onClick={() => fetchTableData(table.name)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      selectedTable === table.name ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {table.name}
                    <ChevronRight size={16} className={selectedTable === table.name ? 'opacity-100' : 'opacity-0'} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
              {!selectedTable ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                  <Database size={48} className="mb-4 opacity-20" />
                  <p>Select a table to view its data</p>
                </div>
              ) : (
                <>
                  <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <TableIcon size={18} />
                      {selectedTable}
                      <span className="text-xs font-normal text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        {tableData.length} rows
                      </span>
                    </h3>
                    <button 
                      onClick={() => fetchTableData(selectedTable)} 
                      className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      <RefreshCw size={14} className={dbLoading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    {dbLoading ? (
                      <div className="py-20 text-center text-slate-400">Loading data...</div>
                    ) : tableData.length === 0 ? (
                      <div className="py-20 text-center text-slate-400">Table is empty</div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            {Object.keys(tableData[0]).map((key) => (
                              <th key={key} className="px-6 py-3 border-b border-slate-100">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tableData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              {Object.values(row).map((val: any, j) => (
                                <td key={j} className="px-6 py-4 text-xs text-slate-600 font-mono truncate max-w-[200px]">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">System Notifications</h2>
            <button 
              onClick={() => setIsAddNotifModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              <Plus size={20} />
              Post Notification
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-12 text-center text-slate-400">No notifications found</div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bell size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-900">{notif.title}</h3>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{new Date(notif.createdAt || notif.timestamp).toLocaleDateString()}</span>
                          <button 
                            onClick={() => deleteNotification(notif.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-600 text-sm">{notif.message}</p>
                      {notif.fileUrl && (
                        <div className="mt-2">
                          <a 
                            href={notif.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            <BookOpen size={12} />
                            View Attachment
                          </a>
                        </div>
                      )}
                      {notif.courseName && (
                        <div className="mt-2 inline-block px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase">
                          {notif.courseName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'timetable' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">System Timetable</h2>
            <button 
              onClick={() => setIsAddTimetableModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              <Plus size={20} />
              Add Entry
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm font-semibold">
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Day</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Teacher</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timetable.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No timetable entries found</td>
                  </tr>
                ) : (
                  timetable.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{entry.courseName || 'Unknown Course'}</div>
                        {entry.fileUrl && (
                          <a 
                            href={entry.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-1"
                          >
                            <Clock size={10} />
                            View Schedule
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{entry.day}</td>
                      <td className="px-6 py-4 text-slate-600">{entry.startTime} - {entry.endTime}</td>
                      <td className="px-6 py-4 text-slate-600">{entry.teacherName}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => deleteTimetableEntry(entry.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Materials Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm font-semibold">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No materials found</td>
                  </tr>
                ) : (
                  materials.map((material) => (
                    <tr key={material.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{material.title}</div>
                        <div className="text-xs text-slate-400">{material.fileName}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{material.courseName || material.courseId}</td>
                      <td className="px-6 py-4 text-slate-600">{material.fileType}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => deleteMaterial(material.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'courses' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm font-semibold">
                  <th className="px-6 py-4">Course Name</th>
                  <th className="px-6 py-4">Teacher</th>
                  <th className="px-6 py-4">Students</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No courses found</td>
                  </tr>
                ) : (
                  courses.map((course) => (
                    <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{course.courseName}</td>
                      <td className="px-6 py-4 text-slate-600">{course.teacherName}</td>
                      <td className="px-6 py-4 text-slate-600">{course.studentsCount}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => deleteCourse(course.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AnimatePresence>
        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <h3 className="text-xl font-bold">Add New User</h3>
                <button onClick={() => setIsAddUserModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {newUser.role === 'student' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">USN</label>
                      <input
                        type="text"
                        required
                        value={newUser.usn}
                        onChange={(e) => setNewUser({ ...newUser, usn: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="1RR20CS001"
                      />
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                  Create User
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Notification Modal */}
      <AnimatePresence>
        {isAddNotifModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-orange-600 text-white">
                <h3 className="text-xl font-bold">Post Notification</h3>
                <button onClick={() => setIsAddNotifModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddNotif} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={newNotif.title}
                    onChange={(e) => setNewNotif({ ...newNotif, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Enter notification title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Message</label>
                  <textarea
                    required
                    value={newNotif.message}
                    onChange={(e) => setNewNotif({ ...newNotif, message: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                    placeholder="Enter message details"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Course (Optional)</label>
                  <select
                    value={newNotif.courseId}
                    onChange={(e) => setNewNotif({ ...newNotif, courseId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">All Courses</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.courseName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Target Semester</label>
                  <select
                    value={newNotif.semester}
                    onChange={(e) => setNewNotif({ ...newNotif, semester: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="all">All Semesters</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem.toString()}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Attachment (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setNewNotif({ ...newNotif, file: e.target.files?.[0] || null })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Bell size={20} />}
                  Post Announcement
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Timetable Modal */}
      <AnimatePresence>
        {isAddTimetableModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-purple-600 text-white">
                <h3 className="text-xl font-bold">Add Timetable Entry</h3>
                <button onClick={() => setIsAddTimetableModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddTimetable} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Course</label>
                  <select
                    required
                    value={newTimetable.courseId}
                    onChange={(e) => setNewTimetable({ ...newTimetable, courseId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Course</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.courseName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Day</label>
                  <select
                    value={newTimetable.day}
                    onChange={(e) => setNewTimetable({ ...newTimetable, day: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      required
                      value={newTimetable.startTime}
                      onChange={(e) => setNewTimetable({ ...newTimetable, startTime: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">End Time</label>
                    <input
                      type="time"
                      required
                      value={newTimetable.endTime}
                      onChange={(e) => setNewTimetable({ ...newTimetable, endTime: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Attachment (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setNewTimetable({ ...newTimetable, file: e.target.files?.[0] || null })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                  Add to Timetable
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
