import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  increment,
  writeBatch,
  documentId
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL 
} from 'firebase/storage';
import { auth, db, storage } from './firebase';
import { signOut as firebaseSignOut, User } from 'firebase/auth';
import { Course, Material, Assignment, TimetableEntry, Notification, Submission, UserProfile } from './types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const api = {
  // Helper for file uploads
  async uploadFile(path: string, file: File, onProgress?: (progress: number) => void) {
    try {
      console.log(`Starting upload to ${path}/${file.name}...`);
      console.log(`File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Using storage bucket: ${storage.app.options.storageBucket}`);
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload progress: ${progress.toFixed(2)}%`);
            if (onProgress) onProgress(progress);
          },
          (error) => {
            console.error('Upload Task Error:', error);
            if (error.code === 'storage/retry-limit-exceeded') {
              reject(new Error('Upload timed out. Please check your internet connection and try again.'));
            } else {
              reject(error);
            }
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('Upload successful, URL:', url);
              resolve(url);
            } catch (urlErr) {
              console.error('Error getting download URL:', urlErr);
              reject(urlErr);
            }
          }
        );
      });
    } catch (error: any) {
      console.error('Upload Error:', error);
      throw error;
    }
  },

  auth: {
    async ensureAuth(): Promise<User> {
      if (auth.currentUser) return auth.currentUser;
      return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          if (user) resolve(user);
          else reject(new Error('User not authenticated'));
        });
        setTimeout(() => {
          unsubscribe();
          reject(new Error('Authentication timeout'));
        }, 3000);
      });
    },
    async me(): Promise<UserProfile | null> {
      try {
        const user = await api.auth.ensureAuth();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        return userDoc.exists() ? userDoc.data() as UserProfile : null;
      } catch (error) {
        console.warn('api.auth.me failed:', error);
        return null;
      }
    },
    async updateSemester(semester: string) {
      if (!auth.currentUser) return;
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { semester });
    },
    async logout() {
      await firebaseSignOut(auth);
      localStorage.removeItem('token');
    }
  },

  courses: {
    async getAll(): Promise<Course[]> {
      try {
        await api.auth.ensureAuth();
        const profile = await api.auth.me();
        const q = query(collection(db, 'courses'));
        const snapshot = await getDocs(q);
        const all = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Course))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (profile?.university) {
          return all.filter(c => !c.university || c.university === profile.university);
        }
        return all;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'courses');
        return [];
      }
    },
    async getEnrolled(): Promise<Course[]> {
      try {
        if (!auth.currentUser) return [];
        const q = query(collection(db, 'enrollments'), where('studentId', '==', auth.currentUser.uid));
        const snapshot = await getDocs(q);
        const courseIds = snapshot.docs.map(doc => doc.data().courseId);
        
        if (courseIds.length === 0) return [];
        
        const courses: Course[] = [];
        // Fetch each course individually to handle permission errors gracefully per document
        // (e.g. if a student is enrolled in a course from another university that they can no longer read)
        const fetchPromises = courseIds.map(async (id) => {
          try {
            const courseDoc = await getDoc(doc(db, 'courses', id));
            if (courseDoc.exists()) {
              return { id: courseDoc.id, ...courseDoc.data() } as Course;
            }
          } catch (e) {
            console.warn(`Failed to fetch course ${id}:`, e);
          }
          return null;
        });

        const results = await Promise.all(fetchPromises);
        return results.filter((c): c is Course => c !== null);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'enrollments/courses');
        return [];
      }
    },
    async enroll(courseId: string) {
      const user = await api.auth.ensureAuth();
      const id = `${user.uid}_${courseId}`;
      try {
        const profile = await api.auth.me();
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (!courseDoc.exists()) throw new Error('Course not found');
        const course = courseDoc.data() as Course;
        
        if (profile?.university && course.university && profile.university !== course.university) {
          throw new Error('You can only enroll in courses from your university');
        }

        // Check if already enrolled to avoid double increment
        const enrollmentDoc = await getDoc(doc(db, 'enrollments', id));
        if (enrollmentDoc.exists()) return;

        const batch = writeBatch(db);
        
        batch.set(doc(db, 'enrollments', id), {
          id,
          courseId,
          studentId: auth.currentUser.uid,
          enrolledAt: new Date().toISOString()
        });
        
        batch.update(doc(db, 'courses', courseId), {
          studentsCount: increment(1)
        });

        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `enrollments/${id}`);
        throw error;
      }
    },
    async unenroll(courseId: string) {
      const user = await api.auth.ensureAuth();
      const id = `${user.uid}_${courseId}`;
      try {
        const batch = writeBatch(db);
        
        batch.delete(doc(db, 'enrollments', id));
        
        batch.update(doc(db, 'courses', courseId), {
          studentsCount: increment(-1)
        });

        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `enrollments/${id}`);
        throw error;
      }
    },
    async getStudents(courseId: string): Promise<UserProfile[]> {
      const q = query(collection(db, 'enrollments'), where('courseId', '==', courseId));
      const snapshot = await getDocs(q);
      const studentIds = snapshot.docs.map(doc => doc.data().studentId);
      
      if (studentIds.length === 0) return [];
      
      const chunks = [];
      for (let i = 0; i < studentIds.length; i += 10) {
        chunks.push(studentIds.slice(i, i + 10));
      }
      
      const students: UserProfile[] = [];
      for (const chunk of chunks) {
        const studentsQ = query(collection(db, 'users'), where(documentId(), 'in', chunk));
        const studentsSnapshot = await getDocs(studentsQ);
        students.push(...studentsSnapshot.docs.map(doc => doc.data() as UserProfile));
      }
      
      return students;
    },
    async delete(id: string) {
      await deleteDoc(doc(db, 'courses', id));
    },
    async create(courseData: any): Promise<Course> {
      try {
        const profile = await api.auth.me();
        const id = Math.random().toString(36).substring(2, 15);
        const data = {
          ...courseData,
          id,
          teacherId: auth.currentUser?.uid,
          teacherName: auth.currentUser?.displayName || 'Teacher',
          university: profile?.university || null,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'courses', id), data);
        return data as Course;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'courses');
        throw error;
      }
    }
  },

  materials: {
    async getAll(): Promise<Material[]> {
      try {
        const profile = await api.auth.me();
        const q = query(collection(db, 'materials'));
        const snapshot = await getDocs(q);
        const all = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Material))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (profile?.university) {
          return all.filter(m => !m.university || m.university === profile.university);
        }
        return all;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'materials');
        return [];
      }
    },
    async upload(formData: FormData, onProgress?: (progress: number) => void): Promise<Material> {
      console.log('Uploading material...', Object.fromEntries(formData.entries()));
      try {
        await api.auth.ensureAuth();
        const profile = await api.auth.me();
        // Temporarily allow all authenticated users to upload for debugging
        // if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
        //   throw new Error('Only teachers and admins can upload materials');
        // }

        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const courseId = formData.get('courseId') as string;
        const file = formData.get('file') as File;
        
        let fileUrl = '';
        if (file) {
          try {
            console.log('Uploading material file to Storage:', file.name);
            fileUrl = await api.uploadFile('materials', file, onProgress);
          } catch (storageErr: any) {
            console.error('Storage Error in material upload:', storageErr);
            throw new Error(`File upload failed: ${storageErr.message || 'Permission denied'}`);
          }
        }

        const id = Math.random().toString(36).substring(2, 15);
        const data = {
          id,
          title,
          description,
          courseId,
          teacherId: auth.currentUser?.uid,
          university: profile?.university || null,
          fileUrl,
          fileName: file?.name || '',
          fileType: file?.type || '',
          createdAt: new Date().toISOString()
        };
        console.log('Creating material document in Firestore:', data);
        await setDoc(doc(db, 'materials', id), data);
        console.log('Material upload successful');
        return data as Material;
      } catch (error) {
        console.error('Material Upload Error:', error);
        if (error instanceof Error && error.message.includes('File upload failed')) {
          throw error;
        }
        handleFirestoreError(error, OperationType.WRITE, 'materials');
        throw error;
      }
    }
  },

  assignments: {
    async getAll(): Promise<Assignment[]> {
      try {
        const profile = await api.auth.me();
        const q = query(collection(db, 'assignments'));
        const snapshot = await getDocs(q);
        const all = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Assignment))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (profile?.university) {
          return all.filter(a => !a.university || a.university === profile.university);
        }
        return all;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'assignments');
        return [];
      }
    },
    async create(formData: FormData, onProgress?: (progress: number) => void): Promise<Assignment> {
      console.log('Creating assignment...', Object.fromEntries(formData.entries()));
      try {
        await api.auth.ensureAuth();
        const profile = await api.auth.me();
        // Temporarily allow all authenticated users to create for debugging
        // if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
        //   throw new Error('Only teachers and admins can create assignments');
        // }

        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const deadline = formData.get('deadline') as string;
        const courseId = formData.get('courseId') as string;
        const file = formData.get('file') as File;
        
        let fileUrl = '';
        if (file) {
          try {
            console.log('Uploading assignment file to Storage:', file.name);
            fileUrl = await api.uploadFile('assignments', file, onProgress);
          } catch (storageErr: any) {
            console.error('Storage Error in assignment create:', storageErr);
            throw new Error(`File upload failed: ${storageErr.message || 'Permission denied'}`);
          }
        }

        const id = Math.random().toString(36).substring(2, 15);
        const data = {
          id,
          title,
          description,
          deadline,
          courseId,
          teacherId: auth.currentUser?.uid,
          university: profile?.university || null,
          fileUrl,
          fileName: file?.name || '',
          createdAt: new Date().toISOString()
        };
        console.log('Creating assignment document in Firestore:', data);
        await setDoc(doc(db, 'assignments', id), data);
        console.log('Assignment creation successful');
        return data as Assignment;
      } catch (error) {
        console.error('Assignment Creation Error:', error);
        if (error instanceof Error && error.message.includes('File upload failed')) {
          throw error;
        }
        handleFirestoreError(error, OperationType.WRITE, 'assignments');
        throw error;
      }
    }
  },

  timetable: {
    async getAll(): Promise<TimetableEntry[]> {
      try {
        await api.auth.ensureAuth();
        const profile = await api.auth.me();
        const q = query(collection(db, 'timetable'));
        const snapshot = await getDocs(q);
        const all = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as TimetableEntry))
          .sort((a, b) => {
            const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
            if (dayDiff !== 0) return dayDiff;
            return a.startTime.localeCompare(b.startTime);
          });
        if (profile?.university) {
          return all.filter(t => !t.university || t.university === profile.university);
        }
        return all;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'timetable');
        return [];
      }
    },
    async create(formData: FormData, onProgress?: (progress: number) => void): Promise<TimetableEntry> {
      try {
        await api.auth.ensureAuth();
        const profile = await api.auth.me();
        const courseId = formData.get('courseId') as string;
        const day = formData.get('day') as string;
        const startTime = formData.get('startTime') as string;
        const endTime = formData.get('endTime') as string;
        const teacherName = formData.get('teacherName') as string;
        const file = formData.get('file') as File;

        let fileUrl = '';
        if (file) {
          fileUrl = await api.uploadFile('timetable', file, onProgress);
        }

        const id = Math.random().toString(36).substring(2, 15);
        const timetableData = {
          id,
          courseId,
          day,
          startTime,
          endTime,
          teacherName,
          fileUrl,
          fileName: file?.name || '',
          teacherId: auth.currentUser?.uid,
          university: profile?.university || null,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'timetable', id), timetableData);
        return timetableData as TimetableEntry;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'timetable');
        throw error;
      }
    },
    async delete(id: string) {
      await deleteDoc(doc(db, 'timetable', id));
    }
  },

  notifications: {
    async getAll(semester?: string): Promise<Notification[]> {
      try {
        const profile = await api.auth.me();
        const q = query(collection(db, 'notifications'));
        const snapshot = await getDocs(q);
        let results = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Notification))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        if (profile?.university) {
          results = results.filter(n => !n.university || n.university === profile.university);
        }

        if (semester) {
          results = results.filter(n => !n.semester || n.semester === 'all' || n.semester === semester);
        }
        
        return results;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
        return [];
      }
    },
    async create(formData: FormData, onProgress?: (progress: number) => void): Promise<Notification> {
      try {
        await api.auth.ensureAuth();
        const profile = await api.auth.me();
        const title = formData.get('title') as string;
        const message = formData.get('message') as string;
        const courseId = formData.get('courseId') as string;
        const semester = formData.get('semester') as string;
        const file = formData.get('file') as File;

        let fileUrl = '';
        let fileName = '';
        if (file) {
          fileUrl = await api.uploadFile('notifications', file, onProgress);
          fileName = file.name;
        }

        const id = Math.random().toString(36).substring(2, 15);
        const notificationData = {
          id,
          title,
          message,
          courseId: courseId || null,
          semester: semester || 'all',
          userId: auth.currentUser?.uid,
          teacherId: auth.currentUser?.uid,
          university: profile?.university || null,
          fileUrl,
          fileName,
          timestamp: new Date().toISOString()
        };
        await setDoc(doc(db, 'notifications', id), notificationData);
        return notificationData as Notification;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'notifications');
        throw error;
      }
    },
    async delete(id: string) {
      await deleteDoc(doc(db, 'notifications', id));
    }
  },

  submissions: {
    async getAll(): Promise<Submission[]> {
      try {
        const q = query(collection(db, 'submissions'));
        const snapshot = await getDocs(q);
        return snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Submission))
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'submissions');
        return [];
      }
    },
    async getForStudent(studentId: string): Promise<Submission[]> {
      try {
        const q = query(collection(db, 'submissions'), where('studentId', '==', studentId));
        const snapshot = await getDocs(q);
        return snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Submission))
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'submissions');
        return [];
      }
    },
    async submit(formData: FormData, onProgress?: (progress: number) => void): Promise<Submission> {
      console.log('Submitting assignment...', Object.fromEntries(formData.entries()));
      try {
        await api.auth.ensureAuth();
        const profile = await api.auth.me();
        
        const assignmentId = formData.get('assignmentId') as string;
        const file = formData.get('file') as File;
        
        let fileUrl = '';
        if (file) {
          try {
            console.log('Uploading submission file:', file.name);
            fileUrl = await api.uploadFile('submissions', file, onProgress);
          } catch (storageErr: any) {
            console.error('Storage Error in submit:', storageErr);
            throw new Error(`File upload failed: ${storageErr.message || 'Permission denied'}`);
          }
        }

        const id = Math.random().toString(36).substring(2, 15);
        const data = {
          id,
          assignmentId,
          studentId: auth.currentUser?.uid,
          studentName: profile?.name || 'Anonymous',
          fileUrl,
          fileName: file?.name || '',
          submittedAt: new Date().toISOString()
        };
        console.log('Creating submission document in Firestore:', data);
        await setDoc(doc(db, 'submissions', id), data);
        console.log('Submission successful');
        return data as Submission;
      } catch (error) {
        console.error('Submission Error:', error);
        if (error instanceof Error && error.message.includes('File upload failed')) {
          throw error;
        }
        handleFirestoreError(error, OperationType.WRITE, 'submissions');
        throw error;
      }
    }
  },

  attendance: {
    async get(filters: { courseId?: string; semester?: string; date?: string } = {}) {
      try {
        await api.auth.ensureAuth();
        const profile = await api.auth.me();
        let q = query(collection(db, 'attendance'));
        if (filters.courseId) q = query(q, where('courseId', '==', filters.courseId));
        if (filters.semester) q = query(q, where('semester', '==', filters.semester));
        if (filters.date) q = query(q, where('date', '==', filters.date));
        
        const snapshot = await getDocs(q);
        let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (profile?.university) {
          results = results.filter((r: any) => !r.university || r.university === profile.university);
        }

        return results;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'attendance');
        return [];
      }
    },
    async mark(records: any[]) {
      try {
        await api.auth.ensureAuth();
        const profile = await api.auth.me();
        const batch = records.map(record => {
          const id = `${record.studentId}_${record.courseId}_${record.date}`;
          return setDoc(doc(db, 'attendance', id), {
            ...record,
            id,
            university: profile?.university || null,
            recordedAt: new Date().toISOString()
          });
        });
        await Promise.all(batch);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'attendance');
        throw error;
      }
    }
  },

  teacher: {
    async getStats() {
      if (!auth.currentUser) return { totalCourses: 0, totalStudents: 0, pendingSubmissions: 0 };
      const statsDoc = await getDoc(doc(db, 'teacherStats', auth.currentUser.uid));
      if (statsDoc.exists()) return statsDoc.data();
      
      // Default stats if not found
      return { totalCourses: 0, totalStudents: 0, pendingSubmissions: 0 };
    },
    async updateStats(stats: any) {
      if (!auth.currentUser) return;
      await setDoc(doc(db, 'teacherStats', auth.currentUser.uid), stats, { merge: true });
    }
  },
  admin: {
    async getUsers(): Promise<UserProfile[]> {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        return snapshot.docs.map(doc => doc.data() as UserProfile);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
        return [];
      }
    },
    async deleteUser(uid: string) {
      await deleteDoc(doc(db, 'users', uid));
    }
  }
};
