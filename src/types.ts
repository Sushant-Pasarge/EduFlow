export type UserRole = 'teacher' | 'student' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  university?: string;
  usn?: string;
  semester?: string;
  createdAt: string;
}

export interface Course {
  id: string;
  courseName: string;
  description: string;
  teacherId: string;
  teacherName: string;
  university?: string;
  materialCount?: number;
  isEnrolled?: boolean;
  createdAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  deadline: string;
  university?: string;
  fileUrl?: string;
  fileName?: string;
  courseId: string;
  teacherId: string;
  createdAt: string;
  submissionCount?: number;
  totalStudents?: number;
}

export interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  assignmentId: string;
  courseId: string;
  fileUrl: string;
  fileName: string;
  submittedAt: string;
  feedback?: string;
  grade?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  courseId?: string;
  teacherId?: string;
  semester?: string;
  university?: string;
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
}

export interface Material {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  courseId: string;
  teacherId: string;
  university?: string;
  createdAt: string;
}

export interface TimetableEntry {
  id: string;
  courseId: string;
  courseName?: string;
  day: string;
  startTime: string;
  endTime: string;
  teacherId: string;
  university?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName?: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  semester: string;
  markedBy: string;
  university?: string;
  createdAt: string;
}
