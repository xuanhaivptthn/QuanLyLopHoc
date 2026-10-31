"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const currentUrl = pathname + search;
      router.replace(`/login?reason=unauthenticated&redirect=${encodeURIComponent(currentUrl)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-slate-100 relative overflow-hidden select-none">
        {/* Ambient atmospheric backdrop */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse delay-1000" />
        
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center space-y-6">
          {/* Glowing Animated Brand Icon */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-blue-500/30 blur-xl animate-ping opacity-60" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-white">
              EduAttend System
            </h2>
            <p className="text-xs text-slate-400">
              Đang xác thực thông tin bảo mật & phiên làm việc...
            </p>
          </div>

          {/* Precision Animated Progress Bar */}
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-400 to-violet-500 animate-[shimmer_1.5s_infinite] w-full"
                 style={{
                   animation: "loadingSlide 1.4s ease-in-out infinite"
                 }}
            />
          </div>
        </div>

        <style jsx>{`
          @keyframes loadingSlide {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(20%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Return empty during immediate redirect to prevent flash of content
    return null;
  }

  return <>{children}</>;
}
