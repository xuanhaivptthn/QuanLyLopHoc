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
import { Sun, Moon, Eye, EyeOff, Shield } from "lucide-react";

type AccountType = "individual" | "center";

function SignupFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const toast = useToast();

  const redirectUrl = searchParams.get("redirect") || "/";

  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Individual Form State
  const [individualForm, setIndividualForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  // Center Form State
  const [centerForm, setCenterForm] = useState({
    centerName: "",
    centerCode: "",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
    contactPhone: "",
  });

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace(redirectUrl.startsWith("/") ? redirectUrl : "/");
    }
  }, [isAuthLoading, isAuthenticated, redirectUrl, router]);

  const handleSignupSuccess = (res: AuthResponse, name: string) => {
    const user: User = {
      id: res.userId,
      email: res.email,
      fullName: res.fullName,
      role: res.role,
      activeOrganizationId: res.activeOrganizationId,
      activeOrganizationName: res.activeOrganizationName,
    };
    login(res.token, user, redirectUrl);
    toast.success(`Đăng ký thành công! Chào mừng ${name}.`);
  };

  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (individualForm.password.length < 6) {
      setErrorMessage("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchApi<AuthResponse>("/auth/register-teacher", {
        method: "POST",
        body: JSON.stringify(individualForm),
      });
      handleSignupSuccess(res, res.fullName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng ký không thành công";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCenterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const codePattern = /^[a-z0-9-]+$/;
    const cleanCode = centerForm.centerCode.trim().toLowerCase();

    if (!codePattern.test(cleanCode) || cleanCode.length < 3 || cleanCode.length > 50) {
      setErrorMessage("Mã trung tâm chỉ chứa chữ thường, số và dấu gạch ngang (từ 3 đến 50 ký tự)");
      return;
    }

    if (centerForm.adminPassword.length < 6) {
      setErrorMessage("Mật khẩu quản trị viên phải có ít nhất 6 ký tự");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        centerName: centerForm.centerName.trim(),
        centerCode: cleanCode,
        adminFullName: centerForm.adminFullName.trim(),
        adminEmail: centerForm.adminEmail.trim(),
        adminPassword: centerForm.adminPassword,
        contactEmail: centerForm.adminEmail.trim(),
        contactPhone: centerForm.contactPhone.trim() || undefined,
      };

      const res = await fetchApi<AuthResponse>("/auth/register-center", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      handleSignupSuccess(res, res.fullName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng ký trung tâm không thành công";
      setErrorMessage(msg);
      toast.error(msg);
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

      {/* Signup Card */}
      <div className="w-full max-w-md">
        <Card className="shadow-lg p-6 sm:p-8 flex flex-col gap-5">
          {/* Header */}
          <div className="text-center flex flex-col items-center gap-1.5">
            <div className="size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <Shield className="size-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Đăng ký tài khoản
            </h1>
            <p className="text-xs text-muted-foreground">
              Chọn loại tài khoản để bắt đầu
            </p>
          </div>

          {/* Account Type Selector Tabs */}
          <div className="grid grid-cols-2 p-1 bg-muted rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setAccountType("individual");
                setErrorMessage(null);
              }}
              className={`py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                accountType === "individual"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cá nhân (Giảng viên)
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountType("center");
                setErrorMessage(null);
              }}
              className={`py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                accountType === "center"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Trung tâm (Quản trị)
            </button>
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

          {/* FORM 1: Cá nhân */}
          {accountType === "individual" && (
            <form onSubmit={handleIndividualSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-foreground"
                  htmlFor="individual-fullname"
                >
                  Họ và tên *
                </label>
                <Input
                  id="individual-fullname"
                  type="text"
                  required
                  value={individualForm.fullName}
                  onChange={(e) =>
                    setIndividualForm({ ...individualForm, fullName: e.target.value })
                  }
                  placeholder="Nguyễn Văn A"
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-foreground"
                  htmlFor="individual-email"
                >
                  Email *
                </label>
                <Input
                  id="individual-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={individualForm.email}
                  onChange={(e) =>
                    setIndividualForm({ ...individualForm, email: e.target.value })
                  }
                  placeholder="name@example.com"
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-foreground"
                  htmlFor="individual-password"
                >
                  Mật khẩu (tối thiểu 6 ký tự) *
                </label>
                <div className="relative">
                  <Input
                    id="individual-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={individualForm.password}
                    onChange={(e) =>
                      setIndividualForm({ ...individualForm, password: e.target.value })
                    }
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
                {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký cá nhân"}
              </Button>
            </form>
          )}

          {/* FORM 2: Trung tâm */}
          {accountType === "center" && (
            <form onSubmit={handleCenterSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    className="text-xs font-medium text-foreground"
                    htmlFor="center-name"
                  >
                    Tên trung tâm *
                  </label>
                  <Input
                    id="center-name"
                    type="text"
                    required
                    value={centerForm.centerName}
                    onChange={(e) =>
                      setCenterForm({ ...centerForm, centerName: e.target.value })
                    }
                    placeholder="VD: ĐH Bách Khoa"
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    className="text-xs font-medium text-foreground"
                    htmlFor="center-code"
                  >
                    Mã định danh *
                  </label>
                  <Input
                    id="center-code"
                    type="text"
                    required
                    value={centerForm.centerCode}
                    onChange={(e) =>
                      setCenterForm({
                        ...centerForm,
                        centerCode: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                      })
                    }
                    placeholder="vd: hust-soict"
                    className="h-8 text-xs font-mono bg-background"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-foreground"
                  htmlFor="center-admin-name"
                >
                  Họ tên quản trị viên *
                </label>
                <Input
                  id="center-admin-name"
                  type="text"
                  required
                  value={centerForm.adminFullName}
                  onChange={(e) =>
                    setCenterForm({ ...centerForm, adminFullName: e.target.value })
                  }
                  placeholder="Nguyễn Văn Quản Trị"
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    className="text-xs font-medium text-foreground"
                    htmlFor="center-admin-email"
                  >
                    Email quản trị *
                  </label>
                  <Input
                    id="center-admin-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={centerForm.adminEmail}
                    onChange={(e) =>
                      setCenterForm({ ...centerForm, adminEmail: e.target.value })
                    }
                    placeholder="admin@school.edu.vn"
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    className="text-xs font-medium text-foreground"
                    htmlFor="center-phone"
                  >
                    Số điện thoại
                  </label>
                  <Input
                    id="center-phone"
                    type="tel"
                    value={centerForm.contactPhone}
                    onChange={(e) =>
                      setCenterForm({ ...centerForm, contactPhone: e.target.value })
                    }
                    placeholder="0912345678"
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-foreground"
                  htmlFor="center-admin-password"
                >
                  Mật khẩu quản trị (tối thiểu 6 ký tự) *
                </label>
                <div className="relative">
                  <Input
                    id="center-admin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={centerForm.adminPassword}
                    onChange={(e) =>
                      setCenterForm({ ...centerForm, adminPassword: e.target.value })
                    }
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
                {isSubmitting ? "Đang khởi tạo trung tâm..." : "Đăng ký trung tâm"}
              </Button>
            </form>
          )}

          {/* Link to Login & Accept Invite */}
          <div className="pt-1 text-center text-xs text-muted-foreground flex flex-col gap-1.5">
            <div>
              Đã có tài khoản?{" "}
              <Link
                href="/login"
                className="text-foreground font-semibold underline underline-offset-4 hover:opacity-80"
              >
                Đăng nhập
              </Link>
            </div>
            <div>
              Được mời làm giảng viên tại trung tâm?{" "}
              <Link
                href="/accept-invite"
                className="text-foreground font-semibold underline underline-offset-4 hover:opacity-80"
              >
                Kích hoạt lời mời
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SignupLoadingSkeleton() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-muted-foreground text-xs">
      Đang tải...
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoadingSkeleton />}>
      <SignupFormInner />
    </Suspense>
  );
}
