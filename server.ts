import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'eduflow-secret-key-123';
const PORT = 3000;

// Initialize Database
const db = new Database('eduflow.db');
db.pragma('journal_mode = WAL');

// Migration: Add usn column if it doesn't exist
try {
  db.prepare('ALTER TABLE users ADD COLUMN usn TEXT').run();
  db.prepare('CREATE UNIQUE INDEX idx_users_usn ON users(usn)').run();
} catch (e) {
  // Column or index probably already exists
}

// Migration: Add columns to timetable if they don't exist
try {
  db.prepare('ALTER TABLE timetable ADD COLUMN courseId TEXT').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE timetable ADD COLUMN fileUrl TEXT').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE timetable ADD COLUMN fileName TEXT').run();
} catch (e) {}

// Migration: Add columns to notifications if they don't exist
try {
  db.prepare('ALTER TABLE notifications ADD COLUMN courseId TEXT').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE notifications ADD COLUMN fileUrl TEXT').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE notifications ADD COLUMN fileName TEXT').run();
} catch (e) {}

// Migration: Add semester column to users if it doesn't exist
try {
  db.prepare('ALTER TABLE users ADD COLUMN semester TEXT').run();
} catch (e) {}

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    fullName TEXT,
    role TEXT,
    university TEXT,
    usn TEXT UNIQUE,
    semester TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    courseName TEXT,
    description TEXT,
    teacherId TEXT,
    teacherName TEXT,
    studentsCount INTEGER DEFAULT 0,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    deadline TEXT,
    courseId TEXT,
    teacherId TEXT,
    fileUrl TEXT,
    fileName TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    courseId TEXT,
    teacherId TEXT,
    fileUrl TEXT,
    fileName TEXT,
    fileType TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    assignmentId TEXT,
    studentId TEXT,
    studentName TEXT,
    fileUrl TEXT,
    fileName TEXT,
    submittedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    courseId TEXT,
    studentId TEXT,
    enrolledAt TEXT,
    UNIQUE(courseId, studentId)
  );

  CREATE TABLE IF NOT EXISTS timetable (
    id TEXT PRIMARY KEY,
    day TEXT,
    startTime TEXT,
    endTime TEXT,
    subject TEXT,
    room TEXT,
    teacherName TEXT,
    userId TEXT,
    courseId TEXT,
    fileUrl TEXT,
    fileName TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT,
    message TEXT,
    type TEXT,
    userId TEXT,
    courseId TEXT,
    fileUrl TEXT,
    fileName TEXT,
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    studentId TEXT,
    courseId TEXT,
    date TEXT,
    status TEXT,
    semester TEXT,
    markedBy TEXT,
    createdAt TEXT,
    UNIQUE(studentId, courseId, date)
  );
