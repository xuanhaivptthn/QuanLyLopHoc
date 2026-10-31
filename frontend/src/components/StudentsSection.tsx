"use client";

import React, { useState, useEffect, useCallback, useDeferredValue } from "react";
import { Student, Classroom, Enrollment } from "@/types";
import { fetchApi } from "@/lib/api-client";
import { useToast } from "@/lib/toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Download,
  Search,
  BookOpen,
} from "lucide-react";

interface StudentsSectionProps {
  showAddModalDirectly?: boolean;
  onCloseAddModal?: () => void;
}

export function StudentsSection({
  showAddModalDirectly = false,
  onCloseAddModal,
}: StudentsSectionProps) {
  const toast = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(showAddModalDirectly);

  // Quick enroll modal state
  const [enrollTargetStudent, setEnrollTargetStudent] = useState<Student | null>(null);
  const [selectedClassroomIdToEnroll, setSelectedClassroomIdToEnroll] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);

  const deferredSearch = useDeferredValue(searchTerm);

  // Form state
  const [formData, setFormData] = useState({
    studentCode: "",
    fullName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (showAddModalDirectly) {
      setShowAddModal(true);
    }
  }, [showAddModalDirectly]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stData, clsData] = await Promise.all([
        fetchApi<Student[]>("/students"),
        fetchApi<Classroom[]>("/classrooms"),
      ]);
      setStudents(stData || []);
      setClassrooms(clsData || []);
      if (clsData && clsData.length > 0) {
        setSelectedClassroomIdToEnroll(clsData[0].id);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi tải danh sách sinh viên", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetchApi<Student>("/students", {
        method: "POST",
        body: JSON.stringify({
          studentCode: formData.studentCode.trim().toUpperCase(),
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
        }),
      });
      toast.success(
        `Đã thêm sinh viên: ${res.fullName} (${res.studentCode})`,
        "Tạo sinh viên thành công"
      );
      setFormData({ studentCode: "", fullName: "", email: "", phone: "" });
      setShowAddModal(false);
      if (onCloseAddModal) onCloseAddModal();
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo hồ sơ sinh viên", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick enroll student into chosen classroom
  const handleQuickEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollTargetStudent || !selectedClassroomIdToEnroll) return;
    setIsEnrolling(true);
    try {
      await fetchApi<Enrollment>(`/classrooms/${selectedClassroomIdToEnroll}/students`, {
        method: "POST",
        body: JSON.stringify({ studentId: enrollTargetStudent.id }),
      });
      const cls = classrooms.find((c) => c.id === selectedClassroomIdToEnroll);
      toast.success(
        `Đã ghi danh ${enrollTargetStudent.fullName} vào lớp ${cls?.code || ""}`,
        "Ghi danh thành công"
      );
      setEnrollTargetStudent(null);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Sinh viên có thể đã ghi danh vào lớp này rồi",
        "Lỗi ghi danh"
      );
    } finally {
      setIsEnrolling(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (students.length === 0) {
      toast.warning("Không có sinh viên nào để xuất dữ liệu", "Cảnh báo");
      return;
    }
    const header = "Mã Sinh Viên,Họ và Tên,Email,Số Điện Thoại,UUID\n";
    const rows = students
      .map((s) => `"${s.studentCode}","${s.fullName}","${s.email}","${s.phone || ""}","${s.id}"`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `danh_sach_sinh_vien_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Đã tải xuống file CSV danh sách sinh viên!", "Xuất dữ liệu");
  };

  const filteredStudents = students.filter((s) => {
    const q = deferredSearch.toLowerCase();
    return (
      s.studentCode.toLowerCase().includes(q) ||
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q))
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Danh Sách Sinh Viên
          </h1>
          <Badge variant="secondary" className="font-mono text-xs bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
            {students.length} sinh viên
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs gap-1"
          >
            <Download className="size-3.5" />
            Xuất CSV
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="text-xs gap-1"
          >
            <UserPlus className="size-3.5" />
            Thêm Sinh Viên
          </Button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Tìm theo MSSV, Họ tên, Email, Số điện thoại..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-9 text-xs bg-background"
        />
      </div>

      {/* Students Data Table */}
      <Card className="shadow-xs overflow-hidden">
        {isLoading && students.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Đang tải dữ liệu danh bạ...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <Users className="size-8 text-muted-foreground stroke-1" />
            <p className="text-sm font-semibold text-foreground">
              {searchTerm ? "Không tìm thấy sinh viên nào phù hợp" : "Danh bạ chưa có sinh viên"}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {searchTerm
                ? "Thử thay đổi từ khóa tìm kiếm MSSV hoặc họ tên."
                : "Thêm sinh viên vào danh bạ để quản lý và ghi danh vào các lớp học."}
            </p>
            {!searchTerm && (
              <Button
                type="button"
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="gap-1.5 text-xs mt-1"
              >
                <UserPlus className="size-3.5" />
                Thêm sinh viên mới
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-2.5 px-4 w-12 text-center">STT</th>
                  <th className="py-2.5 px-4 font-mono">Mã SV (MSSV)</th>
                  <th className="py-2.5 px-4">Họ và tên</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Số điện thoại</th>
                  <th className="py-2.5 px-4">Ngày tạo</th>
                  <th className="py-2.5 px-4 text-right">Ghi danh lớp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 text-center text-muted-foreground font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-foreground">
                      <span className="bg-sky-500/10 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded border border-sky-500/20 text-[11px] font-mono">
                        {st.studentCode}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] border border-indigo-500/20 shrink-0">
                          {st.fullName ? st.fullName.charAt(0).toUpperCase() : "S"}
                        </div>
                        <span className="font-medium text-foreground">{st.fullName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground font-mono">{st.email}</td>
                    <td className="py-2.5 px-4 text-muted-foreground font-mono">
                      {st.phone || "—"}
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground font-mono text-[11px]">
                      {st.createdAt ? new Date(st.createdAt).toLocaleDateString("vi-VN") : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {classrooms.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEnrollTargetStudent(st)}
                          className="h-7 px-2.5 text-[11px] gap-1 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400"
                        >
                          <BookOpen className="size-3" />
                          Ghi danh
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

      {/* Modal: Thêm Sinh Viên Mới (POST /students) */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <Card className="w-full max-w-md shadow-xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4 text-foreground" />
                <h3 className="text-sm font-bold text-foreground">Thêm Sinh Viên Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  if (onCloseAddModal) onCloseAddModal();
                }}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground" htmlFor="student-code">
                  Mã sinh viên (MSSV) *
                </label>
                <Input
                  id="student-code"
                  type="text"
                  required
                  value={formData.studentCode}
                  onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                  placeholder="VD: 20020001"
                  className="h-8 text-xs font-mono uppercase bg-background"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground" htmlFor="student-name">
                  Họ và tên *
                </label>
                <Input
                  id="student-name"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="VD: Nguyễn Văn Nam"
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground" htmlFor="student-email">
                  Địa chỉ Email *
                </label>
                <Input
                  id="student-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nam.nv@school.edu.vn"
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground" htmlFor="student-phone">
                  Số điện thoại
                </label>
                <Input
                  id="student-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0912345678"
                  className="h-8 text-xs font-mono bg-background"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddModal(false);
                    if (onCloseAddModal) onCloseAddModal();
                  }}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={isLoading} className="text-xs">
                  {isLoading ? "Đang lưu..." : "Xác nhận thêm"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Ghi Danh Nhanh Vào Lớp (POST /classrooms/{id}/students) */}
      {enrollTargetStudent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <Card className="w-full max-w-md shadow-xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-foreground" />
                <h3 className="text-sm font-bold text-foreground">Ghi Danh Vào Lớp Học</h3>
              </div>
              <button
                type="button"
                onClick={() => setEnrollTargetStudent(null)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleQuickEnroll} className="flex flex-col gap-3.5">
              <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs space-y-1">
                <div className="text-muted-foreground">Sinh viên được chọn:</div>
                <div className="font-bold text-foreground">{enrollTargetStudent.fullName}</div>
                <div className="font-mono text-muted-foreground text-[11px]">
                  MSSV: {enrollTargetStudent.studentCode} • {enrollTargetStudent.email}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">
                  Chọn lớp học muốn ghi danh:
                </label>
                <select
                  value={selectedClassroomIdToEnroll}
                  onChange={(e) => setSelectedClassroomIdToEnroll(e.target.value)}
                  className="h-8 px-2.5 rounded-md border border-border bg-background text-foreground text-xs"
                >
                  {classrooms.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.code} - {cls.name} ({cls.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEnrollTargetStudent(null)}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={isEnrolling} className="text-xs">
                  {isEnrolling ? "Đang ghi danh..." : "Xác nhận ghi danh"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
