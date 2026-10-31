"use client";

import React, { useState } from "react";
import { AuthResponse, User } from "@/types";
import { fetchApi, setStoredToken } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

interface AuthSectionProps {
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
  onClose?: () => void;
}

export function AuthSection({ currentUser, onUserChange, onClose }: AuthSectionProps) {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"login" | "teacher" | "center" | "accept-invite">("login");
  const [isLoading, setIsLoading] = useState(false);

  // Forms
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [teacherForm, setTeacherForm] = useState({ fullName: "", email: "", password: "" });
  const [centerForm, setCenterForm] = useState({
    centerName: "",
    centerCode: "",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [inviteForm, setInviteForm] = useState({ token: "", fullName: "", password: "" });

  const handleLoginSuccess = (res: AuthResponse) => {
    setStoredToken(res.token);
    const user: User = {
      id: res.userId,
      email: res.email,
      fullName: res.fullName,
      role: res.role,
      activeOrganizationId: res.activeOrganizationId,
      activeOrganizationName: res.activeOrganizationName,
    };
    onUserChange(user);
    toast.success(`Chào mừng ${res.fullName} (${res.role})!`, "Đăng nhập thành công");
    if (onClose) onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetchApi<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      handleLoginSuccess(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập không thành công", "Lỗi đăng nhập");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetchApi<AuthResponse>("/auth/register-teacher", {
        method: "POST",
        body: JSON.stringify(teacherForm),
      });
      handleLoginSuccess(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Đăng ký giảng viên thất bại", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetchApi<AuthResponse>("/auth/register-center", {
        method: "POST",
        body: JSON.stringify(centerForm),
      });
      handleLoginSuccess(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Đăng ký trung tâm thất bại", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetchApi<AuthResponse>("/auth/accept-invite", {
        method: "POST",
        body: JSON.stringify(inviteForm),
      });
      handleLoginSuccess(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Kích hoạt lời mời thất bại", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-1.5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/25">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          EduAttend • Cổng Xác Thực
        </h2>
        <p className="text-xs text-slate-500">
          Hệ thống quản lý lớp học và điểm danh bằng Dynamic QR Code
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("login")}
          className={`flex-1 py-2 rounded-lg text-center transition-all ${
            activeTab === "login"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Đăng Nhập
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("teacher")}
          className={`flex-1 py-2 rounded-lg text-center transition-all ${
            activeTab === "teacher"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Giảng Viên
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("center")}
          className={`flex-1 py-2 rounded-lg text-center transition-all ${
            activeTab === "center"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Trung Tâm
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("accept-invite")}
          className={`flex-1 py-2 rounded-lg text-center transition-all ${
            activeTab === "accept-invite"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Lời Mời
        </button>
      </div>

      {/* Tab 1: Login */}
      {activeTab === "login" && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Đăng Nhập *
            </label>
            <input
              type="email"
              required
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              placeholder="admin@hust.edu.vn"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mật Khẩu *
            </label>
            <input
              type="password"
              required
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all"
          >
            {isLoading ? "Đang xác thực..." : "Đăng Nhập"}
          </button>
        </form>
      )}

      {/* Tab 2: Solo Teacher Register */}
      {activeTab === "teacher" && (
        <form onSubmit={handleRegisterTeacher} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Họ và Tên Giảng Viên *
            </label>
            <input
              type="text"
              required
              value={teacherForm.fullName}
              onChange={(e) => setTeacherForm({ ...teacherForm, fullName: e.target.value })}
              placeholder="TS. Nguyễn Văn A"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Giảng Viên *
            </label>
            <input
              type="email"
              required
              value={teacherForm.email}
              onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
              placeholder="teacher@univ.edu.vn"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mật Khẩu Khởi Tạo *
            </label>
            <input
              type="password"
              required
              value={teacherForm.password}
              onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all"
          >
            {isLoading ? "Đang xử lý..." : "Đăng Ký Giảng Viên"}
          </button>
        </form>
      )}

      {/* Tab 3: Center Admin Register */}
      {activeTab === "center" && (
        <form onSubmit={handleRegisterCenter} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tên Trường / Trung Tâm *
              </label>
              <input
                type="text"
                required
                value={centerForm.centerName}
                onChange={(e) => setCenterForm({ ...centerForm, centerName: e.target.value })}
                placeholder="ĐH Bách Khoa"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mã Trung Tâm *
              </label>
              <input
                type="text"
                required
                value={centerForm.centerCode}
                onChange={(e) => setCenterForm({ ...centerForm, centerCode: e.target.value })}
                placeholder="HUST-SOICT"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Họ Tên Quản Trị Viên *
            </label>
            <input
              type="text"
              required
              value={centerForm.adminFullName}
              onChange={(e) => setCenterForm({ ...centerForm, adminFullName: e.target.value })}
              placeholder="Nguyễn Văn Quản Trị"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Quản Trị *
              </label>
              <input
                type="email"
                required
                value={centerForm.adminEmail}
                onChange={(e) => setCenterForm({ ...centerForm, adminEmail: e.target.value })}
                placeholder="admin@school.edu.vn"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mật Khẩu *
              </label>
              <input
                type="password"
                required
                value={centerForm.adminPassword}
                onChange={(e) => setCenterForm({ ...centerForm, adminPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all"
          >
            {isLoading ? "Đang khởi tạo tổ chức..." : "Đăng Ký Trung Tâm & Quản Trị"}
          </button>
        </form>
      )}

      {/* Tab 4: Accept Invite */}
      {activeTab === "accept-invite" && (
        <form onSubmit={handleAcceptInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mã Token Lời Mời *
            </label>
            <input
              type="text"
              required
              value={inviteForm.token}
              onChange={(e) => setInviteForm({ ...inviteForm, token: e.target.value })}
              placeholder="Dán token mời nhận từ email..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Họ và Tên Của Bạn *
            </label>
            <input
              type="text"
              required
              value={inviteForm.fullName}
              onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
              placeholder="Nguyễn Văn Giảng Viên"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Thiết Lập Mật Khẩu *
            </label>
            <input
              type="password"
              required
              value={inviteForm.password}
              onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all"
          >
            {isLoading ? "Đang xác thực..." : "Kích Hoạt Tài Khoản"}
          </button>
        </form>
      )}

      {onClose && (
        <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
          >
            Đóng cửa sổ
          </button>
        </div>
      )}
    </div>
  );
}
