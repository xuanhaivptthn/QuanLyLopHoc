"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { Classroom, Student, AttendanceSession, User } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Zap,
  Plus,
  User as UserIcon,
  GraduationCap,
  ClipboardList,
  BookOpen,
  Building2,
  Rocket,
  Smartphone,
  BarChart3,
  Link as LinkIcon,
  Bell,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  ArrowUp,
  ArrowDown,
  Trash2,
  RotateCcw,
  X,
  Sparkles,
  ExternalLink,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickActionItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: "neutral" | "blue" | "emerald" | "amber" | "violet" | "rose" | "indigo";
  targetType: "tab" | "modal" | "url";
  targetValue: string;
  enabled: boolean;
  isCustom?: boolean;
}

const DEFAULT_QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: "qr_attendance",
    label: "Điểm Danh QR 30s",
    description: "Khởi tạo mã QR động điểm danh ngay",
    icon: "zap",
    color: "neutral",
    targetType: "tab",
    targetValue: "attendance",
    enabled: true,
  },
  {
    id: "new_class",
    label: "Tạo Lớp Học Mới",
    description: "Thêm lớp học hoặc học phần giảng dạy",
    icon: "plus",
    color: "neutral",
    targetType: "modal",
    targetValue: "new_class",
    enabled: true,
  },
  {
    id: "new_student",
    label: "Thêm Sinh Viên",
    description: "Cấp mã và lưu hồ sơ sinh viên",
    icon: "user",
    color: "neutral",
    targetType: "modal",
    targetValue: "new_student",
    enabled: true,
  },
  {
    id: "view_classrooms",
    label: "Quản Lý Lớp Học",
    description: "Xem danh sách lớp & sinh viên theo lớp",
    icon: "school",
    color: "neutral",
    targetType: "tab",
    targetValue: "classrooms",
    enabled: true,
  },
  {
    id: "view_students",
    label: "Hồ Sơ Sinh Viên",
    description: "Xem toàn bộ sinh viên & xuất danh sách CSV",
    icon: "clipboard",
    color: "neutral",
    targetType: "tab",
    targetValue: "students",
    enabled: true,
  },
  {
    id: "swagger_docs",
    label: "Tài Liệu API",
    description: "Mở tài liệu OpenAPI / Swagger UI",
    icon: "book-open",
    color: "neutral",
    targetType: "url",
    targetValue: "http://localhost:8080/api/swagger-ui.html",
    enabled: false,
  },
  {
    id: "manage_org",
    label: "Quản Trị Cơ Sở",
    description: "Cấu hình trung tâm đào tạo & mời giảng viên",
    icon: "building",
    color: "neutral",
    targetType: "tab",
    targetValue: "org",
    enabled: false,
  },
];

const LOCAL_STORAGE_KEY = "eduattend_custom_quick_actions";

