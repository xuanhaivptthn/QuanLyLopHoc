export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

export type SessionStatus = "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export interface Classroom {
  id: string;
  code: string;
  name: string;
  semester: string;
  teacherId: string;
  teacherName?: string;
  totalStudents?: number;
}

export interface AttendanceSession {
  id: string;
  classroomId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  qrToken?: string;
  qrExpiresAt?: string;
  status: SessionStatus;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  status: AttendanceStatus;
  checkInTime?: string;
  remarks?: string;
}
