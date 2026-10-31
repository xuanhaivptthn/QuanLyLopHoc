"use client";

import React, { useState, useEffect, useCallback, useDeferredValue, useRef } from "react";
import { Classroom, Enrollment, Student, AttendanceSession, BulkEnrollmentResponse } from "@/types";
import { fetchApi, downloadFile } from "@/lib/api-client";
import { useToast } from "@/lib/toast";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  Plus,
  Search,
  Users,
  Calendar,
  Zap,
  Trash2,
  UserPlus,
  Upload,
  Download,
  ArrowLeft,
  Clock,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { BulkAddStudentsModal } from "@/components/BulkAddStudentsModal";

interface ClassroomsSectionProps {
  selectedClassroomId?: string;
  onSelectClassroom?: (cls: Classroom | null) => void;
  onNavigateToAttendance?: (classroomId: string, sessionId?: string) => void;
  showCreateModalDirectly?: boolean;
  onCloseCreateModal?: () => void;
}

export function ClassroomsSection({
  selectedClassroomId,
  onSelectClassroom,
  onNavigateToAttendance,
  showCreateModalDirectly = false,
  onCloseCreateModal,
}: ClassroomsSectionProps) {
  const toast = useToast();
  const { currentUser } = useAuth();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeClassroom, setActiveClassroom] = useState<Classroom | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classSessions, setClassSessions] = useState<AttendanceSession[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"students" | "sessions">("students");

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [semesterFilter, setSemesterFilter] = useState("ALL");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(showCreateModalDirectly);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);

  // Forms
  const [newClass, setNewClass] = useState({
    code: "",
    name: "",
    semester: "2024.1",
  });

  const [newSession, setNewSession] = useState({
    sessionDate: new Date().toISOString().split("T")[0],
    startTime: "08:00:00",
    endTime: "10:30:00",
  });

  const [selectedStudentIdsToEnroll, setSelectedStudentIdsToEnroll] = useState<string[]>([]);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [studentSearchInModal, setStudentSearchInModal] = useState("");

  const onSelectClassroomRef = useRef(onSelectClassroom);
  useEffect(() => {
    onSelectClassroomRef.current = onSelectClassroom;
  }, [onSelectClassroom]);

  useEffect(() => {
    if (showCreateModalDirectly) {
      setShowCreateModal(true);
    }
  }, [showCreateModalDirectly]);

  // Load classrooms & all directory students
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [clsData, stData] = await Promise.all([
        fetchApi<Classroom[]>("/classrooms"),
        fetchApi<Student[]>("/students"),
      ]);
      setClassrooms(clsData || []);
      setAllStudents(stData || []);

      if (selectedClassroomId) {
        const match = (clsData || []).find((c) => c.id === selectedClassroomId);
        if (match) setActiveClassroom(match);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassroomId]);

  // Load enrolled students for active classroom (GET /classrooms/{id}/students)
  const loadClassroomStudents = useCallback(async (classroomId: string) => {
    try {
      const data = await fetchApi<Enrollment[]>(`/classrooms/${classroomId}/students`);
      setEnrollments(data || []);
    } catch {
      setEnrollments([]);
    }
  }, []);

  // Load attendance sessions for active classroom (GET /classrooms/{id}/sessions)
  const loadClassroomSessions = useCallback(async (classroomId: string) => {
    try {
      const data = await fetchApi<AttendanceSession[]>(`/classrooms/${classroomId}/sessions`);
      setClassSessions(data || []);
    } catch {
      setClassSessions([]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeClassroom?.id) {
      loadClassroomStudents(activeClassroom.id);
      loadClassroomSessions(activeClassroom.id);
    } else {
      setEnrollments([]);
      setClassSessions([]);
    }
  }, [activeClassroom?.id, loadClassroomStudents, loadClassroomSessions]);

  // Create classroom (POST /classrooms)
  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.code.trim() || !newClass.name.trim()) {
      toast.error("Vui lòng nhập đầy đủ mã và tên lớp học", "Thiếu thông tin");
      return;
    }

    try {
      setIsLoading(true);
      const created = await fetchApi<Classroom>("/classrooms", {
        method: "POST",
        body: JSON.stringify({
          code: newClass.code.trim().toUpperCase(),
          name: newClass.name.trim(),
          semester: newClass.semester.trim(),
        }),
      });

      toast.success(`Đã tạo lớp ${created.code} thành công!`, "Thành công");
      setShowCreateModal(false);
      if (onCloseCreateModal) onCloseCreateModal();
      setNewClass({ code: "", name: "", semester: "2024.1" });
      await loadData();
      setActiveClassroom(created);
      if (onSelectClassroomRef.current) onSelectClassroomRef.current(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tạo lớp học";
      toast.error(msg, "Lỗi tạo lớp học");
    } finally {
      setIsLoading(false);
    }
  };

  // Enroll students into classroom (POST /classrooms/{id}/students/bulk)
  const handleEnrollStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClassroom || selectedStudentIdsToEnroll.length === 0) return;

    try {
      setIsLoading(true);
      const res = await fetchApi<BulkEnrollmentResponse>(
        `/classrooms/${activeClassroom.id}/students/bulk`,
        {
          method: "POST",
          body: JSON.stringify({ studentIds: selectedStudentIdsToEnroll }),
        }
      );

      toast.success(
        `Đã ghi danh ${res.enrolledCount} sinh viên vào lớp ${activeClassroom.code}!`,
        "Ghi danh thành công"
      );
      setShowEnrollModal(false);
      setSelectedStudentIdsToEnroll([]);
      await loadClassroomStudents(activeClassroom.id);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể ghi danh sinh viên";
      toast.error(msg, "Lỗi ghi danh");
    } finally {
      setIsLoading(false);
    }
  };

  // Remove student from classroom (DELETE /classrooms/{id}/students/{studentId})
  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!activeClassroom) return;
    if (!confirm(`Bạn có chắc muốn hủy ghi danh sinh viên "${studentName}" khỏi lớp này?`)) return;

    try {
      await fetchApi<void>(`/classrooms/${activeClassroom.id}/students/${studentId}`, {
        method: "DELETE",
      });
      toast.info(`Đã xóa sinh viên ${studentName} khỏi lớp`, "Đã cập nhật");
      await loadClassroomStudents(activeClassroom.id);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể xóa sinh viên";
      toast.error(msg, "Lỗi thao tác");
    }
  };

  // Create session for classroom (POST /classrooms/{id}/sessions)
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClassroom) return;

    try {
      setIsLoading(true);
      const res = await fetchApi<AttendanceSession>(`/classrooms/${activeClassroom.id}/sessions`, {
        method: "POST",
        body: JSON.stringify(newSession),
      });

      toast.success(
        `Đã tạo ca học ngày ${res.sessionDate} (${res.startTime} - ${res.endTime})`,
        "Tạo ca học thành công"
      );
      setShowCreateSessionModal(false);
      await loadClassroomSessions(activeClassroom.id);
      // Auto offer navigation to attendance
      if (onNavigateToAttendance) {
        onNavigateToAttendance(activeClassroom.id, res.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tạo ca học";
      toast.error(msg, "Lỗi tạo ca học");
    } finally {
      setIsLoading(false);
    }
  };

  // Export classroom attendance report CSV
  const handleExportClassroomReport = async () => {
    if (!activeClassroom) return;
    try {
      await downloadFile(
        `/classrooms/${activeClassroom.id}/attendance/export`,
        `bao_cao_diem_danh_${activeClassroom.code}.csv`
      );
    } catch {
      // Handled in downloadFile
    }
  };

  // Filtered classrooms
  const filteredClassrooms = classrooms.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      c.name.toLowerCase().includes(deferredSearch.toLowerCase());
    const matchesSemester = semesterFilter === "ALL" || c.semester === semesterFilter;
    return matchesSearch && matchesSemester;
  });

  const enrolledStudentIds = new Set(enrollments.map((e) => e.studentId));
  const availableStudentsToEnroll = allStudents.filter(
    (s) =>
      !enrolledStudentIds.has(s.id) &&
      (s.fullName.toLowerCase().includes(studentSearchInModal.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(studentSearchInModal.toLowerCase()))
  );

  const semesters = Array.from(new Set(classrooms.map((c) => c.semester))).filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {/* If a classroom is currently selected, show Classroom Detail Workspace */}
      {activeClassroom ? (
        <div className="flex flex-col gap-5">
          {/* Back button & Classroom Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveClassroom(null);
                  if (onSelectClassroomRef.current) onSelectClassroomRef.current(null);
                }}
                className="gap-1 text-xs"
              >
                <ArrowLeft className="size-3.5" />
                Tất cả lớp học
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase bg-sky-500/10 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded border border-sky-500/20">
                    {activeClassroom.code}
                  </span>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">
                    {activeClassroom.name}
                  </h2>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10">
                    Học kỳ {activeClassroom.semester}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Giảng viên: {activeClassroom.teacherName || currentUser?.fullName || "Chưa phân công"} •{" "}
                  <strong className="text-foreground">{enrollments.length}</strong> sinh viên đã ghi danh
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBulkImportModal(true)}
                className="gap-1.5 text-xs"
              >
                <Upload className="size-3.5" />
                Nhập danh sách (CSV)
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStudentIdsToEnroll([]);
                  setShowEnrollModal(true);
                }}
                className="gap-1.5 text-xs"
              >
                <UserPlus className="size-3.5" />
                Ghi danh sinh viên
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportClassroomReport}
                className="gap-1.5 text-xs cursor-pointer"
              >
                <Download className="size-3.5" />
                Xuất báo cáo (CSV)
              </Button>

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setShowCreateSessionModal(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="size-3.5" />
                Tạo ca học mới
              </Button>

              {onNavigateToAttendance && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateToAttendance(activeClassroom.id)}
                  className="gap-1.5 text-xs"
                >
                  <Zap className="size-3.5" />
                  Vào phòng điểm danh
                </Button>
              )}
            </div>
          </div>

          {/* Subtabs: Sinh viên vs Ca học */}
          <div className="flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab("students")}
                className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeSubTab === "students"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  Sinh viên trong lớp ({enrollments.length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("sessions")}
                className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeSubTab === "sessions"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  Lịch sử ca điểm danh ({classSessions.length})
                </span>
              </button>
            </div>
          </div>

          {/* Subtab 1: Danh sách sinh viên */}
          {activeSubTab === "students" && (
            <Card className="shadow-xs overflow-hidden">
              {enrollments.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center gap-3">
                  <Users className="size-8 text-muted-foreground stroke-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Chưa có sinh viên nào trong lớp</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Chọn sinh viên từ danh bạ để ghi danh vào lớp học này và bắt đầu điểm danh.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setSelectedStudentIdsToEnroll([]);
                        setShowEnrollModal(true);
                      }}
                      className="gap-1.5 text-xs"
                    >
                      <UserPlus className="size-3.5" />
                      Ghi danh từ danh bạ
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkImportModal(true)}
                      className="gap-1.5 text-xs"
                    >
                      <Upload className="size-3.5" />
                      Nhập danh sách (CSV)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                        <th className="py-2.5 px-4 w-12 text-center">STT</th>
                        <th className="py-2.5 px-4 font-mono">Mã SV</th>
                        <th className="py-2.5 px-4">Họ và tên</th>
                        <th className="py-2.5 px-4">Email</th>
                        <th className="py-2.5 px-4">Số điện thoại</th>
                        <th className="py-2.5 px-4">Ngày ghi danh</th>
                        <th className="py-2.5 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {enrollments.map((enr, idx) => (
                        <tr key={enr.enrollmentId} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-4 text-center text-muted-foreground font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-mono font-semibold text-foreground">
                            <span className="bg-sky-500/10 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded border border-sky-500/20 text-[11px] font-mono">
                              {enr.studentCode}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="size-6 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] border border-indigo-500/20 shrink-0">
                                {enr.fullName ? enr.fullName.charAt(0).toUpperCase() : "S"}
                              </div>
                              <span className="font-medium text-foreground">{enr.fullName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground font-mono">{enr.email}</td>
                          <td className="py-2.5 px-4 text-muted-foreground font-mono">
                            {enr.phone || "—"}
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground font-mono text-[11px]">
                            {enr.enrolledAt ? new Date(enr.enrolledAt).toLocaleDateString("vi-VN") : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveStudent(enr.studentId, enr.fullName)}
                              className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Hủy ghi danh khỏi lớp"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* Subtab 2: Ca học & Điểm danh */}
          {activeSubTab === "sessions" && (
            <Card className="shadow-xs overflow-hidden">
              {classSessions.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center gap-3">
                  <Calendar className="size-8 text-muted-foreground stroke-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Chưa có ca học nào được tạo</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Tạo ca học để tạo mã QR điểm danh động 30s hoặc thực hiện điểm danh danh sách.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowCreateSessionModal(true)}
                    className="gap-1.5 text-xs mt-1"
                  >
                    <Plus className="size-3.5" />
                    Tạo ca học ngay
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                        <th className="py-2.5 px-4 font-mono">Ngày học</th>
                        <th className="py-2.5 px-4">Khung giờ</th>
                        <th className="py-2.5 px-4">Trạng thái</th>
                        <th className="py-2.5 px-4 text-center">Sĩ số</th>
                        <th className="py-2.5 px-4 text-center">Có mặt</th>
                        <th className="py-2.5 px-4 text-center">Đi muộn</th>
                        <th className="py-2.5 px-4 text-center">Vắng</th>
                        <th className="py-2.5 px-4 text-right">Phòng điểm danh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {classSessions.map((session) => (
                        <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-semibold text-foreground">
                            {session.sessionDate}
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {session.startTime} - {session.endTime}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            {session.status === "ACTIVE" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Đang mở
                              </span>
                            ) : session.status === "COMPLETED" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-muted text-muted-foreground border border-border w-fit">
                                Hoàn thành
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 w-fit">
                                Sắp tới
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-semibold">
                            {session.totalStudents}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {session.presentCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {session.lateCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              {session.absentCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {onNavigateToAttendance && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onNavigateToAttendance(activeClassroom.id, session.id)}
                                className="h-7 px-2.5 text-xs gap-1"
                              >
                                <Zap className="size-3" />
                                Vào điểm danh
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      ) : (
        /* Top Level: All Classrooms View */
        <div className="flex flex-col gap-5">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Lớp Học &amp; Khóa Đào Tạo
              </h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {classrooms.length}
              </Badge>
            </div>

            <Button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="gap-1.5 text-xs self-start sm:self-auto"
            >
              <Plus className="size-4" />
              Tạo lớp học mới
            </Button>
          </div>

          {/* Search & Semester Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Tìm kiếm theo mã lớp (VD: IT4409) hoặc tên môn học..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>

            {semesters.length > 0 && (
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Học kỳ:</span>
                <select
                  value={semesterFilter}
                  onChange={(e) => setSemesterFilter(e.target.value)}
                  className="h-9 px-2.5 rounded-md border border-border bg-background text-foreground text-xs"
                >
                  <option value="ALL">Tất cả ({classrooms.length})</option>
                  {semesters.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Classrooms Grid */}
          {isLoading && classrooms.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-5 flex flex-col gap-3 animate-pulse bg-muted/30">
                  <div className="h-5 w-24 bg-muted rounded" />
                  <div className="h-6 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded mt-2" />
                </Card>
              ))}
            </div>
          ) : filteredClassrooms.length === 0 ? (
            <Card className="p-12 text-center flex flex-col items-center gap-3 shadow-xs">
              <BookOpen className="size-10 text-muted-foreground stroke-1" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {searchTerm ? "Không tìm thấy lớp học phù hợp" : "Chưa có lớp học nào"}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {searchTerm
                    ? "Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc học kỳ."
                    : "Bắt đầu bằng việc tạo lớp học đầu tiên để quản lý sinh viên và điểm danh."}
                </p>
              </div>
              {!searchTerm && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="gap-1.5 text-xs mt-1"
                >
                  <Plus className="size-3.5" />
                  Tạo lớp học mới
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClassrooms.map((cls) => (
                <Card
                  key={cls.id}
                  className="p-5 flex flex-col justify-between gap-4 shadow-xs hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold uppercase bg-sky-500/10 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded border border-sky-500/20">
                        {cls.code}
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10">
                        {cls.semester}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        GV: {cls.teacherName || currentUser?.fullName || "Chưa phân công"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-mono font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <Users className="size-3.5" />
                      <span>{cls.totalStudents ?? 0} sinh viên</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setActiveClassroom(cls);
                          if (onSelectClassroomRef.current) onSelectClassroomRef.current(cls);
                        }}
                        className="h-7 px-2.5 text-xs gap-1"
                      >
                        <ExternalLink className="size-3" />
                        Quản lý lớp
                      </Button>

                      {onNavigateToAttendance && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => onNavigateToAttendance(cls.id)}
                          className="size-7"
                          title="Vào điểm danh lớp này"
                        >
                          <Zap className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Tạo lớp học mới (POST /classrooms) */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <Card className="w-full max-w-md shadow-xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-foreground" />
                <h3 className="text-sm font-bold text-foreground">Tạo Lớp Học Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  if (onCloseCreateModal) onCloseCreateModal();
                }}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateClassroom} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground" htmlFor="class-code">
                  Mã lớp học (Course Code) *
                </label>
                <Input
                  id="class-code"
                  type="text"
                  required
                  value={newClass.code}
                  onChange={(e) => setNewClass({ ...newClass, code: e.target.value })}
                  placeholder="VD: INT3306 hoặc IT4409"
                  className="h-8 text-xs font-mono uppercase bg-background"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground" htmlFor="class-name">
                  Tên lớp học / Môn học *
                </label>
                <Input
                  id="class-name"
                  type="text"
                  required
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  placeholder="VD: Phát triển ứng dụng Web"
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground" htmlFor="class-semester">
                  Học kỳ *
                </label>
                <Input
                  id="class-semester"
                  type="text"
                  required
                  value={newClass.semester}
                  onChange={(e) => setNewClass({ ...newClass, semester: e.target.value })}
                  placeholder="VD: 2024.1 hoặc HK1-2024"
                  className="h-8 text-xs font-mono bg-background"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCreateModal(false);
                    if (onCloseCreateModal) onCloseCreateModal();
                  }}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={isLoading} className="text-xs">
                  {isLoading ? "Đang tạo..." : "Xác nhận tạo lớp"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Ghi danh sinh viên vào lớp (POST /classrooms/{id}/students) */}
      {showEnrollModal && activeClassroom && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <Card className="w-full max-w-lg shadow-xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4 text-foreground" />
                <h3 className="text-sm font-bold text-foreground">
                  Ghi Danh Sinh Viên: {activeClassroom.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleEnrollStudents} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">
                  Tìm sinh viên từ danh bạ hệ thống:
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Lọc theo tên hoặc mã sinh viên..."
                    value={studentSearchInModal}
                    onChange={(e) => setStudentSearchInModal(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <span className="text-xs font-semibold text-foreground">
                  Danh sách sinh viên ({availableStudentsToEnroll.length})
                </span>
                {availableStudentsToEnroll.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const availableIds = availableStudentsToEnroll.map((s) => s.id);
                      const allSelected = availableIds.every((id) =>
                        selectedStudentIdsToEnroll.includes(id)
                      );
                      if (allSelected) {
                        setSelectedStudentIdsToEnroll((prev) =>
                          prev.filter((id) => !availableIds.includes(id))
                        );
                      } else {
                        setSelectedStudentIdsToEnroll((prev) =>
                          Array.from(new Set([...prev, ...availableIds]))
                        );
                      }
                    }}
                    className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                  >
                    {availableStudentsToEnroll.every((s) =>
                      selectedStudentIdsToEnroll.includes(s.id)
                    )
                      ? "Bỏ chọn tất cả"
                      : "Chọn tất cả"}
                  </button>
                )}
              </div>

              <div className="max-h-56 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {availableStudentsToEnroll.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">
                    {allStudents.length === 0
                      ? "Chưa có sinh viên nào trong danh bạ. Vui lòng thêm sinh viên vào danh bạ trước."
                      : "Tất cả sinh viên phù hợp đã được ghi danh vào lớp học này."}
                  </div>
                ) : (
                  availableStudentsToEnroll.map((st) => {
                    const isChecked = selectedStudentIdsToEnroll.includes(st.id);
                    return (
                      <label
                        key={st.id}
                        className={`flex items-center justify-between p-2.5 hover:bg-muted/40 cursor-pointer text-xs transition-colors ${
                          isChecked ? "bg-muted/70 font-semibold" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIdsToEnroll((prev) => [...prev, st.id]);
                              } else {
                                setSelectedStudentIdsToEnroll((prev) =>
                                  prev.filter((id) => id !== st.id)
                                );
                              }
                            }}
                            className="size-4 text-primary rounded border-border"
                          />
                          <div>
                            <div className="text-foreground">{st.fullName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              MSSV: {st.studentCode} • {st.email}
                            </div>
                          </div>
                        </div>
                        {isChecked && (
                          <CheckCircle2 className="size-4 text-primary shrink-0" />
                        )}
                      </label>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Đã chọn: <strong className="text-foreground">{selectedStudentIdsToEnroll.length}</strong> sinh viên
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEnrollModal(false)}
                    className="text-xs"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={selectedStudentIdsToEnroll.length === 0 || isLoading}
                    className="text-xs"
                  >
                    {isLoading
                      ? "Đang ghi danh..."
                      : `Ghi danh (${selectedStudentIdsToEnroll.length}) sinh viên`}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Nhập Danh Sách Sinh Viên Vào Lớp (POST /classrooms/{id}/students/bulk-import) */}
      {activeClassroom && (
        <BulkAddStudentsModal
          isOpen={showBulkImportModal}
          onClose={() => setShowBulkImportModal(false)}
          onSuccess={async () => {
            await loadClassroomStudents(activeClassroom.id);
            await loadData();
          }}
          classroomId={activeClassroom.id}
          classroomCode={activeClassroom.code}
          existingStudentCodes={
            new Set(allStudents.map((s) => s.studentCode.toUpperCase()))
          }
        />
      )}

      {/* Modal: Tạo ca học mới (POST /classrooms/{id}/sessions) */}
      {showCreateSessionModal && activeClassroom && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <Card className="w-full max-w-md shadow-xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-foreground" />
                <h3 className="text-sm font-bold text-foreground">
                  Tạo Ca Học: {activeClassroom.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateSessionModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground" htmlFor="session-date">
                  Ngày học *
                </label>
                <Input
                  id="session-date"
                  type="date"
                  required
                  value={newSession.sessionDate}
                  onChange={(e) => setNewSession({ ...newSession, sessionDate: e.target.value })}
                  className="h-8 text-xs font-mono bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-foreground" htmlFor="session-start">
                    Giờ bắt đầu *
                  </label>
                  <Input
                    id="session-start"
                    type="time"
                    step="1"
                    required
                    value={newSession.startTime}
                    onChange={(e) => setNewSession({ ...newSession, startTime: e.target.value })}
                    className="h-8 text-xs font-mono bg-background"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-foreground" htmlFor="session-end">
                    Giờ kết thúc *
                  </label>
                  <Input
                    id="session-end"
                    type="time"
                    step="1"
                    required
                    value={newSession.endTime}
                    onChange={(e) => setNewSession({ ...newSession, endTime: e.target.value })}
                    className="h-8 text-xs font-mono bg-background"
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-md border border-border">
                Khi ca học được tạo, hệ thống sẽ tự động khởi tạo danh sách điểm danh cho toàn bộ {enrollments.length} sinh viên đã ghi danh trong lớp.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateSessionModal(false)}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={isLoading} className="text-xs">
                  {isLoading ? "Đang tạo..." : "Xác nhận tạo ca học"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