`);

// Migration: Add university and usn columns to users if they don't exist
try {
  db.prepare("ALTER TABLE users ADD COLUMN university TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN usn TEXT").run();
} catch (e) {}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ storage });

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(uploadsDir));

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, fullName, role, university, usn } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const uid = crypto.randomUUID();

    try {
      // Check if USN already exists for students
      const normalizedUsn = (usn && usn.trim() !== '') ? usn.toUpperCase() : null;
      if (role === 'student' && normalizedUsn) {
        const existingUsn = db.prepare('SELECT uid FROM users WHERE usn = ?').get(normalizedUsn);
        if (existingUsn) {
          return res.status(400).json({ error: 'USN already registered' });
        }
      }

      const createdAt = new Date().toISOString();
      const stmt = db.prepare('INSERT INTO users (uid, email, password, fullName, role, university, usn, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(uid, email.toLowerCase(), hashedPassword, fullName, role, university, normalizedUsn, createdAt);
      
      const token = jwt.sign({ uid, email: email.toLowerCase(), role }, JWT_SECRET);
      res.json({ token, user: { uid, email: email.toLowerCase(), name: fullName, role, university, usn, semester: null, createdAt } });
    } catch (error: any) {
      console.error('Registration error detail:', {
        message: error.message,
        code: error.code,
        email: email.toLowerCase(),
        usn
      });
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        if (error.message.includes('users.email')) {
          res.status(400).json({ error: 'Email already exists' });
        } else if (error.message.includes('users.usn')) {
          res.status(400).json({ error: 'USN already exists' });
        } else {
          res.status(400).json({ error: 'User already exists with these details' });
        }
      } else {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body;
    const normalizedEmail = email.toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;

    if (user && await bcrypt.compare(password, user.password)) {
      if (role && user.role !== role) {
        return res.status(403).json({ error: `Access denied. You are registered as a ${user.role}.` });
      }
      const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET);
      res.json({ 
        token, 
        user: { 
          uid: user.uid, 
          email: user.email, 
          name: user.fullName, 
          role: user.role, 
          university: user.university, 
          usn: user.usn,
          semester: user.semester,
          createdAt: user.createdAt 
        } 
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    const normalizedEmail = email.toLowerCase();
    const user = db.prepare('SELECT uid FROM users WHERE email = ?').get(normalizedEmail) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hashedPassword, normalizedEmail);
    res.json({ message: 'Password reset successful' });
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    const user = db.prepare('SELECT uid, email, fullName as name, role, university, usn, semester, createdAt FROM users WHERE uid = ?').get(req.user.uid);
    res.json(user);
  });

  // Admin Routes
  app.get('/api/admin/users', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const users = db.prepare('SELECT uid, email, fullName as name, role, university, usn, semester, createdAt FROM users').all();
    res.json(users);
  });

  app.delete('/api/admin/users/:uid', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { uid } = req.params;
    try {
      db.prepare('DELETE FROM users WHERE uid = ?').run(uid);
      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/db/tables', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    res.json(tables);
  });

  app.get('/api/admin/db/data/:table', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { table } = req.params;
    
    // Basic protection against SQL injection for table names
    const allowedTables = ['users', 'courses', 'assignments', 'materials', 'notifications', 'submissions', 'timetable'];
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    try {
      const data = db.prepare(`SELECT * FROM ${table}`).all();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/semester', authenticateToken, (req: any, res) => {
    try {
      const { semester } = req.body;
      db.prepare('UPDATE users SET semester = ? WHERE uid = ?').run(semester, req.user.uid);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Course Routes
  app.get('/api/courses', authenticateToken, (req: any, res) => {
    try {
      const courses = db.prepare(`
        SELECT c.*, 
        (SELECT COUNT(*) FROM materials m WHERE m.courseId = c.id) as materialCount,
        EXISTS(SELECT 1 FROM enrollments e WHERE e.courseId = c.id AND e.studentId = ?) as isEnrolled
        FROM courses c 
        ORDER BY c.createdAt DESC
      `).all(req.user.uid);
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/courses/enrolled', authenticateToken, (req: any, res) => {
    try {
      const courses = db.prepare(`
        SELECT c.*, 
        (SELECT COUNT(*) FROM materials m WHERE m.courseId = c.id) as materialCount
        FROM courses c
        JOIN enrollments e ON c.id = e.courseId
        WHERE e.studentId = ?
        ORDER BY c.createdAt DESC
      `).all(req.user.uid);
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/courses/:id/enroll', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const studentId = req.user.uid;
      
      const existing = db.prepare('SELECT 1 FROM enrollments WHERE courseId = ? AND studentId = ?').get(id, studentId);
      if (existing) {
        return res.status(400).json({ error: 'Already enrolled' });
      }

      db.prepare('INSERT INTO enrollments (courseId, studentId, enrolledAt) VALUES (?, ?, ?)').run(id, studentId, new Date().toISOString());
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/courses/:id/unenroll', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const studentId = req.user.uid;
      db.prepare('DELETE FROM enrollments WHERE courseId = ? AND studentId = ?').run(id, studentId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/courses/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.user;

      // Only teacher who created it or admin can delete
      const course = db.prepare('SELECT teacherId FROM courses WHERE id = ?').get(id) as any;
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      if (user.role !== 'admin' && course.teacherId !== user.uid) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Delete associated materials, enrollments, and the course itself
      db.transaction(() => {
        db.prepare('DELETE FROM materials WHERE courseId = ?').run(id);
        db.prepare('DELETE FROM enrollments WHERE courseId = ?').run(id);
        db.prepare('DELETE FROM assignments WHERE courseId = ?').run(id);
        db.prepare('DELETE FROM timetable WHERE courseId = ?').run(id);
        db.prepare('DELETE FROM attendance WHERE courseId = ?').run(id);
        db.prepare('DELETE FROM courses WHERE id = ?').run(id);
      })();

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/courses/:id/students', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const students = db.prepare(`
        SELECT u.uid, u.fullName as name, u.email, u.usn, u.semester
        FROM users u
        JOIN enrollments e ON u.uid = e.studentId
        WHERE e.courseId = ?
      `).all(id);
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/courses', authenticateToken, (req: any, res) => {
    try {
      const { courseName, description, studentsCount } = req.body;
      const id = Math.random().toString(36).substring(2, 15);
      const user = db.prepare('SELECT fullName FROM users WHERE uid = ?').get(req.user.uid) as any;
      
      const stmt = db.prepare('INSERT INTO courses (id, courseName, description, teacherId, teacherName, studentsCount, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, courseName, description, req.user.uid, user.fullName, studentsCount || 0, new Date().toISOString());
      res.json({ id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/courses/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can delete courses' });
      }
      db.prepare('DELETE FROM courses WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Materials Routes
  app.get('/api/materials', authenticateToken, (req, res) => {
    try {
      const materials = db.prepare('SELECT * FROM materials ORDER BY createdAt DESC').all();
      res.json(materials);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/materials', authenticateToken, upload.single('file'), (req: any, res) => {
    try {
      const { title, description, courseId } = req.body;
      const id = Math.random().toString(36).substring(2, 15);
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'File is required' });
      }

      const fileUrl = `/uploads/${file.filename}`;
      const stmt = db.prepare('INSERT INTO materials (id, title, description, courseId, teacherId, fileUrl, fileName, fileType, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, title, description, courseId, req.user.uid, fileUrl, file.originalname, file.mimetype, new Date().toISOString());
      res.json({ id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/materials/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      if (req.user.role === 'admin' || req.user.role === 'teacher') {
        db.prepare('DELETE FROM materials WHERE id = ?').run(id);
        res.json({ success: true });
      } else {
        res.status(403).json({ error: 'Unauthorized' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Assignments Routes
  app.get('/api/assignments', authenticateToken, (req, res) => {
    try {
      const assignments = db.prepare(`
        SELECT a.*, 
               (SELECT COUNT(*) FROM submissions s WHERE s.assignmentId = a.id) as submissionCount,
               c.studentsCount as totalStudents
        FROM assignments a
        LEFT JOIN courses c ON a.courseId = c.id
        ORDER BY a.createdAt DESC
      `).all();
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/assignments', authenticateToken, upload.single('file'), (req: any, res) => {
    try {
      const { title, description, deadline, courseId } = req.body;
      const id = Math.random().toString(36).substring(2, 15);
      const file = req.file;
      
      const fileUrl = file ? `/uploads/${file.filename}` : '';
      const fileName = file ? file.originalname : '';
      
      const stmt = db.prepare('INSERT INTO assignments (id, title, description, deadline, courseId, teacherId, fileUrl, fileName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, title, description, deadline, courseId, req.user.uid, fileUrl, fileName, new Date().toISOString());
      res.json({ id });
    } catch (error: any) {
      console.error('Assignment Create Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Timetable Routes
  app.get('/api/timetable', authenticateToken, (req: any, res) => {
    try {
      let timetable;
      if (req.user.role === 'admin') {
        timetable = db.prepare(`
          SELECT t.*, c.courseName 
          FROM timetable t 
          LEFT JOIN courses c ON t.courseId = c.id 
          ORDER BY t.day, t.startTime ASC
        `).all();
      } else {
        timetable = db.prepare(`
          SELECT t.*, c.courseName 
          FROM timetable t 
          LEFT JOIN courses c ON t.courseId = c.id 
          WHERE t.userId = ? OR t.courseId IN (SELECT courseId FROM enrollments WHERE studentId = ?)
          ORDER BY t.startTime ASC
        `).all(req.user.uid, req.user.uid);
      }
      res.json(timetable);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/timetable/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      if (req.user.role === 'admin') {
        db.prepare('DELETE FROM timetable WHERE id = ?').run(id);
      } else {
        db.prepare('DELETE FROM timetable WHERE id = ? AND userId = ?').run(id, req.user.uid);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/timetable', authenticateToken, upload.single('file'), (req: any, res) => {
    try {
      const { day, startTime, endTime, subject, room, teacherName, courseId } = req.body;
      const id = Math.random().toString(36).substring(2, 15);
      const file = req.file;
      
      const fileUrl = file ? `/uploads/${file.filename}` : null;
      const fileName = file ? file.originalname : null;
      
      const stmt = db.prepare('INSERT INTO timetable (id, day, startTime, endTime, subject, room, teacherName, userId, courseId, fileUrl, fileName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, day, startTime, endTime, subject || '', room || '', teacherName, req.user.uid, courseId || null, fileUrl, fileName, new Date().toISOString());
      res.json({ id });
    } catch (error: any) {
      console.error('Timetable Create Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Notifications Routes
  app.get('/api/notifications', authenticateToken, (req: any, res) => {
    try {
      let notifications;
      if (req.user.role === 'admin') {
        notifications = db.prepare(`
          SELECT n.*, c.courseName 
          FROM notifications n 
          LEFT JOIN courses c ON n.courseId = c.id 
          ORDER BY n.timestamp DESC
        `).all();
      } else {
        notifications = db.prepare(`
          SELECT n.*, c.courseName 
          FROM notifications n 
          LEFT JOIN courses c ON n.courseId = c.id 
          WHERE n.userId = ? OR n.courseId IS NULL OR n.courseId IN (SELECT courseId FROM enrollments WHERE studentId = ?)
          ORDER BY n.timestamp DESC
        `).all(req.user.uid, req.user.uid);
      }
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/notifications/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      if (req.user.role === 'admin') {
        db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
      } else {
        db.prepare('DELETE FROM notifications WHERE id = ? AND userId = ?').run(id, req.user.uid);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/notifications', authenticateToken, upload.single('file'), (req: any, res) => {
    try {
      const { title, message, type, courseId } = req.body;
      const id = Math.random().toString(36).substring(2, 15);
      const file = req.file;
      
      const fileUrl = file ? `/uploads/${file.filename}` : null;
      const fileName = file ? file.originalname : null;
      
      const stmt = db.prepare('INSERT INTO notifications (id, title, message, type, userId, timestamp, courseId, fileUrl, fileName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, title, message, type || 'announcement', req.user.uid, new Date().toISOString(), courseId || null, fileUrl, fileName);
      res.json({ id });
    } catch (error: any) {
      console.error('Notification Create Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Submissions Routes
  app.get('/api/submissions', authenticateToken, (req: any, res) => {
    try {
      let submissions;
      if (req.user.role === 'teacher') {
        submissions = db.prepare('SELECT * FROM submissions ORDER BY submittedAt DESC').all();
      } else {
        submissions = db.prepare('SELECT * FROM submissions WHERE studentId = ? ORDER BY submittedAt DESC').all(req.user.uid);
      }
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/submissions', authenticateToken, upload.single('file'), (req: any, res) => {
    try {
      const { assignmentId } = req.body;
      const id = Math.random().toString(36).substring(2, 15);
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'Submission file is required' });
      }

      const user = db.prepare('SELECT fullName FROM users WHERE uid = ?').get(req.user.uid) as any;
      const fileUrl = `/uploads/${file.filename}`;
      
      const stmt = db.prepare('INSERT INTO submissions (id, assignmentId, studentId, studentName, fileUrl, fileName, submittedAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, assignmentId, req.user.uid, user.fullName, fileUrl, file.originalname, new Date().toISOString());
      res.json({ id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Attendance Routes
  app.get('/api/attendance', authenticateToken, (req: any, res) => {
    try {
      const { courseId, semester, date } = req.query;
      let query = `
        SELECT a.*, u.fullName as studentName, c.courseName 
        FROM attendance a 
        JOIN users u ON a.studentId = u.uid 
        JOIN courses c ON a.courseId = c.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (courseId) {
        query += " AND a.courseId = ?";
        params.push(courseId);
      }
      if (semester) {
        query += " AND a.semester = ?";
        params.push(semester);
      }
      if (date) {
        query += " AND a.date = ?";
        params.push(date);
      }

      if (req.user.role === 'student') {
        query += " AND a.studentId = ?";
        params.push(req.user.uid);
      } else if (req.user.role === 'teacher') {
        query += " AND c.teacherId = ?";
        params.push(req.user.uid);
      }
      // Admin can see everything, so no extra filter

      const attendance = db.prepare(query).all(...params);
      res.json(attendance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/attendance', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only teachers and admins can mark attendance' });
    }
    try {
      const records = req.body; // Array of { studentId, courseId, date, status, semester }
      const stmt = db.prepare(`
        INSERT INTO attendance (id, studentId, courseId, date, status, semester, markedBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(studentId, courseId, date) DO UPDATE SET
          status = excluded.status,
          markedBy = excluded.markedBy
      `);

      const transaction = db.transaction((data) => {
        for (const record of data) {
          const id = crypto.randomUUID();
          stmt.run(
            id,
            record.studentId,
            record.courseId,
            record.date,
            record.status,
            record.semester,
            req.user.uid,
            new Date().toISOString()
          );
        }
      });

      transaction(records);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stats Routes
  app.get('/api/teacher/stats', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'teacher') return res.sendStatus(403);
    try {
      const settingsKey = `stats_override_${req.user.uid}`;
      const override = db.prepare('SELECT value FROM settings WHERE key = ?').get(settingsKey) as any;
      
      const realTotalCourses = db.prepare('SELECT COUNT(*) as count FROM courses WHERE teacherId = ?').get(req.user.uid) as any;
      const realTotalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get() as any;
      const realPendingSubmissions = db.prepare(`
        SELECT COUNT(*) as count FROM submissions s
        JOIN assignments a ON s.assignmentId = a.id
        WHERE a.teacherId = ?
      `).get(req.user.uid) as any;

      const stats = {
        totalCourses: realTotalCourses.count,
        totalStudents: realTotalStudents.count,
        pendingSubmissions: realPendingSubmissions.count
      };

      if (override) {
        const overrideData = JSON.parse(override.value);
        if (overrideData.totalStudents !== undefined) stats.totalStudents = overrideData.totalStudents;
        if (overrideData.pendingSubmissions !== undefined) stats.pendingSubmissions = overrideData.pendingSubmissions;
      }

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/teacher/stats', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'teacher') return res.sendStatus(403);
    try {
      const { totalStudents, pendingSubmissions } = req.body;
      const settingsKey = `stats_override_${req.user.uid}`;
      const value = JSON.stringify({ totalStudents, pendingSubmissions });
      
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(settingsKey, value);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Global Error Handler to return JSON instead of HTML
  app.use((err: any, req: any, res: any, next: any) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error('Global Error:', err);
    res.status(err.status || 500).json({ 
      error: err.message || 'Internal Server Error',
      details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
