export type Role = "SUPER_ADMIN" | "CENTER_ADMIN" | "TEACHER" | "STUDENT";

export type OrganizationRole = "ADMIN" | "TEACHER" | "TA";

export type MemberStatus = "INVITED" | "ACTIVE" | "SUSPENDED";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

export type SessionStatus = "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface UserOrganization {
  id: string;
  code: string;
  name: string;
  role: OrganizationRole;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  activeOrganizationId?: string | null;
  activeOrganizationName?: string | null;
  organizations?: UserOrganization[];
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  activeOrganizationId?: string | null;
  activeOrganizationName?: string | null;
  organizations?: UserOrganization[];
}

export interface Organization {
  id: string;
  code: string;
  name: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: OrganizationRole;
  status: MemberStatus;
  joinedAt: string;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  role: OrganizationRole;
  token: string;
  expiresAt: string;
  status: InvitationStatus;
  createdAt: string;
}

export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  organizationId?: string | null;
  ownerTeacherId?: string | null;
  userId?: string | null;
  createdAt?: string;
}

export interface Classroom {
  id: string;
  code: string;
  name: string;
  semester: string;
  teacherId: string;
  teacherName?: string;
  organizationId?: string | null;
  organizationName?: string | null;
  totalStudents?: number;
  createdAt?: string;
}

export interface Enrollment {
  enrollmentId: string;
  classroomId: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  email: string;
  phone?: string;
  enrolledAt: string;
}

export interface AttendanceSession {
  id: string;
  classroomId: string;
  classroomCode: string;
  classroomName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: SessionStatus;
  qrToken?: string;
  qrExpiresAt?: string;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  createdAt: string;
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
  updatedAt?: string;
}

export interface QrTokenResponse {
  sessionId: string;
  qrToken: string;
  expiresAt: string;
  validitySeconds: number;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status: number;
  statusText: string;
  requestBody?: unknown;
  responseBody?: unknown;
  durationMs: number;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterSoloTeacherRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface RegisterCenterRequest {
  centerName: string;
  centerCode: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface AcceptInviteRequest {
  token: string;
  password: string;
  fullName: string;
}

export interface InviteTeacherRequest {
  email: string;
  role: OrganizationRole;
}

export interface CreateClassroomRequest {
  code: string;
  name: string;
  semester: string;
  teacherId?: string;
}

export interface EnrollStudentRequest {
  studentId: string;
}

export interface CreateStudentRequest {
  studentCode: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export interface CreateSessionRequest {
  sessionDate: string;
  startTime: string;
  endTime: string;
}

export interface UpdateRecordItem {
  recordId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface BulkUpdateRecordsRequest {
  records: UpdateRecordItem[];
}

export interface BulkErrorItem {
  row?: number;
  studentCode?: string;
  message: string;
}

export interface BulkCreateStudentRequest {
  students: CreateStudentRequest[];
}

export interface BulkCreateStudentResponse {
  totalRequested: number;
  successCount: number;
  skippedCount: number;
  createdStudents: Student[];
  errors: BulkErrorItem[];
}

export interface BulkEnrollStudentsRequest {
  studentIds: string[];
}

export interface BulkEnrollmentResponse {
  totalRequested: number;
  enrolledCount: number;
  skippedCount: number;
  enrollments: Enrollment[];
}

export interface BulkImportToClassroomResponse {
  totalRequested: number;
  createdStudentsCount: number;
  enrolledCount: number;
  skippedCount: number;
  errors: BulkErrorItem[];
}

export interface StudentAttendanceStatDto {
  studentId: string;
  studentCode: string;
  fullName: string;
  email: string;
  phone?: string;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number;
}

export interface ClassroomAttendanceSummaryResponse {
  classroomId: string;
  classroomCode: string;
  classroomName: string;
  semester: string;
  totalSessions: number;
  totalEnrolledStudents: number;
  overallAttendanceRate: number;
  studentStats: StudentAttendanceStatDto[];
}


