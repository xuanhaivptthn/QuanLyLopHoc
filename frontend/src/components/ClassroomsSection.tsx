"use client";

import React, { useState, useEffect, useCallback, useDeferredValue, useRef } from "react";
import { Classroom, Enrollment, Student } from "@/types";
import { fetchApi } from "@/lib/api-client";
import { useToast } from "@/lib/toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Plus,
  Search,
  Users,
  Calendar,
  Zap,
  Trash2,
  UserPlus,
  X,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassroomsSectionProps {
  selectedClassroomId?: string;
  onSelectClassroom?: (cls: Classroom) => void;
  onNavigateToAttendance?: (classroomId: string) => void;
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

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeClassroom, setActiveClassroom] = useState<Classroom | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [semesterFilter, setSemesterFilter] = useState("ALL");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(showCreateModalDirectly);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Create form state
  const [newClass, setNewClass] = useState({
    code: "",
    name: "",
    semester: "2026-1",
    teacherId: "",
  });

  // Enroll state
  const [enrollStudentId, setEnrollStudentId] = useState("");

  const onSelectClassroomRef = useRef(onSelectClassroom);
  useEffect(() => {
    onSelectClassroomRef.current = onSelectClassroom;
  }, [onSelectClassroom]);

  useEffect(() => {
    if (showCreateModalDirectly) {
      setShowCreateModal(true);
    }
  }, [showCreateModalDirectly]);

  // Load classrooms & students
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [clsData, stData] = await Promise.all([
        fetchApi<Classroom[]>("/classrooms"),
        fetchApi<Student[]>("/students"),
      ]);
      setClassrooms(clsData);
      setAllStudents(stData);

      setActiveClassroom((prev) => {
        if (selectedClassroomId) {
          const match = clsData.find((c) => c.id === selectedClassroomId);
          if (match) return match;
        }
        if (prev) {
          const stillExists = clsData.find((c) => c.id === prev.id);
          if (stillExists) return stillExists;
        }
        return clsData.length > 0 ? clsData[0] : null;
      });
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassroomId]);

  // Load enrollments for active classroom
  const loadEnrollments = useCallback(async (classroomId: string) => {
    try {
      const data = await fetchApi<Enrollment[]>(`/classrooms/${classroomId}/enrollments`);
      setEnrollments(data);
    } catch {
      setEnrollments([]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeClassroom?.id) {
      loadEnrollments(activeClassroom.id);
    } else {
      setEnrollments([]);
    }
  }, [activeClassroom?.id, loadEnrollments]);

  // Create classroom
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
          teacherId: newClass.teacherId.trim() || undefined,
        }),
      });

      toast.success(`Đã tạo lớp ${created.code} thành công!`, "Thành công");
      setShowCreateModal(false);
      if (onCloseCreateModal) onCloseCreateModal();
      setNewClass({ code: "", name: "", semester: "2026-1", teacherId: "" });
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

  // Enroll student
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClassroom || !enrollStudentId) return;

    try {
      setIsLoading(true);
      await fetchApi<Enrollment>(`/classrooms/${activeClassroom.id}/enrollments`, {
        method: "POST",
        body: JSON.stringify({ studentId: enrollStudentId }),
      });

      const st = allStudents.find((s) => s.id === enrollStudentId);
      toast.success(
        `Đã thêm sinh viên ${st?.fullName || ""} vào lớp!`,
        "Ghi danh thành công"
      );
      setShowEnrollModal(false);
      setEnrollStudentId("");
      await loadEnrollments(activeClassroom.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể ghi danh sinh viên";
      toast.error(msg, "Lỗi ghi danh");
    } finally {
      setIsLoading(false);
    }
  };

  // Unenroll student
  const handleUnenrollStudent = async (studentId: string, studentName: string) => {
    if (!activeClassroom) return;
    if (!confirm(`Bạn có chắc muốn xóa sinh viên ${studentName} khỏi lớp này?`)) return;

    try {
      await fetchApi<void>(`/classrooms/${activeClassroom.id}/enrollments/${studentId}`, {
        method: "DELETE",
      });
      toast.info(`Đã xóa ${studentName} khỏi lớp`, "Đã cập nhật danh sách");
      await loadEnrollments(activeClassroom.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể xóa sinh viên";
      toast.error(msg, "Lỗi thao tác");
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

  // Students not yet enrolled in active classroom
  const enrolledStudentIds = new Set(enrollments.map((e) => e.studentId));
  const availableStudents = allStudents.filter((s) => !enrolledStudentIds.has(s.id));

  return (
    <div className="flex flex-col gap-6">
      {/* Top Action Bar */}
      <Card className="p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <BookOpen className="size-5 text-foreground" />
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Quản Lý Lớp Học &amp; Khóa Đào Tạo
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Quản lý danh sách học phần, giảng viên phụ trách và danh sách sinh viên ghi danh
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="text-xs"
            >
              <Plus className="size-4" data-icon="inline-start" />
              Tạo Lớp Học Mới
            </Button>
          </div>
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã lớp (IT3040...) hoặc tên môn học..."
            className="pl-9 h-8 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Học kỳ:</span>
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-2.5 py-1 rounded-md border border-border bg-background text-foreground text-xs"
          >
            <option value="ALL">Tất cả học kỳ</option>
            <option value="2026-1">Học kỳ 2026-1</option>
            <option value="2025-2">Học kỳ 2025-2</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Classrooms Cards & Active Classroom Roster Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Classroom Cards List */}
        <div className="flex flex-col gap-2.5">
          {filteredClassrooms.length === 0 ? (
            <Card className="p-8 text-center text-xs text-muted-foreground italic shadow-2xs">
              Không tìm thấy lớp học nào phù hợp.
            </Card>
          ) : (
            filteredClassrooms.map((cls) => {
              const isSelected = activeClassroom?.id === cls.id;
              return (
                <Card
                  key={cls.id}
                  onClick={() => {
                    setActiveClassroom(cls);
                    if (onSelectClassroomRef.current) onSelectClassroomRef.current(cls);
                  }}
                  className={cn(
                    "p-3.5 cursor-pointer transition-colors shadow-2xs flex flex-col gap-2.5",
                    isSelected
                      ? "border-foreground ring-1 ring-border bg-muted/40"
                      : "hover:border-foreground/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {cls.code}
                      </span>
                      <h3 className="font-semibold text-xs text-foreground mt-0.5 truncate">
                        {cls.name}
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                      {cls.semester}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5 truncate">
                      <div className="size-5 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-[10px] border border-border">
                        {cls.teacherName ? cls.teacherName.charAt(0) : "G"}
                      </div>
                      <span className="truncate">{cls.teacherName || "Giảng viên chính"}</span>
                    </div>

                    <span className="font-medium text-foreground tabular-nums text-[11px]">
                      {cls.totalStudents ?? 0} SV
                    </span>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Right 2 Columns: Enrolled Student Roster Details */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {activeClassroom ? (
            <Card className="p-4 shadow-2xs flex flex-col gap-4">
              {/* Classroom Detail Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs font-bold">
                      {activeClassroom.code}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {activeClassroom.semester}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-foreground mt-1">
                    {activeClassroom.name}
                  </h3>
                  <div className="text-xs text-muted-foreground">
                    Giảng viên: <span className="font-medium text-foreground">{activeClassroom.teacherName || "N/A"}</span> • Sĩ số: <span className="font-medium text-foreground">{enrollments.length}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowEnrollModal(true)}
                    className="text-xs"
                  >
                    <UserPlus className="size-3.5" data-icon="inline-start" />
                    Ghi Danh
                  </Button>

                  {onNavigateToAttendance && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateToAttendance(activeClassroom.id)}
                      className="text-xs"
                    >
                      <Zap className="size-3.5" data-icon="inline-start" />
                      Vào Điểm Danh
                    </Button>
                  )}
                </div>
              </div>

              {/* Enrolled Students Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border font-medium">
                    <tr>
                      <th className="p-2.5 font-medium">Mã SV</th>
                      <th className="p-2.5 font-medium">Họ và Tên</th>
                      <th className="p-2.5 font-medium">Email</th>
                      <th className="p-2.5 font-medium">Điện Thoại</th>
                      <th className="p-2.5 text-right font-medium">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {enrollments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                          Chưa có sinh viên nào ghi danh vào lớp học này.
                          Nhấn &quot;Ghi Danh&quot; để thêm sinh viên từ danh bạ.
                        </td>
                      </tr>
                    ) : (
                      enrollments.map((enr) => (
                        <tr key={enr.enrollmentId} className="hover:bg-muted/40 transition-colors">
                          <td className="p-2.5 font-mono font-medium text-foreground">
                            {enr.studentCode}
                          </td>
                          <td className="p-2.5 font-medium text-foreground">
                            {enr.fullName}
                          </td>
                          <td className="p-2.5 text-muted-foreground font-mono">
                            {enr.email}
                          </td>
                          <td className="p-2.5 text-muted-foreground">
                            {enr.phone || "-"}
                          </td>
                          <td className="p-2.5 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnenrollStudent(enr.studentId, enr.fullName)}
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            >
                              Xóa khỏi lớp
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center text-muted-foreground italic shadow-2xs">
              Chọn một lớp học ở danh sách bên trái để xem danh sách sinh viên.
            </Card>
          )}
        </div>
      </div>

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-md shadow-xl p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">
                Tạo Lớp Học / Học Phần Mới
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowCreateModal(false);
                  if (onCloseCreateModal) onCloseCreateModal();
                }}
                className="size-7"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateClassroom} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">
                  Mã Lớp Học / Mã Học Phần *
                </label>
                <Input
                  type="text"
                  required
                  value={newClass.code}
                  onChange={(e) => setNewClass({ ...newClass, code: e.target.value })}
                  placeholder="VD: IT3040-701234"
                  className="h-8 text-xs font-mono uppercase bg-background"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">
                  Tên Khóa Học / Môn Học *
                </label>
                <Input
                  type="text"
                  required
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  placeholder="VD: Kỹ Thuật Lập Trình Nâng Cao"
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-foreground">
                    Học Kỳ *
                  </label>
                  <Input
                    type="text"
                    required
                    value={newClass.semester}
                    onChange={(e) => setNewClass({ ...newClass, semester: e.target.value })}
                    placeholder="VD: 2026-1"
                    className="h-8 text-xs font-mono bg-background"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-foreground">
                    UUID Giảng Viên (Tùy chọn)
                  </label>
                  <Input
                    type="text"
                    value={newClass.teacherId}
                    onChange={(e) => setNewClass({ ...newClass, teacherId: e.target.value })}
                    placeholder="Để trống nếu là bạn"
                    className="h-8 text-xs font-mono text-[11px] bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCreateModal(false);
                    if (onCloseCreateModal) onCloseCreateModal();
                  }}
                >
                  Hủy Bỏ
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? "Đang tạo..." : "Xác Nhận Tạo Lớp"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Enroll Student Modal */}
      {showEnrollModal && activeClassroom && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-md shadow-xl p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex flex-col">
                <h3 className="font-bold text-sm text-foreground">
                  Ghi Danh Sinh Viên Vào Lớp
                </h3>
                <p className="text-[11px] text-muted-foreground">{activeClassroom.name}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowEnrollModal(false)}
                className="size-7"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleEnrollStudent} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">
                  Chọn Sinh Viên từ Danh Bạ *
                </label>
                {availableStudents.length === 0 ? (
                  <div className="p-3 rounded-md bg-muted text-muted-foreground text-xs">
                    Tất cả sinh viên trong hệ thống đã được ghi danh vào lớp này, hoặc chưa có sinh viên nào.
                  </div>
                ) : (
                  <select
                    required
                    value={enrollStudentId}
                    onChange={(e) => setEnrollStudentId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-xs"
                  >
                    <option value="">-- Chọn sinh viên cần thêm --</option>
                    {availableStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.studentCode} - {st.fullName} ({st.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEnrollModal(false)}
                >
                  Hủy Bỏ
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading || !enrollStudentId}
                >
                  {isLoading ? "Đang ghi danh..." : "Ghi Danh"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
