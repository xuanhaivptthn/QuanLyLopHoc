"use client";

import React, { useState, useEffect, useCallback, useDeferredValue, useRef } from "react";
import { Classroom, Enrollment, Student } from "@/types";
import { fetchApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";

interface ClassroomsSectionProps {
  onSelectClassroom?: (classroom: Classroom) => void;
  selectedClassroomId?: string | null;
  onNavigateToAttendance?: (classroomId: string) => void;
  showCreateModalDirectly?: boolean;
  onCloseCreateModal?: () => void;
}

export function ClassroomsSection({
  onSelectClassroom,
  selectedClassroomId,
  onNavigateToAttendance,
  showCreateModalDirectly = false,
  onCloseCreateModal,
}: ClassroomsSectionProps) {
  const toast = useToast();
  const { currentUser } = useAuth();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeClassroom, setActiveClassroom] = useState<Classroom | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("ALL");

  const deferredSearch = useDeferredValue(searchTerm);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(showCreateModalDirectly);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState("");

  // Create form state
  const [newClass, setNewClass] = useState({
    code: "",
    name: "",
    semester: "2026-1",
    teacherId: "",
  });

  // Stable refs for callbacks and selectedClassroomId to prevent re-fetch cascade loops
  const onSelectClassroomRef = useRef(onSelectClassroom);
  useEffect(() => {
    onSelectClassroomRef.current = onSelectClassroom;
  }, [onSelectClassroom]);

  const selectedClassroomIdRef = useRef(selectedClassroomId);
  useEffect(() => {
    selectedClassroomIdRef.current = selectedClassroomId;
  }, [selectedClassroomId]);

  useEffect(() => {
    if (showCreateModalDirectly) {
      setShowCreateModal(true);
    }
  }, [showCreateModalDirectly]);

  // Load classrooms: only runs on mount or when active organization changes
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const clsData = await fetchApi<Classroom[]>("/classrooms");
      const list = clsData || [];
      setClassrooms(list);

      if (list.length > 0) {
        setActiveClassroom((prev) => {
          // If previous selection is still valid in list, keep it
          if (prev && list.some((c) => c.id === prev.id)) {
            return list.find((c) => c.id === prev.id) || prev;
          }
          const targetId = selectedClassroomIdRef.current;
          const found = targetId ? list.find((c) => c.id === targetId) : null;
          const initial = found || list[0];
          if (onSelectClassroomRef.current && initial.id !== targetId) {
            onSelectClassroomRef.current(initial);
          }
          return initial;
        });
      } else {
        setActiveClassroom(null);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi tải dữ liệu lớp học", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.activeOrganizationId, toast]);

  // Sync activeClassroom when selectedClassroomId prop changes from outside without re-fetching
  useEffect(() => {
    if (selectedClassroomId && classrooms.length > 0) {
      if (activeClassroom?.id !== selectedClassroomId) {
        const match = classrooms.find((c) => c.id === selectedClassroomId);
        if (match) {
          setActiveClassroom(match);
        }
      }
    }
  }, [selectedClassroomId, classrooms, activeClassroom?.id]);

  // Lazy-load students ONLY when enroll student modal is opened
  useEffect(() => {
    if (showEnrollModal && allStudents.length === 0) {
      fetchApi<Student[]>("/students")
        .then((data) => setAllStudents(data || []))
        .catch((err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Lỗi khi tải danh sách sinh viên", "Lỗi");
        });
    }
  }, [showEnrollModal, allStudents.length, toast]);

  const loadEnrollments = useCallback(async (clsId: string) => {
    try {
      const data = await fetchApi<Enrollment[]>(`/classrooms/${clsId}/students`);
      setEnrollments(data || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi tải danh sách sinh viên lớp", "Lỗi");
    }
  }, [toast]);

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

  // Create Classroom
  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const created = await fetchApi<Classroom>("/classrooms", {
        method: "POST",
        body: JSON.stringify({
          code: newClass.code.trim().toUpperCase(),
          name: newClass.name.trim(),
          semester: newClass.semester.trim(),
          teacherId: newClass.teacherId.trim() || undefined,
        }),
      });
      toast.success(`Đã tạo lớp học mới: ${created.name} (${created.code})`, "Tạo lớp thành công");
      setShowCreateModal(false);
      if (onCloseCreateModal) onCloseCreateModal();
      setNewClass({ code: "", name: "", semester: "2026-1", teacherId: "" });
      await loadData();
      setActiveClassroom(created);
      if (onSelectClassroomRef.current) {
        onSelectClassroomRef.current(created);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo lớp học", "Lỗi tạo lớp");
    } finally {
      setIsLoading(false);
    }
  };

  // Enroll Student
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClassroom || !enrollStudentId) return;
    setIsLoading(true);
    try {
      await fetchApi(`/classrooms/${activeClassroom.id}/students`, {
        method: "POST",
        body: JSON.stringify({ studentId: enrollStudentId }),
      });
      toast.success("Đã ghi danh sinh viên vào lớp học thành công!", "Ghi danh thành công");
      setShowEnrollModal(false);
      setEnrollStudentId("");
      loadEnrollments(activeClassroom.id);
      // Optimistically update student count in active classroom without re-hitting /classrooms
      setClassrooms((prev) =>
        prev.map((c) => (c.id === activeClassroom.id ? { ...c, totalStudents: (c.totalStudents || 0) + 1 } : c))
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Ghi danh thất bại (sinh viên có thể đã tồn tại)", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  // Unenroll
  const handleUnenrollStudent = async (studentId: string, studentName: string) => {
    if (!activeClassroom) return;
    if (!confirm(`Bạn có chắc muốn hủy ghi danh sinh viên "${studentName}" khỏi lớp này?`)) return;
    try {
      await fetchApi(`/classrooms/${activeClassroom.id}/students/${studentId}`, {
        method: "DELETE",
      });
      toast.info(`Đã rút sinh viên ${studentName} khỏi lớp`, "Hủy ghi danh");
      loadEnrollments(activeClassroom.id);
      // Optimistically update student count in active classroom without re-hitting /classrooms
      setClassrooms((prev) =>
        prev.map((c) =>
          c.id === activeClassroom.id
            ? { ...c, totalStudents: Math.max(0, (c.totalStudents || 1) - 1) }
            : c
        )
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi xóa sinh viên", "Lỗi");
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
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
            🏫 Quản Lý Lớp Học &amp; Khóa Đào Tạo
          </h2>
          <p className="text-xs text-slate-500">
            Quản lý danh sách học phần, giảng viên phụ trách và danh sách sinh viên ghi danh
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tạo Lớp Học Mới
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã lớp (IT3040...) hoặc tên môn học..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Học kỳ:</span>
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
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
        <div className="space-y-3">
          {filteredClassrooms.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400 italic">
              Không tìm thấy lớp học nào phù hợp.
            </div>
          ) : (
            filteredClassrooms.map((cls) => {
              const isSelected = activeClassroom?.id === cls.id;
              return (
                <div
                  key={cls.id}
                  onClick={() => {
                    setActiveClassroom(cls);
                    if (onSelectClassroomRef.current) onSelectClassroomRef.current(cls);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10"
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {cls.code}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5 leading-snug">
                        {cls.name}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {cls.semester}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5 truncate">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                        {cls.teacherName ? cls.teacherName.charAt(0) : "G"}
                      </div>
                      <span className="truncate">{cls.teacherName || "Giảng viên chính"}</span>
                    </div>

                    <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      {cls.totalStudents ?? 0} sinh viên
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right 2 Columns: Enrolled Student Roster Details */}
        <div className="lg:col-span-2 space-y-4">
          {activeClassroom ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
              {/* Classroom Detail Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {activeClassroom.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {activeClassroom.semester}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                    {activeClassroom.name}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Giảng viên: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeClassroom.teacherName || "N/A"}</span> • Sĩ số: <span className="font-semibold">{enrollments.length}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEnrollModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Ghi Danh Sinh Viên
                  </button>

                  {onNavigateToAttendance && (
                    <button
                      type="button"
                      onClick={() => onNavigateToAttendance(activeClassroom.id)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5"
                    >
                      <span>⚡ Vào Điểm Danh</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Enrolled Students Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
                    <tr>
                      <th className="p-3">Mã SV</th>
                      <th className="p-3">Họ và Tên</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Điện Thoại</th>
                      <th className="p-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {enrollments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                          Chưa có sinh viên nào ghi danh vào lớp học này.
                          Bấm nút &quot;Ghi Danh Sinh Viên&quot; để thêm sinh viên từ danh bạ.
                        </td>
                      </tr>
                    ) : (
                      enrollments.map((enr) => (
                        <tr key={enr.enrollmentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {enr.studentCode}
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                            {enr.fullName}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 font-mono">
                            {enr.email}
                          </td>
                          <td className="p-3 text-slate-500">
                            {enr.phone || "-"}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleUnenrollStudent(enr.studentId, enr.fullName)}
                              className="px-2.5 py-1 text-rose-600 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-semibold text-[11px] transition-colors"
                            >
                              Xóa khỏi lớp
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 italic">
              Chọn một lớp học ở danh sách bên trái để xem danh sách sinh viên.
            </div>
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
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Tạo Lớp Học / Học Phần Mới
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  if (onCloseCreateModal) onCloseCreateModal();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateClassroom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã Lớp Học / Mã Học Phần *
                </label>
                <input
                  type="text"
                  required
                  value={newClass.code}
                  onChange={(e) => setNewClass({ ...newClass, code: e.target.value })}
                  placeholder="VD: IT3040-701234"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Khóa Học / Môn Học *
                </label>
                <input
                  type="text"
                  required
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  placeholder="VD: Kỹ Thuật Lập Trình Nâng Cao"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Học Kỳ *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClass.semester}
                    onChange={(e) => setNewClass({ ...newClass, semester: e.target.value })}
                    placeholder="VD: 2026-1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    UUID Giảng Viên (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={newClass.teacherId}
                    onChange={(e) => setNewClass({ ...newClass, teacherId: e.target.value })}
                    placeholder="Để trống nếu là bạn"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    if (onCloseCreateModal) onCloseCreateModal();
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  {isLoading ? "Đang tạo..." : "Xác Nhận Tạo Lớp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Student Modal */}
      {showEnrollModal && activeClassroom && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Ghi Danh Sinh Viên Vào Lớp
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{activeClassroom.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chọn Sinh Viên từ Danh Bạ *
                </label>
                {availableStudents.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs">
                    Tất cả sinh viên trong hệ thống đã được ghi danh vào lớp này, hoặc chưa có sinh viên nào. Hãy thêm sinh viên mới ở mục Hồ Sơ Sinh Viên.
                  </div>
                ) : (
                  <select
                    required
                    value={enrollStudentId}
                    onChange={(e) => setEnrollStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !enrollStudentId}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  {isLoading ? "Đang ghi danh..." : "Ghi Danh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
