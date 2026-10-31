"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import { useTheme } from "@/lib/theme";
import { fetchApi } from "@/lib/api-client";
import { AuthResponse, User } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sun, Moon, Eye, EyeOff, Building2, CheckCircle2 } from "lucide-react";

function AcceptInviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const toast = useToast();

  const tokenParam = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenParam);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [tokenParam]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token.trim()) {
      setErrorMessage("Vui lòng nhập mã token lời mời");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchApi<AuthResponse>("/auth/accept-invite", {
        method: "POST",
        body: JSON.stringify({
          token: token.trim(),
          fullName: fullName.trim(),
          password,
        }),
      });

      const user: User = {
        id: res.userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
        activeOrganizationId: res.activeOrganizationId,
        activeOrganizationName: res.activeOrganizationName,
        organizations: res.organizations,
      };

      toast.success(
        `Chào mừng ${res.fullName} gia nhập ${res.activeOrganizationName || "trung tâm"}!`,
        "Kích hoạt tài khoản thành công"
      );
      login(res.token, user, "/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chấp nhận lời mời không thành công";
      setErrorMessage(msg);
      toast.error(msg, "Lỗi kích hoạt");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background text-foreground relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          title="Đổi giao diện"
          aria-label="Đổi giao diện"
        >
          {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>

      <div className="w-full max-w-md">
        <Card className="shadow-lg p-6 sm:p-8 flex flex-col gap-5">
          {/* Header */}
          <div className="text-center flex flex-col items-center gap-1.5">
            <div className="size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <Building2 className="size-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Tiếp Nhận Lời Mời Giảng Viên
            </h1>
            <p className="text-xs text-muted-foreground">
              Hoàn tất thông tin cá nhân và thiết lập mật khẩu để tham gia trung tâm
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="p-2.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-xs"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground" htmlFor="invite-token">
                Mã lời mời (Token) *
              </label>
              <Input
                id="invite-token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Nhập mã lời mời từ email"
                className="h-8 text-xs font-mono bg-background"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground" htmlFor="invite-fullname">
                Họ và tên của bạn *
              </label>
              <Input
                id="invite-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="VD: TS. Trần Văn Minh"
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground" htmlFor="invite-password">
                Mật khẩu đăng nhập mới (tối thiểu 6 ký tự) *
              </label>
              <div className="relative">
                <Input
                  id="invite-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-8 pr-9 text-xs bg-background"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 size-8 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full mt-2 gap-1.5">
              <CheckCircle2 className="size-4" />
              {isSubmitting ? "Đang kích hoạt tài khoản..." : "Xác nhận & Vào không gian làm việc"}
            </Button>
          </form>

          <div className="pt-1 text-center text-xs text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-foreground font-semibold hover:underline">
              Đăng nhập
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-background text-muted-foreground text-xs">
          Đang tải...
        </div>
      }
    >
      <AcceptInviteInner />
    </Suspense>
  );
}
