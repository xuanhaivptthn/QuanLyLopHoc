"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import { useTheme } from "@/lib/theme";
import { fetchApi } from "@/lib/api-client";
import { AuthResponse, User } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, Eye, EyeOff, Shield } from "lucide-react";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const toast = useToast();

  const redirectUrl = searchParams.get("redirect") || "/";
  const reason = searchParams.get("reason");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace(redirectUrl.startsWith("/") ? redirectUrl : "/");
    }
  }, [isAuthLoading, isAuthenticated, redirectUrl, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetchApi<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
        skipErrorToast: true,
      });

      const user: User = {
        id: res.userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
        activeOrganizationId: res.activeOrganizationId,
        activeOrganizationName: res.activeOrganizationName,
      };

      toast.success(`Chào mừng trở lại, ${res.fullName}!`, "Đăng nhập thành công");
      login(res.token, user, redirectUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Email hoặc mật khẩu không chính xác";
      setErrorMessage(msg);
      toast.error(msg, "Đăng nhập thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background text-foreground relative">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          title="Đổi giao diện"
          aria-label="Đổi giao diện"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm">
        <Card className="shadow-lg p-6 sm:p-8 flex flex-col gap-5">
          {/* Header */}
          <div className="text-center flex flex-col items-center gap-1.5">
            <div className="size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <Shield className="size-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Đăng nhập
            </h1>
            <p className="text-xs text-muted-foreground">
              Nhập email và mật khẩu của bạn
            </p>
          </div>

          {/* Context Reason Notice */}
          {reason === "session_expired" && (
            <div
              role="alert"
              className="p-2.5 rounded-md bg-muted text-muted-foreground border border-border text-xs"
            >
              Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.
            </div>
          )}

          {reason === "unauthenticated" && (
            <div
              role="alert"
              className="p-2.5 rounded-md bg-muted text-muted-foreground border border-border text-xs"
            >
              Vui lòng đăng nhập để tiếp tục.
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="p-2.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-xs"
            >
              {errorMessage}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-medium text-foreground"
                htmlFor="login-email"
              >
                Email
              </label>
              <Input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="name@example.com"
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-medium text-foreground"
                htmlFor="login-password"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
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
                  {showPassword ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2"
            >
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>

            <div className="pt-2 text-center text-xs text-muted-foreground flex flex-col gap-1.5">
              <div>
                Chưa có tài khoản?{" "}
                <Link
                  href="/signup"
                  className="text-foreground font-semibold underline underline-offset-4 hover:opacity-80"
                >
                  Đăng ký
                </Link>
              </div>
              <div>
                Có mã lời mời từ trung tâm?{" "}
                <Link
                  href="/accept-invite"
                  className="text-foreground font-semibold underline underline-offset-4 hover:opacity-80"
                >
                  Kích hoạt lời mời
                </Link>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function LoginLoadingSkeleton() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-muted-foreground text-xs">
      Đang tải...
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingSkeleton />}>
      <LoginFormInner />
    </Suspense>
  );
}
