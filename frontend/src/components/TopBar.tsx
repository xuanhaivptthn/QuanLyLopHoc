"use client";

import React from "react";
import { useTheme } from "@/lib/theme";

interface TopBarProps {
  currentTabName: string;
  selectedClassName?: string | null;
  onOpenNewSession?: () => void;
  onOpenMobileMenu?: () => void;
}

export function TopBar({
  currentTabName,
  selectedClassName,
  onOpenNewSession,
  onOpenMobileMenu,
}: TopBarProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-10 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Mở menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="text-slate-400 dark:text-slate-500">EduAttend</span>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">{currentTabName}</span>
          {selectedClassName && (
            <>
              <span>/</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-[11px] font-bold max-w-[160px] truncate">
                {selectedClassName}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Backend Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">Spring Boot API (:8080)</span>
        </div>

        {/* Swagger UI link */}
        <a
          href="http://localhost:8080/api/swagger-ui.html"
          target="_blank"
          rel="noreferrer"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Tài liệu OpenAPI / Swagger"
        >
          <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          Swagger Docs
        </a>

        {/* Dark/Light Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={resolvedTheme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          {resolvedTheme === "dark" ? (
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Quick Launch QR Button */}
        {onOpenNewSession && (
          <button
            type="button"
            onClick={onOpenNewSession}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm shadow-blue-500/25"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Điểm Danh Ngay</span>
          </button>
        )}
      </div>
    </header>
  );
}
