"use client";

import React, { useState, useEffect, useCallback, useDeferredValue } from "react";
import { Student } from "@/types";
import { fetchApi } from "@/lib/api-client";
import { useToast } from "@/lib/toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  UserPlus,
  Download,
  Search,
  Copy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(showAddModalDirectly);

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

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchApi<Student[]>("/students");
      setStudents(data || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi tải danh sách sinh viên", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

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
      toast.success(`Đã thêm sinh viên: ${res.fullName} (${res.studentCode})`, "Tạo sinh viên thành công");
      setFormData({ studentCode: "", fullName: "", email: "", phone: "" });
      setShowAddModal(false);
      if (onCloseAddModal) onCloseAddModal();
      loadStudents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo hồ sơ sinh viên", "Lỗi");
    } finally {
      setIsLoading(false);
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
    link.setAttribute("download", `danh_sach_sinh_vien_${new Date().toISOString().split("T")[0]}.csv`);
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
      s.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <Card className="p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-foreground" />
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Danh Bạ Hồ Sơ Sinh Viên
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Quản lý mã định danh, thông tin liên lạc và tài khoản điểm danh của người học
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="text-xs"
            >
              <Download className="size-3.5" data-icon="inline-start" />
              Xuất CSV
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="text-xs"
            >
              <UserPlus className="size-3.5" data-icon="inline-start" />
              Thêm Sinh Viên
            </Button>
          </div>
        </div>
      </Card>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã SV, họ tên, email..."
            className="pl-9 h-8 text-xs bg-background"
          />
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          Hiển thị <span className="font-bold text-foreground">{filteredStudents.length}</span> / {students.length} sinh viên
        </div>
      </div>

      {/* Students Table */}
      <Card className="shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border font-medium">
              <tr>
                <th className="p-3 font-medium">Mã SV</th>
                <th className="p-3 font-medium">Họ và Tên</th>
                <th className="p-3 font-medium">Email Sinh Viên</th>
                <th className="p-3 font-medium">Số Điện Thoại</th>
                <th className="p-3 font-medium">UUID Hệ Thống</th>
                <th className="p-3 text-right font-medium">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                    Không tìm thấy sinh viên nào. Nhấn &quot;Thêm Sinh Viên&quot; để bổ sung hồ sơ mới.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono font-medium text-foreground">
                      {st.studentCode}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-[10px] shrink-0 border border-border">
                          {st.fullName ? st.fullName.charAt(0) : "S"}
                        </div>
                        <span className="font-medium text-foreground">
                          {st.fullName}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {st.email}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {st.phone || "-"}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground max-w-[140px] truncate" title={st.id}>
                      {st.id}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(st.studentCode);
                            toast.success(`Đã chép mã SV: ${st.studentCode}`, "Sao chép");
                          }}
                          className="h-6 text-[10px] px-2"
                        >
                          <Copy className="size-3" data-icon="inline-start" />
                          Mã SV
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(st.id);
                            toast.success(`Đã chép UUID của ${st.fullName}`, "Sao chép");
                          }}
                          className="h-6 text-[10px] px-2"
                        >
                          <Copy className="size-3" data-icon="inline-start" />
                          UUID
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Student Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-md shadow-xl p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">
                Thêm Hồ Sơ Sinh Viên Mới
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowAddModal(false);
                  if (onCloseAddModal) onCloseAddModal();
                }}
                className="size-7"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateStudent} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">
                  Mã Số Sinh Viên (MSSV) *
                </label>
                <Input
                  type="text"
                  required
                  value={formData.studentCode}
                  onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                  placeholder="VD: 20261234"
                  className="h-8 text-xs font-mono uppercase bg-background"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">
                  Họ và Tên *
                </label>
                <Input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="VD: Nguyễn Văn Anh"
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">
                  Email Sinh Viên *
                </label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="anh.nv26@sis.hust.edu.vn"
                  className="h-8 text-xs font-mono bg-background"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">
                  Số Điện Thoại (Tùy chọn)
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0987654321"
                  className="h-8 text-xs font-mono bg-background"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddModal(false);
                    if (onCloseAddModal) onCloseAddModal();
                  }}
                >
                  Hủy Bỏ
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? "Đang lưu..." : "Xác Nhận Thêm"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
