"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import { useTheme } from "@/lib/theme";
import { fetchApi } from "@/lib/api-client";
import { AuthResponse, User } from "@/types";

type AccountType = "individual" | "center";

function SignupFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

    // Validate center code slug format: lowercase letters, numbers, hyphens
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors shadow-xs cursor-pointer"
          title="Đổi giao diện"
          aria-label="Đổi giao diện"
        >
          {theme === "dark" ? (
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      {/* Signup Card */}
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Đăng ký tài khoản
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chọn loại tài khoản để bắt đầu
            </p>
          </div>

          {/* Account Type Selector Tabs */}
          <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setAccountType("individual");
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
                accountType === "individual"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
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
              className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
                accountType === "center"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Trung tâm (Quản trị)
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs"
            >
              {errorMessage}
            </div>
          )}

          {/* FORM 1: Cá nhân */}
          {accountType === "individual" && (
            <form onSubmit={handleIndividualSubmit} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  htmlFor="individual-fullname"
                >
                  Họ và tên *
                </label>
                <input
                  id="individual-fullname"
                  type="text"
                  required
                  value={individualForm.fullName}
                  onChange={(e) =>
                    setIndividualForm({ ...individualForm, fullName: e.target.value })
                  }
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  htmlFor="individual-email"
                >
                  Email *
                </label>
                <input
                  id="individual-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={individualForm.email}
                  onChange={(e) =>
                    setIndividualForm({ ...individualForm, email: e.target.value })
                  }
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  htmlFor="individual-password"
                >
                  Mật khẩu (tối thiểu 6 ký tự) *
                </label>
                <div className="relative">
                  <input
                    id="individual-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={individualForm.password}
                    onChange={(e) =>
                      setIndividualForm({ ...individualForm, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full px-3 pr-10 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký cá nhân"}
              </button>
            </form>
          )}

          {/* FORM 2: Trung tâm */}
          {accountType === "center" && (
            <form onSubmit={handleCenterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    htmlFor="center-name"
                  >
                    Tên trung tâm *
                  </label>
                  <input
                    id="center-name"
                    type="text"
                    required
                    value={centerForm.centerName}
                    onChange={(e) =>
                      setCenterForm({ ...centerForm, centerName: e.target.value })
                    }
                    placeholder="VD: ĐH Bách Khoa"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    htmlFor="center-code"
                  >
                    Mã định danh *
                  </label>
                  <input
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  htmlFor="center-admin-name"
                >
                  Họ tên quản trị viên *
                </label>
                <input
                  id="center-admin-name"
                  type="text"
                  required
                  value={centerForm.adminFullName}
                  onChange={(e) =>
                    setCenterForm({ ...centerForm, adminFullName: e.target.value })
                  }
                  placeholder="Nguyễn Văn Quản Trị"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    htmlFor="center-admin-email"
                  >
                    Email quản trị *
                  </label>
                  <input
                    id="center-admin-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={centerForm.adminEmail}
                    onChange={(e) =>
                      setCenterForm({ ...centerForm, adminEmail: e.target.value })
                    }
                    placeholder="admin@school.edu.vn"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    htmlFor="center-phone"
                  >
                    Số điện thoại
                  </label>
                  <input
                    id="center-phone"
                    type="tel"
                    value={centerForm.contactPhone}
                    onChange={(e) =>
                      setCenterForm({ ...centerForm, contactPhone: e.target.value })
                    }
                    placeholder="0912345678"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  htmlFor="center-admin-password"
                >
                  Mật khẩu quản trị (tối thiểu 6 ký tự) *
                </label>
                <div className="relative">
                  <input
                    id="center-admin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={centerForm.adminPassword}
                    onChange={(e) =>
                      setCenterForm({ ...centerForm, adminPassword: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full px-3 pr-10 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? "Đang khởi tạo trung tâm..." : "Đăng ký trung tâm"}
              </button>
            </form>
          )}

          {/* Link to Login */}
          <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            Đã có tài khoản?{" "}
            <Link
              href="/login"
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignupLoadingSkeleton() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 text-xs">
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
