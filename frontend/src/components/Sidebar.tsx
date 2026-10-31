"use client";

import React, { useState } from "react";
import { User } from "@/types";
import { useAuth } from "@/lib/auth-context";

export type NavItem = "dashboard" | "classrooms" | "attendance" | "students" | "org";

interface NavItemConfig {
  id: NavItem;
  label: string;
  description: string;
  badge?: number;
  badgeTag?: string;
  badgeColor?: "blue" | "emerald" | "amber" | "violet";
  icon: React.ReactNode;
}

interface SidebarProps {
  activeTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  currentUser: User | null;
  onLogout: () => void;
  onOpenLoginModal: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  stats?: {
    classroomsCount: number;
    studentsCount: number;
    sessionsCount: number;
  };
}

export function Sidebar({
  activeTab,
  onSelectTab,
  currentUser: propUser,
  onLogout,
  onOpenLoginModal,
  isCollapsed,
  onToggleCollapse,
  stats,
}: SidebarProps) {
  const { currentUser: authUser, switchOrganization } = useAuth();
  const currentUser = propUser || authUser;

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);
  // Group 1: Workspace / Operations
  const workspaceItems: NavItemConfig[] = [
    {
      id: "dashboard",
      label: "Tổng Quan",
      description: "Thống kê & tiến độ điểm danh",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
    },
    {
      id: "classrooms",
      label: "Lớp Học & Khóa",
      description: "Danh sách lớp & danh sách sinh viên",
      badge: stats?.classroomsCount,
      badgeColor: "blue",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
    },
    {
      id: "attendance",
      label: "Điểm Danh QR",
      description: "Dynamic QR 30s & check-in trực tiếp",
      badgeTag: "30s LIVE",
      badgeColor: "emerald",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
          />
        </svg>
      ),
    },
    {
      id: "students",
      label: "Hồ Sơ Sinh Viên",
      description: "Quản lý dữ liệu & xuất danh sách",
      badge: stats?.studentsCount,
      badgeColor: "violet",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
  ];

  // Group 2: Management / Center Administration
  const adminItems: NavItemConfig[] = [
    {
      id: "org",
      label: "Tổ Chức & Cơ Sở",
      description: "Quản trị cơ sở, giảng viên & lời mời",
      badgeTag: "Admin",
      badgeColor: "amber",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
  ];

  const renderBadge = (item: NavItemConfig, isActive: boolean) => {
    if (item.badgeTag) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
            isActive
              ? "bg-white/20 text-white"
              : item.badgeColor === "emerald"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
          }`}
        >
          {item.badgeColor === "emerald" && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
          {item.badgeTag}
        </span>
      );
    }

    if (typeof item.badge === "number" && item.badge > 0) {
      return (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-5 text-center transition-colors ${
            isActive
              ? "bg-white/25 text-white"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
          }`}
        >
          {item.badge}
        </span>
      );
    }

    return null;
  };

  const renderNavButton = (item: NavItemConfig) => {
    const isActive = activeTab === item.id;
    return (
      <div key={item.id} className="relative group">
        <button
          type="button"
          onClick={() => onSelectTab(item.id)}
          aria-label={item.label}
          className={`w-full flex items-center rounded-2xl font-semibold transition-all duration-200 relative overflow-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
            isCollapsed ? "justify-center p-3" : "gap-3 px-3.5 py-2.5"
          } ${
            isActive
              ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-900/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/90 dark:hover:bg-slate-800/60 active:scale-[0.98]"
          }`}
        >
          {/* Active Accent Indicator bar on the left */}
          {isActive && !isCollapsed && (
            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white/80" />
          )}

          {/* Icon with glowing backdrop on active */}
          <div
            className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isActive
                ? "text-white"
                : "text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
            }`}
          >
            {item.icon}
          </div>

          {/* Labels & Badges for Expanded Mode */}
          {!isCollapsed && (
            <div className="flex-1 flex items-center justify-between min-w-0">
              <div className="flex flex-col text-left truncate">
                <span className="text-xs font-bold tracking-tight truncate">{item.label}</span>
                <span
                  className={`text-[10px] truncate ${
                    isActive ? "text-blue-100/80 font-normal" : "text-slate-400 dark:text-slate-500 font-normal"
                  }`}
                >
                  {item.description}
                </span>
              </div>
              <div className="ml-2 flex-shrink-0">{renderBadge(item, isActive)}</div>
            </div>
          )}

          {/* Collapsed dot or mini badge */}
          {isCollapsed && ((item.badge && item.badge > 0) || item.badgeTag) && (
            <span
              className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                item.badgeColor === "emerald"
                  ? "bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
                  : "bg-blue-600 ring-2 ring-white dark:ring-slate-900"
              }`}
            />
          )}
        </button>

        {/* Collapsed Floating Tooltip */}
        {isCollapsed && (
          <div
            role="tooltip"
            aria-hidden="true"
            className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold shadow-2xl border border-slate-700/60 whitespace-nowrap z-50 pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 flex items-center gap-2 backdrop-blur-md"
          >
            <span>{item.label}</span>
            {renderBadge(item, false)}
          </div>
        )}
      </div>
    );
  };

  const userOrgs = currentUser?.organizations || [];
  const isAddedToCenter = userOrgs.length > 0;
  const isCenterAdmin = currentUser?.role === "CENTER_ADMIN";
  const hasActiveCenter = Boolean(currentUser?.activeOrganizationId || currentUser?.activeOrganizationName);

  // Show center selector ONLY if:
  // - Teacher has been added to 1 or more centers
  // - OR user is a Center Admin
  // - OR user currently has an active center set
  const showCenterSelector = Boolean(currentUser && (isAddedToCenter || isCenterAdmin || hasActiveCenter));

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case "CENTER_ADMIN":
        return "Quản Trị Trung Tâm";
      case "TEACHER":
        return hasActiveCenter ? "Giảng Viên Trung Tâm" : "Giảng Viên Độc Lập";
      case "STUDENT":
        return "Sinh Viên";
      default:
        return "Tài Khoản Cá Nhân";
    }
  };

  return (
    <aside
      className={`relative flex flex-col flex-shrink-0 h-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-20 select-none ${
        isCollapsed ? "w-[76px]" : "w-72"
      }`}
    >
      {/* Brand Header */}
      <div
        className={`h-18 flex items-center px-4 border-b border-slate-100 dark:border-slate-800/80 transition-all ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        <button
          type="button"
          onClick={() => onSelectTab("dashboard")}
          className="flex items-center gap-3 overflow-hidden text-left focus:outline-hidden group"
          title="Về Trang Chủ EduAttend"
        >
          {/* Logo Mark with modern multi-stop gradient & outer glow */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 ring-1 ring-white/30 dark:ring-white/10 group-hover:scale-105 transition-transform duration-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>
            {/* Live Indicator pulse */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white truncate">
                  EduAttend
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-widest bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  PRO
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Hệ Thống Điểm Danh QR
              </span>
            </div>
          )}
        </button>

        {/* Toggle Collapse Button */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Thu gọn thanh điều hướng"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            title="Thu gọn menu"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Collapsed Expand Quick Button */}
      {isCollapsed && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Mở rộng thanh điều hướng"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            title="Mở rộng menu"
          >
            <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Collapsed Workspace Quick Indicator */}
      {isCollapsed && showCenterSelector && (
        <div className="flex justify-center pt-2 relative group">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={hasActiveCenter ? currentUser?.activeOrganizationName || "Trung tâm" : "Tài khoản cá nhân"}
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm shadow-2xs transition-colors"
          >
            {hasActiveCenter ? "🏛️" : "👤"}
          </button>
          <div
            role="tooltip"
            aria-hidden="true"
            className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold shadow-2xl border border-slate-700/60 whitespace-nowrap z-50 pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 backdrop-blur-md"
          >
            {hasActiveCenter ? `Cơ sở: ${currentUser?.activeOrganizationName}` : "Tài khoản cá nhân (Nhấn để mở)"}
          </div>
        </div>
      )}

      {/* Organization / Workspace Switcher for teachers added to centers or center admins */}
      {!isCollapsed && showCenterSelector && (
        <div className="relative mx-3 mt-3">
          <button
            type="button"
            onClick={() => setIsOrgDropdownOpen((prev) => !prev)}
            disabled={isSwitchingOrg}
            className={`w-full p-2.5 rounded-2xl border transition-all duration-200 text-left flex items-center justify-between gap-2 shadow-2xs group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
              hasActiveCenter
                ? "bg-gradient-to-br from-slate-50 to-blue-50/60 dark:from-slate-800/60 dark:to-slate-900/60 border-blue-200/60 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700"
                : "bg-gradient-to-br from-slate-50 to-indigo-50/50 dark:from-slate-800/60 dark:to-slate-900/60 border-indigo-200/60 dark:border-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-700"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-2xs ${
                  hasActiveCenter
                    ? "bg-blue-600 text-white shadow-blue-500/20"
                    : "bg-indigo-600 text-white shadow-indigo-500/20"
                }`}
              >
                {hasActiveCenter ? "🏛️" : "👤"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
                  {hasActiveCenter ? "Trung Tâm Trực Thuộc" : "Không Gian Cá Nhân"}
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {hasActiveCenter ? currentUser?.activeOrganizationName : "Giảng Viên Độc Lập"}
                </span>
              </div>
            </div>

            {/* Switch Action indicator */}
            <div className="flex items-center gap-1 flex-shrink-0 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-2xs">
                {isSwitchingOrg ? "..." : "Đổi"}
              </span>
              <svg
                className={`w-3.5 h-3.5 transform transition-transform duration-200 ${
                  isOrgDropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Switcher Dropdown Menu */}
          {isOrgDropdownOpen && (
            <>
              {/* Backdrop dismiss */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOrgDropdownOpen(false)}
              />

              <div className="absolute top-full left-0 right-0 mt-2 z-50 p-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-2 animate-in fade-in-0 zoom-in-95 duration-150">
                <div className="px-2 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Chọn Không Gian Làm Việc
                </div>

                {/* Centers List (if user belongs to any centers) */}
                {userOrgs.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[9px] font-bold text-slate-400 uppercase">
                      Trung tâm ({userOrgs.length})
                    </div>
                    {userOrgs.map((org) => {
                      const isCurrent = currentUser?.activeOrganizationId === org.id;
                      return (
                        <button
                          key={org.id}
                          type="button"
                          onClick={async () => {
                            if (isCurrent) {
                              setIsOrgDropdownOpen(false);
                              return;
                            }
                            setIsSwitchingOrg(true);
                            setIsOrgDropdownOpen(false);
                            try {
                              await switchOrganization(org.id);
                            } finally {
                              setIsSwitchingOrg(false);
                            }
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all ${
                            isCurrent
                              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900/50"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base flex-shrink-0">🏛️</span>
                            <div className="flex flex-col min-w-0">
                              <span className="truncate">{org.name}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                Mã: {org.code}
                              </span>
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="text-blue-600 dark:text-blue-400 font-bold text-xs flex-shrink-0">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Individual / Solo Option */}
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="px-2 text-[9px] font-bold text-slate-400 uppercase">
                    Không gian cá nhân
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!hasActiveCenter) {
                        setIsOrgDropdownOpen(false);
                        return;
                      }
                      setIsSwitchingOrg(true);
                      setIsOrgDropdownOpen(false);
                      try {
                        await switchOrganization(null);
                      } finally {
                        setIsSwitchingOrg(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all ${
                      !hasActiveCenter
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-900/50"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">👤</span>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">Tài Khoản Cá Nhân</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Giảng viên độc lập / Lớp riêng
                        </span>
                      </div>
                    </div>
                    {!hasActiveCenter && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs flex-shrink-0">
                        ✓
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick Attendance Action Launcher */}
      <div className={`mt-3 ${isCollapsed ? "px-2" : "px-3"}`}>
        <button
          type="button"
          onClick={() => onSelectTab("attendance")}
          aria-label="Khởi tạo điểm danh QR"
          className={`w-full flex items-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all duration-200 group ${
            isCollapsed ? "justify-center p-3" : "justify-between px-3.5 py-2.5"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1 rounded-lg bg-white/20 text-white group-hover:rotate-12 transition-transform duration-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </span>
            {!isCollapsed && <span>Điểm Danh Ngay</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-mono tracking-tight font-extrabold">
              30s
            </span>
          )}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav
        aria-label="Thanh điều hướng chính"
        className="flex-1 px-3 py-4 space-y-4 overflow-y-auto overflow-x-hidden"
      >
        {/* Workspace Group */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Không Gian Quản Lý
            </div>
          )}
          <div className="space-y-1">{workspaceItems.map(renderNavButton)}</div>
        </div>

        {/* Administration Group - Only visible for Center Admin accounts under an active center */}
        {hasActiveCenter && currentUser?.role === "CENTER_ADMIN" && (
          <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            {!isCollapsed && (
              <div className="px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Hệ Thống & Cấu Hình
              </div>
            )}
            <div className="space-y-1">{adminItems.map(renderNavButton)}</div>
          </div>
        )}

      </nav>

      {/* User / Authentication Bottom Card */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
        {currentUser ? (
          <div
            className={`flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 transition-all ${
              isCollapsed ? "justify-center p-2" : "justify-between p-2.5 gap-2.5"
            }`}
          >
            {/* User Avatar with Presence Ring */}
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-sm ring-1 ring-white/20">
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {currentUser.fullName || "Người dùng"}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-extrabold uppercase tracking-tight">
                    {getRoleDisplayName(currentUser.role)}
                  </span>
                </div>
              </div>
            )}

            {/* Logout Action */}
            <button
              type="button"
              onClick={onLogout}
              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Đăng xuất khỏi hệ thống"
              aria-label="Đăng xuất"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLoginModal}
            className={`w-full flex items-center rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs transition-all duration-200 shadow-md shadow-blue-500/20 active:scale-[0.98] ${
              isCollapsed ? "justify-center p-3" : "justify-center gap-2 px-3.5 py-2.5"
            }`}
            title="Đăng nhập tài khoản Giảng viên / Quản trị viên"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            {!isCollapsed && <span>Đăng Nhập / Bắt Đầu</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
