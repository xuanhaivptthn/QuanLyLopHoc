"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  QrCode,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  LogIn,
  Check,
  User as UserIcon,
  Shield,
  Zap,
} from "lucide-react";
import { User } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type NavItem = "dashboard" | "classrooms" | "attendance" | "students" | "org";

interface NavItemConfig {
  id: NavItem;
  label: string;
  description: string;
  badge?: number;
  badgeTag?: string;
  icon: React.ComponentType<{ className?: string }>;
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
      icon: LayoutDashboard,
    },
    {
      id: "classrooms",
      label: "Lớp Học & Khóa",
      description: "Danh sách lớp & sinh viên theo lớp",
      badge: stats?.classroomsCount,
      icon: BookOpen,
    },
    {
      id: "attendance",
      label: "Điểm Danh QR",
      description: "Dynamic QR 30s & check-in trực tiếp",
      badgeTag: "30s LIVE",
      icon: QrCode,
    },
    {
      id: "students",
      label: "Hồ Sơ Sinh Viên",
      description: "Quản lý dữ liệu & xuất danh sách",
      badge: stats?.studentsCount,
      icon: Users,
    },
  ];

  // Group 2: Management / Center Administration
  const adminItems: NavItemConfig[] = [
    {
      id: "org",
      label: "Tổ Chức & Cơ Sở",
      description: "Quản trị cơ sở, giảng viên & lời mời",
      badgeTag: "Admin",
      icon: Building2,
    },
  ];

  const userOrgs = currentUser?.organizations || [];
  const isAddedToCenter = userOrgs.length > 0;
  const isCenterAdmin = currentUser?.role === "CENTER_ADMIN";
  const hasActiveCenter = Boolean(currentUser?.activeOrganizationId || currentUser?.activeOrganizationName);

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

  const renderNavButton = (item: NavItemConfig) => {
    const isActive = activeTab === item.id;
    const IconComponent = item.icon;

    return (
      <div key={item.id} className="relative group">
        <button
          type="button"
          onClick={() => onSelectTab(item.id)}
          aria-label={item.label}
          className={cn(
            "w-full flex items-center rounded-lg text-xs font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
            isActive
              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
          )}
        >
          <IconComponent
            className={cn(
              "size-4 shrink-0 transition-colors",
              isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
            )}
          />

          {!isCollapsed && (
            <div className="flex-1 flex items-center justify-between min-w-0">
              <span className="truncate">{item.label}</span>

              <div className="ml-2 shrink-0 flex items-center gap-1.5">
                {item.badgeTag && (
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                        : item.badgeTag === "30s LIVE"
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 animate-pulse"
                        : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                    )}
                  >
                    {item.badgeTag}
                  </span>
                )}
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold border",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                        : item.id === "classrooms"
                        ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
                        : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </div>
          )}

          {isCollapsed && ((item.badge && item.badge > 0) || item.badgeTag) && (
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
          )}
        </button>

        {isCollapsed && (
          <div
            role="tooltip"
            aria-hidden="true"
            className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-popover text-popover-foreground text-xs font-medium shadow-md border border-border whitespace-nowrap z-50 pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all flex items-center gap-2"
          >
            <span>{item.label}</span>
            {item.badgeTag && <Badge variant="secondary" className="text-[9px] px-1 py-0">{item.badgeTag}</Badge>}
            {typeof item.badge === "number" && item.badge > 0 && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0">{item.badge}</Badge>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col shrink-0 h-full bg-card text-card-foreground border-r border-border transition-all duration-200 z-20 select-none",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "h-14 flex items-center px-3 border-b border-border transition-all",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        <button
          type="button"
          onClick={() => onSelectTab("dashboard")}
          className="flex items-center gap-2.5 overflow-hidden text-left focus:outline-none group"
          title="Về Trang Chủ EduAttend"
        >
          {/* Logo Mark: Pure Solid Neutral with Crisp Icon */}
          <div className="relative shrink-0">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <Shield className="size-4" />
            </div>
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-foreground truncate">
                  EduAttend
                </span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 font-semibold uppercase">
                  Pro
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground truncate">
                Điểm Danh Dynamic QR
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
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Thu gọn menu"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Collapsed Expand Button */}
      {isCollapsed && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Mở rộng thanh điều hướng"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Mở rộng menu"
          >
            <ChevronRight className="size-4" />
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
            className="size-8 rounded-lg bg-muted text-muted-foreground hover:text-foreground border border-border flex items-center justify-center shadow-xs transition-colors"
          >
            {hasActiveCenter ? <Building2 className="size-4" /> : <UserIcon className="size-4" />}
          </button>
          <div
            role="tooltip"
            aria-hidden="true"
            className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-popover text-popover-foreground text-xs font-medium shadow-md border border-border whitespace-nowrap z-50 pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
          >
            {hasActiveCenter ? `Cơ sở: ${currentUser?.activeOrganizationName}` : "Tài khoản cá nhân"}
          </div>
        </div>
      )}

      {/* Workspace Switcher */}
      {!isCollapsed && showCenterSelector && (
        <div className="relative mx-3 mt-3">
          <button
            type="button"
            onClick={() => setIsOrgDropdownOpen((prev) => !prev)}
            disabled={isSwitchingOrg}
            className="w-full p-2 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors text-left flex items-center justify-between gap-2 shadow-2xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-7 rounded-md bg-background border border-border flex items-center justify-center shrink-0 text-foreground shadow-2xs">
                {hasActiveCenter ? <Building2 className="size-3.5" /> : <UserIcon className="size-3.5" />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                  {hasActiveCenter ? "Trung Tâm Trực Thuộc" : "Không Gian Cá Nhân"}
                </span>
                <span className="text-xs font-semibold text-foreground truncate">
                  {hasActiveCenter ? currentUser?.activeOrganizationName : "Giảng Viên Độc Lập"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
              <span className="text-[10px] px-1 py-0.5 rounded bg-background border border-border text-muted-foreground">
                {isSwitchingOrg ? "..." : "Đổi"}
              </span>
              <ChevronDown
                className={cn("size-3.5 transition-transform duration-200", isOrgDropdownOpen && "rotate-180")}
              />
            </div>
          </button>

          {isOrgDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOrgDropdownOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground border border-border shadow-lg flex flex-col gap-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Chọn Không Gian Làm Việc
                </div>

                {userOrgs.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <div className="px-2 text-[10px] font-medium text-muted-foreground">
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
                          className={cn(
                            "w-full flex items-center justify-between p-2 rounded-md text-left text-xs transition-colors",
                            isCurrent
                              ? "bg-secondary text-secondary-foreground font-semibold"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                            <div className="flex flex-col min-w-0">
                              <span className="truncate">{org.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                Mã: {org.code}
                              </span>
                            </div>
                          </div>
                          {isCurrent && <Check className="size-3.5 text-primary shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="pt-1 mt-1 border-t border-border flex flex-col gap-0.5">
                  <div className="px-2 text-[10px] font-medium text-muted-foreground">
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
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-md text-left text-xs transition-colors",
                      !hasActiveCenter
                        ? "bg-secondary text-secondary-foreground font-semibold"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">Tài Khoản Cá Nhân</span>
                        <span className="text-[10px] text-muted-foreground">
                          Giảng viên độc lập / Lớp riêng
                        </span>
                      </div>
                    </div>
                    {!hasActiveCenter && <Check className="size-3.5 text-primary shrink-0 ml-1" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick Attendance Action Launcher */}
      <div className={cn("mt-2.5", isCollapsed ? "px-2" : "px-3")}>
        <button
          type="button"
          onClick={() => onSelectTab("attendance")}
          aria-label="Khởi tạo điểm danh QR"
          className={cn(
            "w-full flex items-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs transition-colors shadow-xs active:scale-[0.98] group",
            isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
          )}
        >
          <div className="flex items-center gap-2">
            <Zap className="size-4 shrink-0" />
            {!isCollapsed && <span>Điểm Danh Ngay</span>}
          </div>
          {!isCollapsed && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary-foreground/30 text-primary-foreground font-mono">
              30s
            </Badge>
          )}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav
        aria-label="Thanh điều hướng chính"
        className="flex-1 px-3 py-3 flex flex-col gap-3 overflow-y-auto overflow-x-hidden"
      >
        <div className="flex flex-col gap-1">
          {!isCollapsed && (
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Không Gian Quản Lý
            </div>
          )}
          <div className="flex flex-col gap-0.5">{workspaceItems.map(renderNavButton)}</div>
        </div>

        {hasActiveCenter && currentUser?.role === "CENTER_ADMIN" && (
          <div className="flex flex-col gap-1 pt-2 border-t border-border">
            {!isCollapsed && (
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Hệ Thống & Cấu Hình
              </div>
            )}
            <div className="flex flex-col gap-0.5">{adminItems.map(renderNavButton)}</div>
          </div>
        )}
      </nav>

      {/* User / Authentication Bottom Card */}
      <div className="p-3 border-t border-border bg-card">
        {currentUser ? (
          <div
            className={cn(
              "flex items-center rounded-lg bg-muted/40 border border-border transition-colors",
              isCollapsed ? "justify-center p-2" : "justify-between p-2 gap-2"
            )}
          >
            <div className="relative shrink-0">
              <div className="size-8 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center font-bold text-xs">
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : "U"}
              </div>
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">
                  {currentUser.fullName || "Người dùng"}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-semibold uppercase tracking-tight">
                    {getRoleDisplayName(currentUser.role)}
                  </Badge>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted transition-colors"
              title="Đăng xuất khỏi hệ thống"
              aria-label="Đăng xuất"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLoginModal}
            className={cn(
              "w-full flex items-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs transition-colors shadow-xs active:scale-[0.98]",
              isCollapsed ? "justify-center p-2.5" : "justify-center gap-2 px-3 py-2"
            )}
            title="Đăng nhập tài khoản"
          >
            <LogIn className="size-4 shrink-0" />
            {!isCollapsed && <span>Đăng Nhập</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
