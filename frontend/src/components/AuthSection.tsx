"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api-client";
import { AuthResponse, User } from "@/types";
import { useToast } from "@/lib/toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthTab = "login" | "teacher" | "center" | "accept-invite";

interface AuthSectionProps {
  onClose?: () => void;
}

export function AuthSection({ onClose }: AuthSectionProps) {
  const { login } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [isLoading, setIsLoading] = useState(false);

  // Login form
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  // Solo Teacher register
  const [teacherForm, setTeacherForm] = useState({ fullName: "", email: "", password: "" });

  // Center admin register
  const [centerForm, setCenterForm] = useState({
    centerName: "",
    centerCode: "",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
  });

  // Accept Invite form
  const [inviteForm, setInviteForm] = useState({ token: "", fullName: "", password: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetchApi<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });

      const user: User = {
        id: res.userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
        activeOrganizationId: res.activeOrganizationId,
        activeOrganizationName: res.activeOrganizationName,
      };

      login(res.token, user);
      toast.success(`Chào mừng ${res.fullName}!`, "Đăng nhập thành công");
      if (onClose) onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại", "Lỗi xác thực");
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

      const user: User = {
        id: res.userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
      };

      login(res.token, user);
      toast.success(`Đã tạo tài khoản giảng viên: ${res.fullName}!`, "Đăng ký thành công");
      if (onClose) onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Đăng ký thất bại", "Lỗi");
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
        body: JSON.stringify({
          centerName: centerForm.centerName.trim(),
          centerCode: centerForm.centerCode.trim().toLowerCase(),
          adminFullName: centerForm.adminFullName.trim(),
          adminEmail: centerForm.adminEmail.trim().toLowerCase(),
          adminPassword: centerForm.adminPassword,
        }),
      });

      const user: User = {
        id: res.userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
        activeOrganizationId: res.activeOrganizationId,
        activeOrganizationName: res.activeOrganizationName,
      };

      login(res.token, user);
      toast.success(`Đã khởi tạo trung tâm ${centerForm.centerName}!`, "Đăng ký thành công");
      if (onClose) onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Đăng ký thất bại", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetchApi<AuthResponse>("/auth/accept-invitation", {
        method: "POST",
        body: JSON.stringify({
          token: inviteForm.token.trim(),
          fullName: inviteForm.fullName.trim(),
          password: inviteForm.password,
        }),
      });

      const user: User = {
        id: res.userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
        activeOrganizationId: res.activeOrganizationId,
        activeOrganizationName: res.activeOrganizationName,
      };

      login(res.token, user);
      toast.success("Kích hoạt tài khoản và tham gia tổ chức thành công!", "Chào mừng bạn");
      if (onClose) onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Kích hoạt thất bại", "Lỗi kích hoạt");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-2xl p-6 sm:p-8 flex flex-col gap-6">
      {/* Brand Header */}
      <div className="text-center flex flex-col items-center gap-1.5">
        <div className="size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
          <Shield className="size-5" />
        </div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          EduAttend • Cổng Xác Thực
        </h2>
        <p className="text-xs text-muted-foreground">
          Hệ thống quản lý lớp học và điểm danh bằng Dynamic QR Code
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-md p-1 bg-muted text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("login")}
          className={cn(
            "flex-1 py-1.5 rounded text-center transition-colors",
            activeTab === "login"
              ? "bg-background text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Đăng Nhập
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("teacher")}
          className={cn(
            "flex-1 py-1.5 rounded text-center transition-colors",
            activeTab === "teacher"
              ? "bg-background text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Giảng Viên
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("center")}
          className={cn(
            "flex-1 py-1.5 rounded text-center transition-colors",
            activeTab === "center"
              ? "bg-background text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Trung Tâm
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("accept-invite")}
          className={cn(
            "flex-1 py-1.5 rounded text-center transition-colors",
            activeTab === "accept-invite"
              ? "bg-background text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Lời Mời
        </button>
      </div>

      {/* Tab 1: Login */}
      {activeTab === "login" && (
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground">
              Email Đăng Nhập *
            </label>
            <Input
              type="email"
              required
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              placeholder="admin@hust.edu.vn"
              className="h-8 text-xs font-mono bg-background"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground">
              Mật Khẩu *
            </label>
            <Input
              type="password"
              required
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              placeholder="••••••••"
              className="h-8 text-xs bg-background"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={isLoading}
            className="w-full mt-2"
          >
            {isLoading ? "Đang xác thực..." : "Đăng Nhập"}
          </Button>
        </form>
      )}

      {/* Tab 2: Solo Teacher Register */}
      {activeTab === "teacher" && (
        <form onSubmit={handleRegisterTeacher} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground">
              Họ và Tên Giảng Viên *
            </label>
            <Input
              type="text"
              required
              value={teacherForm.fullName}
              onChange={(e) => setTeacherForm({ ...teacherForm, fullName: e.target.value })}
              placeholder="TS. Nguyễn Văn A"
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground">
              Email Giảng Viên *
            </label>
            <Input
              type="email"
              required
              value={teacherForm.email}
              onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
              placeholder="teacher@univ.edu.vn"
              className="h-8 text-xs font-mono bg-background"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground">
              Mật Khẩu Khởi Tạo *
            </label>
            <Input
              type="password"
              required
              value={teacherForm.password}
              onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
              placeholder="Tối thiểu 6 ký tự"
              className="h-8 text-xs bg-background"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={isLoading}
            className="w-full mt-2"
          >
            {isLoading ? "Đang xử lý..." : "Đăng Ký Giảng Viên"}
          </Button>
        </form>
      )}

      {/* Tab 3: Center Admin Register */}
      {activeTab === "center" && (
        <form onSubmit={handleRegisterCenter} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">
                Tên Trường / Trung Tâm *
              </label>
              <Input
                type="text"
                required
                value={centerForm.centerName}
                onChange={(e) => setCenterForm({ ...centerForm, centerName: e.target.value })}
                placeholder="ĐH Bách Khoa"
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">
                Mã Trung Tâm *
              </label>
              <Input
                type="text"
                required
                value={centerForm.centerCode}
                onChange={(e) => setCenterForm({ ...centerForm, centerCode: e.target.value })}
                placeholder="HUST-SOICT"
                className="h-8 text-xs font-mono uppercase bg-background"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground">
              Họ Tên Quản Trị Viên *
            </label>
            <Input
              type="text"
              required
              value={centerForm.adminFullName}
              onChange={(e) => setCenterForm({ ...centerForm, adminFullName: e.target.value })}
              placeholder="Nguyễn Văn Quản Trị"
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">
                Email Quản Trị *
              </label>
              <Input
                type="email"
                required
                value={centerForm.adminEmail}
                onChange={(e) => setCenterForm({ ...centerForm, adminEmail: e.target.value })}
                placeholder="admin@school.edu.vn"
                className="h-8 text-xs font-mono bg-background"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">
                Mật Khẩu *
              </label>
              <Input
                type="password"
                required
                value={centerForm.adminPassword}
                onChange={(e) => setCenterForm({ ...centerForm, adminPassword: e.target.value })}
                placeholder="••••••••"
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={isLoading}
            className="w-full mt-2"
          >
            {isLoading ? "Đang khởi tạo..." : "Đăng Ký Trung Tâm & Quản Trị"}
          </Button>
        </form>
      )}

      {/* Tab 4: Accept Invite */}
      {activeTab === "accept-invite" && (
        <form onSubmit={handleAcceptInvite} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground">
              Mã Token Lời Mời *
            </label>
            <Input
              type="text"
              required
              value={inviteForm.token}
              onChange={(e) => setInviteForm({ ...inviteForm, token: e.target.value })}
              placeholder="Dán token mời nhận từ email..."
              className="h-8 text-xs font-mono bg-background"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground">
              Họ và Tên Của Bạn *
            </label>
            <Input
              type="text"
              required
              value={inviteForm.fullName}
              onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
              placeholder="Nguyễn Văn Giảng Viên"
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground">
              Thiết Lập Mật Khẩu *
            </label>
            <Input
              type="password"
              required
              value={inviteForm.password}
              onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
              placeholder="••••••••"
              className="h-8 text-xs bg-background"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={isLoading}
            className="w-full mt-2"
          >
            {isLoading ? "Đang xác thực..." : "Kích Hoạt Tài Khoản"}
          </Button>
        </form>
      )}

      {onClose && (
        <div className="pt-2 text-center border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-muted-foreground"
          >
            Đóng cửa sổ
          </Button>
        </div>
      )}
    </Card>
  );
}
