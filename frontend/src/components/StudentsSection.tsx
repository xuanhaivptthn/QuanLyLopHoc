"use client";

import React, { useState, useEffect, useCallback, useDeferredValue } from "react";
import { Student } from "@/types";
import { fetchApi } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
            👥 Danh Bạ Hồ Sơ Sinh Viên
          </h2>
          <p className="text-xs text-slate-500">
            Quản lý mã định danh, thông tin liên lạc và tài khoản điểm danh của người học
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Xuất CSV
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm Sinh Viên
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã SV (2021001...), họ tên, email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Hiển thị <span className="font-bold text-slate-800 dark:text-slate-200">{filteredStudents.length}</span> / {students.length} sinh viên
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
              <tr>
                <th className="p-3.5">Mã SV</th>
                <th className="p-3.5">Họ và Tên</th>
                <th className="p-3.5">Email Sinh Viên</th>
                <th className="p-3.5">Số Điện Thoại</th>
                <th className="p-3.5">UUID Hệ Thống</th>
                <th className="p-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    Không tìm thấy sinh viên nào. Bấm &quot;Thêm Sinh Viên&quot; để bổ sung hồ sơ mới.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {st.studentCode}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {st.fullName ? st.fullName.charAt(0) : "S"}
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {st.fullName}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {st.email}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {st.phone || "-"}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-400 max-w-[140px] truncate" title={st.id}>
                      {st.id}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(st.studentCode);
                            toast.success(`Đã chép mã SV: ${st.studentCode}`, "Sao chép");
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px]"
                        >
                          Mã SV
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(st.id);
                            toast.success(`Đã chép UUID của ${st.fullName}`, "Sao chép");
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px]"
                        >
                          UUID
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Thêm Hồ Sơ Sinh Viên Mới
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  if (onCloseAddModal) onCloseAddModal();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã Số Sinh Viên (MSSV) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.studentCode}
                  onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                  placeholder="VD: 20261234"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Họ và Tên *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="VD: Nguyễn Văn Anh"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Sinh Viên *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="anh.nv26@sis.hust.edu.vn"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Số Điện Thoại (Tùy chọn)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0987654321"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    if (onCloseAddModal) onCloseAddModal();
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
                  {isLoading ? "Đang lưu..." : "Xác Nhận Thêm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