// Helper to render Lucide icon from string key or legacy emoji
export function renderActionIcon(iconKey: string, className = "size-4") {
  switch (iconKey) {
    case "zap":
    case "\u26A1":
      return <Zap className={className} />;
    case "plus":
    case "\u2795":
      return <Plus className={className} />;
    case "user":
    case "\uD83D\uDC64":
      return <UserIcon className={className} />;
    case "school":
    case "\uD83C\uDFEB":
    case "\uD83C\uDF93":
      return <GraduationCap className={className} />;
    case "clipboard":
    case "\uD83D\uDCCB":
      return <ClipboardList className={className} />;
    case "book-open":
    case "\uD83D\uDCD6":
      return <BookOpen className={className} />;
    case "building":
    case "\uD83C\uDFE2":
    case "\uD83C\uDFDB\uFE0F":
    case "\uD83C\uDFDB":
      return <Building2 className={className} />;
    case "rocket":
    case "\uD83D\uDE80":
      return <Rocket className={className} />;
    case "calendar":
    case "\uD83D\uDCC5":
    case "\uD83D\uDDD3\uFE0F":
    case "\uD83D\uDDD3":
      return <Calendar className={className} />;
    case "smartphone":
    case "\uD83D\uDCF1":
      return <Smartphone className={className} />;
    case "bar-chart":
    case "\uD83D\uDCCA":
      return <BarChart3 className={className} />;
    case "link":
    case "\uD83D\uDD17":
      return <LinkIcon className={className} />;
    case "bell":
    case "\uD83D\uDD14":
      return <Bell className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

interface DashboardSectionProps {
  currentUser: User | null;
  classrooms: Classroom[];
  students: Student[];
  sessions: AttendanceSession[];
  onNavigateTab: (tab: "dashboard" | "classrooms" | "attendance" | "students" | "org") => void;
  onSelectClassroom?: (cls: Classroom) => void;
  onOpenNewClassModal: () => void;
  onOpenNewStudentModal: () => void;
}

export function DashboardSection({
  currentUser,
  classrooms,
  students,
  sessions,
  onNavigateTab,
  onSelectClassroom,
  onOpenNewClassModal,
  onOpenNewStudentModal,
}: DashboardSectionProps) {
  const [, startTransition] = useTransition();

  // Date and filter states
  const [todayStr, setTodayStr] = useState("");
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0); // 0 = today, -1 = yesterday, 1 = tomorrow
  const [filterView, setFilterView] = useState<"day" | "week" | "all">("day");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Action Edit State
  const [quickActions, setQuickActions] = useState<QuickActionItem[]>(DEFAULT_QUICK_ACTIONS);
  const [showEditActionsModal, setShowEditActionsModal] = useState(false);

  // New Custom Action Form State
  const [showAddCustomForm, setShowAddCustomForm] = useState(false);
  const [customActionForm, setCustomActionForm] = useState<{
    label: string;
    description: string;
    icon: string;
    color: QuickActionItem["color"];
    targetType: "tab" | "url";
    targetValue: string;
  }>({
    label: "",
    description: "",
    icon: "rocket",
    color: "neutral",
    targetType: "tab",
    targetValue: "attendance",
  });

  // Load date safely in useEffect
  useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0]);

    // Load saved quick actions from localStorage
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize legacy emoji icons to clean string keys
          const normalized = parsed.map((item: QuickActionItem) => {
            let icon = item.icon;
            if (icon === "\u26A1") icon = "zap";
            else if (icon === "\u2795") icon = "plus";
            else if (icon === "\uD83D\uDC64") icon = "user";
            else if (icon === "\uD83C\uDFEB" || icon === "\uD83C\uDF93") icon = "school";
            else if (icon === "\uD83D\uDCCB") icon = "clipboard";
            else if (icon === "\uD83D\uDCD6") icon = "book-open";
            else if (icon === "\uD83C\uDFE2" || icon === "\uD83C\uDFDB\uFE0F" || icon === "\uD83C\uDFDB") icon = "building";
            else if (icon === "\uD83D\uDE80") icon = "rocket";
            return { ...item, icon, color: "neutral" as const };
          });
          setQuickActions(normalized);
        }
      }
    } catch {
      // Ignored
    }
  }, []);

  // Save quick actions whenever changed
  const saveQuickActions = (newActions: QuickActionItem[]) => {
    setQuickActions(newActions);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newActions));
    } catch {
      // Ignored
    }
  };

  const handleActionClick = (action: QuickActionItem) => {
    if (action.targetType === "modal") {
      if (action.targetValue === "new_class") {
        onOpenNewClassModal();
      } else if (action.targetValue === "new_student") {
        onOpenNewStudentModal();
      }
    } else if (action.targetType === "tab") {
      startTransition(() => {
        onNavigateTab(action.targetValue as "dashboard" | "classrooms" | "attendance" | "students" | "org");
      });
    } else if (action.targetType === "url") {
      window.open(action.targetValue, "_blank", "noopener,noreferrer");
    }
  };

  const handleGoToAttendanceSession = (classroomId: string) => {
    startTransition(() => {
      const found = classrooms.find((c) => c.id === classroomId);
      if (found && onSelectClassroom) {
        onSelectClassroom(found);
      }
      onNavigateTab("attendance");
    });
  };

  // Reorder Action
  const moveAction = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= quickActions.length) return;
    const updated = [...quickActions];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    saveQuickActions(updated);
  };

  // Toggle Action Visibility
  const toggleActionEnabled = (id: string) => {
    const updated = quickActions.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a));
    saveQuickActions(updated);
  };

  // Delete Custom Action
  const deleteAction = (id: string) => {
    const updated = quickActions.filter((a) => a.id !== id);
    saveQuickActions(updated);
  };

  // Reset to Defaults
  const resetToDefaultActions = () => {
    saveQuickActions(DEFAULT_QUICK_ACTIONS);
    setShowAddCustomForm(false);
  };

  // Add Custom Action Submit
  const handleAddCustomAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customActionForm.label.trim()) return;

    const newAction: QuickActionItem = {
      id: `custom_${Date.now()}`,
      label: customActionForm.label.trim(),
      description: customActionForm.description.trim() || "Thao tác người dùng tùy chỉnh",
      icon: customActionForm.icon || "rocket",
      color: "neutral",
      targetType: customActionForm.targetType,
      targetValue: customActionForm.targetValue.trim(),
      enabled: true,
      isCustom: true,
    };

    saveQuickActions([...quickActions, newAction]);
    setCustomActionForm({
      label: "",
      description: "",
      icon: "rocket",
      color: "neutral",
      targetType: "tab",
      targetValue: "attendance",
    });
    setShowAddCustomForm(false);
  };

  // Current Target Date calculation
  const targetDateStr = useMemo(() => {
    if (!todayStr) return "";
    const date = new Date(todayStr);
    date.setDate(date.getDate() + selectedDayOffset);
    return date.toISOString().split("T")[0];
  }, [todayStr, selectedDayOffset]);

  // Current Target Date Formatted Label (e.g. "Thứ Hai, 02/11/2026")
  const targetDateFormatted = useMemo(() => {
    if (!targetDateStr) return "";
    const [y, m, d] = targetDateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayOfWeek = dayNames[dateObj.getDay()];
    return `${dayOfWeek}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }, [targetDateStr]);

  // 7 Days Pill Selector calculation
  const weekDays = useMemo(() => {
    if (!todayStr) return [];
    const baseDate = new Date(todayStr);
    const dayOfWeek = baseDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + diffToMonday);

    const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      const dayNum = d.getDate();
      const isToday = iso === todayStr;
      const isSelected = iso === targetDateStr;
      return {
        label: labels[i],
        dateNum: dayNum,
        iso,
        isToday,
        isSelected,
        offsetFromToday: Math.round((d.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)),
      };
    });
  }, [todayStr, targetDateStr]);

  // Filtered Sessions according to selected filter and search
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        if (filterView === "day") {
          if (s.sessionDate !== targetDateStr) return false;
        } else if (filterView === "week") {
          const isInWeek = weekDays.some((w) => w.iso === s.sessionDate);
          if (!isInWeek) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const codeMatch = s.classroomCode?.toLowerCase().includes(q);
          const nameMatch = s.classroomName?.toLowerCase().includes(q);
          return codeMatch || nameMatch;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.sessionDate !== b.sessionDate) {
          return a.sessionDate.localeCompare(b.sessionDate);
        }
        return a.startTime.localeCompare(b.startTime);
      });
  }, [sessions, filterView, targetDateStr, weekDays, searchQuery]);

  const activeQuickActions = quickActions.filter((a) => a.enabled);

  // High-level statistics
  const activeSessionCount = useMemo(() => {
    return sessions.filter((s) => s.status === "ACTIVE").length;
  }, [sessions]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Calendar className="size-5 text-foreground" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Thời Khóa Biểu &amp; Tác Vụ
            </h1>
            {currentUser?.activeOrganizationName && (
              <Badge variant="outline" className="text-xs">
                {currentUser.activeOrganizationName}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Lịch giảng dạy các ca học và thao tác nhanh điểm danh QR
          </p>
        </div>

        {/* Quick Date Switcher Controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <Button
            type="button"
            variant={selectedDayOffset === 0 && filterView === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedDayOffset(0);
              setFilterView("day");
            }}
            className="text-xs"
          >
            Hôm nay
          </Button>
          <Button
            type="button"
            variant={filterView === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterView(filterView === "week" ? "day" : "week")}
            className="text-xs"
          >
            Cả Tuần
          </Button>
          <Button
            type="button"
            variant={filterView === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterView(filterView === "all" ? "day" : "all")}
            className="text-xs"
          >
            Tất Cả Ca
          </Button>
        </div>
      </div>

      {/* Top Stat Overview Cards (Dominant Neutral, No Gradients) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="shadow-2xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-medium">Lớp Giảng Dạy</CardDescription>
            <GraduationCap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {classrooms.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Khóa học đang hoạt động</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-medium">Tổng Sinh Viên</CardDescription>
            <UserIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {students.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Hồ sơ đã ghi danh</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-medium">Tổng Ca Học</CardDescription>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {sessions.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Ca học trong hệ thống</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-border">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-medium">QR Đang Mở</CardDescription>
            <Zap className="size-4 text-foreground" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {activeSessionCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Ca điểm danh trực tiếp</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Left 2/3 Timetable, Right 1/3 Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: TIMETABLE */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Weekday Carousel / Pills */}
          {filterView !== "all" && weekDays.length > 0 && (
            <Card className="p-3 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-1 mb-2">
                <span>Tuần này • {targetDateFormatted}</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setSelectedDayOffset((prev) => prev - 1)}
                    title="Ngày hôm trước"
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setSelectedDayOffset((prev) => prev + 1)}
                    title="Ngày tiếp theo"
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Day Selector Buttons */}
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                  const isCurrentTarget = day.isSelected && filterView === "day";
                  return (
                    <Button
                      key={day.iso}
                      type="button"
                      variant={isCurrentTarget ? "default" : day.isToday ? "secondary" : "ghost"}
                      onClick={() => {
                        setSelectedDayOffset(day.offsetFromToday);
                        setFilterView("day");
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center h-14 p-1 rounded-md text-xs relative",
                        day.isToday && !isCurrentTarget && "border border-border"
                      )}
                    >
                      <span className="text-[10px] font-normal opacity-75">{day.label}</span>
                      <span className="text-sm font-bold">{day.dateNum}</span>
                      {day.isToday && !isCurrentTarget && (
                        <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Timetable Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {filterView === "day"
                  ? `Lịch ca học ngày ${targetDateStr}`
                  : filterView === "week"
                  ? "Toàn bộ ca học trong tuần"
                  : "Toàn bộ danh sách ca học"}
              </span>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {filteredSessions.length} ca
              </Badge>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-60">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã hoặc tên lớp..."
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
          </div>

          {/* Timetable Sessions List */}
          <div className="flex flex-col gap-2.5">
            {filteredSessions.length === 0 ? (
              <Card className="p-8 text-center shadow-2xs">
                <div className="size-12 mx-auto rounded-lg bg-muted text-muted-foreground flex items-center justify-center mb-3">
                  <Calendar className="size-6" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  Không có ca học nào trong khoảng thời gian này
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                  Bạn chưa có lịch lên lớp hoặc các ca học đã kết thúc. Bạn có thể lên lịch ca học mới để bắt đầu điểm danh.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onNavigateTab("attendance")}
                  className="mx-auto"
                >
                  <Zap className="size-3.5" data-icon="inline-start" />
                  Lên Lịch / Mở Điểm Danh Mới
                </Button>
              </Card>
            ) : (
              filteredSessions.map((session) => {
                const total = session.totalStudents || 0;
                const checkedIn = (session.presentCount || 0) + (session.lateCount || 0);
                const percent = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
                const isActive = session.status === "ACTIVE";

                return (
                  <Card
                    key={session.id}
                    className={cn(
                      "p-3.5 transition-colors shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group",
                      isActive
                        ? "border-foreground ring-1 ring-border"
                        : "hover:border-foreground/40"
                    )}
                  >
                    {/* Time Slot & Left Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Time Slot Container */}
                      <div
                        className={cn(
                          "p-2 rounded-md flex flex-col items-center justify-center shrink-0 min-w-16 text-center",
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <span className="text-[10px] uppercase font-mono opacity-80">
                          {session.startTime}
                        </span>
                        <span className="text-xs font-bold font-mono">
                          {session.endTime}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {session.classroomCode}
                          </Badge>
                          <h4 className="text-xs font-bold text-foreground truncate">
                            {session.classroomName}
                          </h4>
                          {isActive && (
                            <Badge variant="default" className="text-[10px] font-semibold">
                              QR ĐANG MỞ
                            </Badge>
                          )}
                          {session.status === "COMPLETED" && (
                            <Badge variant="secondary" className="text-[10px]">
                              Đã kết thúc
                            </Badge>
                          )}
                          {session.status === "SCHEDULED" && (
                            <Badge variant="outline" className="text-[10px]">
                              Sắp diễn ra
                            </Badge>
                          )}
                        </div>

                        {/* Attendance Counter & Date info */}
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="size-3" />
                            {session.sessionDate}
                          </span>
                          <span>•</span>
                          <span>
                            Sĩ số: <strong className="text-foreground">{total}</strong> SV
                          </span>
                          <span>•</span>
                          <span className="font-medium text-foreground">
                            Có mặt: {checkedIn}/{total} ({percent}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden mt-0.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Action Button */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                        onClick={() => handleGoToAttendanceSession(session.classroomId)}
                        className="text-xs"
                      >
                        <Zap className="size-3.5" data-icon="inline-start" />
                        <span>{isActive ? "Xem QR Điểm Danh" : "Vào Điểm Danh"}</span>
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: QUICK ACTIONS */}
        <div className="flex flex-col gap-4">
          <Card className="p-4 shadow-2xs">
            {/* Header with Edit Button */}
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-foreground" />
                <h3 className="text-xs font-bold tracking-tight text-foreground uppercase">
                  Thao Tác Nhanh
                </h3>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEditActionsModal(true)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                title="Tùy chỉnh danh sách thao tác nhanh"
              >
                <Settings className="size-3.5" data-icon="inline-start" />
                <span>Tùy chỉnh</span>
              </Button>
            </div>

            {/* Actions List */}
            <div className="flex flex-col gap-2">
              {activeQuickActions.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Chưa có thao tác nào được bật. Nhấn &quot;Tùy chỉnh&quot; để chọn thao tác hiển thị.
                </div>
              ) : (
                activeQuickActions.map((action) => {
                  return (
                    <Button
                      key={action.id}
                      type="button"
                      variant="outline"
                      onClick={() => handleActionClick(action)}
                      className="w-full h-auto p-2.5 justify-between items-center text-left hover:bg-muted/60"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-7 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0 border border-border">
                          {renderActionIcon(action.icon, "size-3.5")}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {action.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal truncate">
                            {action.description}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="size-3.5 text-muted-foreground shrink-0 ml-1" />
                    </Button>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL: CUSTOMIZE QUICK ACTION LIST */}
      {showEditActionsModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Settings className="size-4" />
                  Tùy Chỉnh Danh Sách Thao Tác Nhanh
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bật/tắt, sắp xếp thứ tự hoặc tạo thêm thao tác tùy chỉnh của bạn
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowEditActionsModal(false);
                  setShowAddCustomForm(false);
                }}
                className="size-7"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Danh sách thao tác ({quickActions.length})
                </span>

                {quickActions.map((action, index) => {
                  return (
                    <div
                      key={action.id}
                      className="p-2.5 rounded-lg border border-border bg-muted/30 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={action.enabled}
                          onChange={() => toggleActionEnabled(action.id)}
                          className="size-4 rounded border-border text-foreground focus:ring-ring"
                        />
                        <div className="size-7 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0 border border-border">
                          {renderActionIcon(action.icon, "size-3.5")}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span
                            className={cn(
                              "text-xs font-semibold truncate",
                              action.enabled ? "text-foreground" : "text-muted-foreground line-through"
                            )}
                          >
                            {action.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {action.description}
                          </span>
                        </div>
                      </div>

                      {/* Reorder and Delete controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => moveAction(index, "up")}
                          className="size-7"
                          title="Di chuyển lên"
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === quickActions.length - 1}
                          onClick={() => moveAction(index, "down")}
                          className="size-7"
                          title="Di chuyển xuống"
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                        {action.isCustom && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAction(action.id)}
                            className="size-7 text-destructive hover:bg-destructive/10"
                            title="Xóa thao tác tùy chỉnh"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Action Toggle */}
              {!showAddCustomForm ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddCustomForm(true)}
                  className="w-full border-dashed"
                >
                  <Plus className="size-3.5" data-icon="inline-start" />
                  Tạo Thao Tác Mới
                </Button>
              ) : (
                /* Custom Action Creation Form */
                <form
                  onSubmit={handleAddCustomAction}
                  className="p-3.5 rounded-lg bg-muted/40 border border-border flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Tạo Thao Tác Nhanh Tùy Chỉnh
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddCustomForm(false)}
                      className="h-6 text-xs text-muted-foreground"
                    >
                      Hủy
                    </Button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-foreground">
                      Tên thao tác *
                    </label>
                    <Input
                      type="text"
                      required
                      value={customActionForm.label}
                      onChange={(e) => setCustomActionForm({ ...customActionForm, label: e.target.value })}
                      placeholder="Ví dụ: Lịch Thi Cuối Kỳ"
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-foreground">
                      Mô tả ngắn
                    </label>
                    <Input
                      type="text"
                      value={customActionForm.description}
                      onChange={(e) => setCustomActionForm({ ...customActionForm, description: e.target.value })}
                      placeholder="Ví dụ: Tra cứu lịch thi & phòng thi"
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-foreground">
                        Biểu tượng
                      </label>
                      <select
                        value={customActionForm.icon}
                        onChange={(e) => setCustomActionForm({ ...customActionForm, icon: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-md text-xs bg-background border border-border text-foreground"
                      >
                        <option value="rocket">Rocket (Khởi chạy nhanh)</option>
                        <option value="zap">Zap (Tia chớp / Điểm danh)</option>
                        <option value="smartphone">Mobile (Thiết bị di động)</option>
                        <option value="school">Classroom (Lớp học / Giảng đường)</option>
                        <option value="user">User (Sinh viên / Người dùng)</option>
                        <option value="bar-chart">Bar Chart (Thống kê)</option>
                        <option value="calendar">Calendar (Lịch / Thời gian)</option>
                        <option value="link">Link (Liên kết web)</option>
                        <option value="bell">Notification (Thông báo)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-foreground">
                        Loại hành động
                      </label>
                      <select
                        value={customActionForm.targetType}
                        onChange={(e) =>
                          setCustomActionForm({ ...customActionForm, targetType: e.target.value as "tab" | "url" })
                        }
                        className="w-full px-2.5 py-1.5 rounded-md text-xs bg-background border border-border text-foreground"
                      >
                        <option value="tab">Chuyển màn hình (Tab)</option>
                        <option value="url">Mở liên kết web (URL)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-foreground">
                      Điểm đến (Tab / URL)
                    </label>
                    {customActionForm.targetType === "tab" ? (
                      <select
                        value={customActionForm.targetValue}
                        onChange={(e) => setCustomActionForm({ ...customActionForm, targetValue: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-md text-xs bg-background border border-border text-foreground"
                      >
                        <option value="attendance">Điểm danh QR</option>
                        <option value="classrooms">Lớp học</option>
                        <option value="students">Hồ sơ sinh viên</option>
                        <option value="org">Tổ chức &amp; Cơ sở</option>
                      </select>
                    ) : (
                      <Input
                        type="url"
                        required
                        value={customActionForm.targetValue}
                        onChange={(e) => setCustomActionForm({ ...customActionForm, targetValue: e.target.value })}
                        placeholder="https://..."
                        className="h-8 text-xs bg-background"
                      />
                    )}
                  </div>

                  <Button type="submit" size="sm" className="w-full">
                    Lưu Thao Tác Mới
                  </Button>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-border bg-muted/20 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetToDefaultActions}
                className="text-xs text-muted-foreground"
              >
                <RotateCcw className="size-3.5" data-icon="inline-start" />
                Khôi phục mặc định
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setShowEditActionsModal(false);
                  setShowAddCustomForm(false);
                }}
              >
                Hoàn Tất
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
