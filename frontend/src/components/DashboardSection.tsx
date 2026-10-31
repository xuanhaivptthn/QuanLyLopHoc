"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { Classroom, Student, AttendanceSession, User } from "@/types";

export interface QuickActionItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: "blue" | "emerald" | "amber" | "violet" | "rose" | "indigo";
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
    icon: "⚡",
    color: "emerald",
    targetType: "tab",
    targetValue: "attendance",
    enabled: true,
  },
  {
    id: "new_class",
    label: "Tạo Lớp Học Mới",
    description: "Thêm lớp học hoặc học phần giảng dạy",
    icon: "➕",
    color: "blue",
    targetType: "modal",
    targetValue: "new_class",
    enabled: true,
  },
  {
    id: "new_student",
    label: "Thêm Sinh Viên",
    description: "Cấp mã và lưu hồ sơ sinh viên",
    icon: "👤",
    color: "indigo",
    targetType: "modal",
    targetValue: "new_student",
    enabled: true,
  },
  {
    id: "view_classrooms",
    label: "Quản Lý Lớp Học",
    description: "Xem danh sách lớp & sinh viên theo lớp",
    icon: "🏫",
    color: "violet",
    targetType: "tab",
    targetValue: "classrooms",
    enabled: true,
  },
  {
    id: "view_students",
    label: "Hồ Sơ Sinh Viên",
    description: "Xem toàn bộ sinh viên & xuất danh sách CSV",
    icon: "📋",
    color: "amber",
    targetType: "tab",
    targetValue: "students",
    enabled: true,
  },
  {
    id: "swagger_docs",
    label: "Tài Liệu API",
    description: "Mở tài liệu OpenAPI / Swagger UI",
    icon: "📖",
    color: "rose",
    targetType: "url",
    targetValue: "http://localhost:8080/api/swagger-ui.html",
    enabled: false,
  },
  {
    id: "manage_org",
    label: "Quản Trị Cơ Sở",
    description: "Cấu hình trung tâm đào tạo & mời giảng viên",
    icon: "🏢",
    color: "indigo",
    targetType: "tab",
    targetValue: "org",
    enabled: false,
  },
];

const LOCAL_STORAGE_KEY = "eduattend_custom_quick_actions";

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
    color: "blue" | "emerald" | "amber" | "violet" | "rose" | "indigo";
    targetType: "tab" | "url";
    targetValue: string;
  }>({
    label: "",
    description: "",
    icon: "🚀",
    color: "blue",
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
          setQuickActions(parsed);
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
      icon: customActionForm.icon || "🚀",
      color: customActionForm.color,
      targetType: customActionForm.targetType,
      targetValue: customActionForm.targetValue.trim(),
      enabled: true,
      isCustom: true,
    };

    saveQuickActions([...quickActions, newAction]);
    setCustomActionForm({
      label: "",
      description: "",
      icon: "🚀",
      color: "blue",
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
    const dayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday...
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
    return sessions.filter((s) => {
      // Date filter
      if (filterView === "day") {
        if (s.sessionDate !== targetDateStr) return false;
      } else if (filterView === "week") {
        const isInWeek = weekDays.some((w) => w.iso === s.sessionDate);
        if (!isInWeek) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = s.classroomCode?.toLowerCase().includes(q);
        const nameMatch = s.classroomName?.toLowerCase().includes(q);
        return codeMatch || nameMatch;
      }

      return true;
    }).sort((a, b) => {
      // Sort by date then start time
      if (a.sessionDate !== b.sessionDate) {
        return a.sessionDate.localeCompare(b.sessionDate);
      }
      return a.startTime.localeCompare(b.startTime);
    });
  }, [sessions, filterView, targetDateStr, weekDays, searchQuery]);

  const activeQuickActions = quickActions.filter((a) => a.enabled);

  const getActionColorClasses = (color: QuickActionItem["color"]) => {
    switch (color) {
      case "emerald":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/40",
          text: "text-emerald-600 dark:text-emerald-400",
          border: "hover:border-emerald-300 dark:hover:border-emerald-700",
          badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        };
      case "indigo":
        return {
          bg: "bg-indigo-50 dark:bg-indigo-950/40",
          text: "text-indigo-600 dark:text-indigo-400",
          border: "hover:border-indigo-300 dark:hover:border-indigo-700",
          badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
        };
      case "violet":
        return {
          bg: "bg-violet-50 dark:bg-violet-950/40",
          text: "text-violet-600 dark:text-violet-400",
          border: "hover:border-violet-300 dark:hover:border-violet-700",
          badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        };
      case "amber":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/40",
          text: "text-amber-600 dark:text-amber-400",
          border: "hover:border-amber-300 dark:hover:border-amber-700",
          badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        };
      case "rose":
        return {
          bg: "bg-rose-50 dark:bg-rose-950/40",
          text: "text-rose-600 dark:text-rose-400",
          border: "hover:border-rose-300 dark:hover:border-rose-700",
          badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        };
      case "blue":
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-950/40",
          text: "text-blue-600 dark:text-blue-400",
          border: "hover:border-blue-300 dark:hover:border-blue-700",
          badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar: Clean & Focused */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>📅 Thời Khóa Biểu &amp; Tác Vụ</span>
            {currentUser?.activeOrganizationName && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                {currentUser.activeOrganizationName}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Lịch giảng dạy các ca học và thao tác nhanh điểm danh QR
          </p>
        </div>

        {/* Quick Date Switcher Controls */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => {
              setSelectedDayOffset(0);
              setFilterView("day");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedDayOffset === 0 && filterView === "day"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60"
            }`}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => setFilterView(filterView === "week" ? "day" : "week")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterView === "week"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60"
            }`}
          >
            Cả Tuần
          </button>
          <button
            type="button"
            onClick={() => setFilterView(filterView === "all" ? "day" : "all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterView === "all"
                ? "bg-violet-600 text-white shadow-sm shadow-violet-500/25"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60"
            }`}
          >
            Tất Cả Ca
          </button>
        </div>
      </div>

      {/* Main Grid: Left 2/3 Timetable, Right 1/3 Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ========================================================
            LEFT COLUMN (2/3): TIMETABLE (Thời Khóa Biểu)
           ======================================================== */}
        <div className="lg:col-span-2 space-y-4">
          {/* Weekday Carousel / Pills */}
          {filterView !== "all" && weekDays.length > 0 && (
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
                <span>Tuần này • {targetDateFormatted}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDayOffset((prev) => prev - 1)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                    title="Ngày hôm trước"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDayOffset((prev) => prev + 1)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                    title="Ngày tiếp theo"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Day Selector Buttons */}
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((day) => {
                  const isCurrentTarget = day.isSelected && filterView === "day";
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      onClick={() => {
                        setSelectedDayOffset(day.offsetFromToday);
                        setFilterView("day");
                      }}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-bold transition-all relative ${
                        isCurrentTarget
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                          : day.isToday
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span className="text-[10px] font-semibold opacity-75">{day.label}</span>
                      <span className="text-sm font-extrabold">{day.dateNum}</span>
                      {day.isToday && !isCurrentTarget && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timetable Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {filterView === "day"
                  ? `Lịch ca học ngày ${targetDateStr}`
                  : filterView === "week"
                  ? "Toàn bộ ca học trong tuần"
                  : "Toàn bộ danh sách ca học"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {filteredSessions.length} ca
              </span>
            </div>

            {/* Quick Search in Schedule */}
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã hoặc tên lớp..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              <svg
                className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Timetable Sessions List */}
          <div className="space-y-3">
            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-slate-400 flex items-center justify-center text-2xl shadow-inner">
                  ☕
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Không có ca học nào trong khoảng thời gian này
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                    Bạn chưa có lịch lên lớp hoặc các ca học đã kết thúc. Bạn có thể lên lịch ca học mới để bắt đầu điểm danh.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab("attendance")}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all inline-flex items-center gap-1.5"
                >
                  <span>⚡ Lên Lịch / Mở Điểm Danh Mới</span>
                </button>
              </div>
            ) : (
              filteredSessions.map((session) => {
                const total = session.totalStudents || 0;
                const checkedIn = (session.presentCount || 0) + (session.lateCount || 0);
                const percent = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
                const isActive = session.status === "ACTIVE";

                return (
                  <div
                    key={session.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                      isActive
                        ? "border-emerald-400 dark:border-emerald-600/80 ring-2 ring-emerald-500/10 shadow-emerald-500/5"
                        : "border-slate-200/80 dark:border-slate-800/80 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                  >
                    {/* Time Slot & Left Info */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Time Badge */}
                      <div
                        className={`p-2.5 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 min-w-18 text-center transition-colors ${
                          isActive
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                          {session.startTime}
                        </span>
                        <span className="text-xs font-black tracking-tight">
                          {session.endTime}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60">
                            {session.classroomCode}
                          </span>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {session.classroomName}
                          </h4>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              QR ĐANG MỞ
                            </span>
                          )}
                          {session.status === "COMPLETED" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Đã kết thúc
                            </span>
                          )}
                          {session.status === "SCHEDULED" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              Sắp diễn ra
                            </span>
                          )}
                        </div>

                        {/* Attendance Counter & Date info */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1 font-medium">
                            🗓️ {session.sessionDate}
                          </span>
                          <span>•</span>
                          <span className="font-medium">
                            Sĩ số: <strong className="text-slate-700 dark:text-slate-200">{total}</strong> SV
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Có mặt: {checkedIn}/{total} ({percent}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full max-w-xs bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Action Button */}
                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleGoToAttendanceSession(session.classroomId)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                          isActive
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                        }`}
                      >
                        <span>{isActive ? "⚡ Xem QR Điểm Danh" : "Vào Điểm Danh"}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN (1/3): QUICK ACTIONS (Thao Tác Nhanh)
           ======================================================== */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4">
            {/* Header with Edit Button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <h3 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Thao Tác Nhanh
                </h3>
              </div>

              {/* Edit Action List Button */}
              <button
                type="button"
                onClick={() => setShowEditActionsModal(true)}
                className="px-2.5 py-1 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors inline-flex items-center gap-1"
                title="Tùy chỉnh danh sách thao tác nhanh"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Tùy chỉnh</span>
              </button>
            </div>

            {/* Actions Grid / List */}
            <div className="space-y-2">
              {activeQuickActions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Chưa có thao tác nào được bật. Nhấn &quot;Tùy chỉnh&quot; để chọn các thao tác bạn muốn hiển thị.
                </div>
              ) : (
                activeQuickActions.map((action) => {
                  const colors = getActionColorClasses(action.color);
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => handleActionClick(action)}
                      className={`w-full p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 ${colors.border} transition-all duration-200 flex items-center justify-between gap-3 text-left group active:scale-[0.99]`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center text-lg flex-shrink-0 shadow-2xs group-hover:scale-110 transition-transform`}
                        >
                          {action.icon}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {action.label}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {action.description}
                          </span>
                        </div>
                      </div>

                      <svg
                        className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transform group-hover:translate-x-0.5 transition-all flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick Helper Banner */}
            <div className="pt-2">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/15 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold">
                  <span>💡 Mẹo Giảng Viên</span>
                </div>
                <p className="text-[11px] text-blue-100 leading-snug">
                  Mã Dynamic QR tự động làm mới 30 giây để ngăn chặn chụp màn hình. Bạn có thể mở trực tiếp từ mục thời khóa biểu bên trái!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          MODAL: CUSTOMIZE QUICK ACTION LIST (Tùy Chỉnh Thao Tác)
         ======================================================== */}
      {showEditActionsModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  ⚙️ Tùy Chỉnh Danh Sách Thao Tác Nhanh
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Bật/tắt, sắp xếp thứ tự hoặc tạo thêm thao tác tùy chỉnh của bạn
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditActionsModal(false);
                  setShowAddCustomForm(false);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Đóng"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Actions List */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Danh sách thao tác ({quickActions.length})
                </span>

                {quickActions.map((action, index) => {
                  const colors = getActionColorClasses(action.color);
                  return (
                    <div
                      key={action.id}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Toggle Checkbox */}
                        <input
                          type="checkbox"
                          checked={action.enabled}
                          onChange={() => toggleActionEnabled(action.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                        />
                        <div
                          className={`w-8 h-8 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center text-base flex-shrink-0`}
                        >
                          {action.icon}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs font-bold truncate ${action.enabled ? "text-slate-900 dark:text-slate-100" : "text-slate-400 line-through"}`}>
                            {action.label}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
                            {action.description}
                          </span>
                        </div>
                      </div>

                      {/* Reorder and Delete controls */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveAction(index, "up")}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="Di chuyển lên"
                        >
                          ⬆️
                        </button>
                        <button
                          type="button"
                          disabled={index === quickActions.length - 1}
                          onClick={() => moveAction(index, "down")}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="Di chuyển xuống"
                        >
                          ⬇️
                        </button>
                        {action.isCustom && (
                          <button
                            type="button"
                            onClick={() => deleteAction(action.id)}
                            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-500 transition-colors ml-1"
                            title="Xóa thao tác tùy chỉnh"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Action Toggle */}
              {!showAddCustomForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddCustomForm(true)}
                  className="w-full py-2.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                >
                  <span>➕ Tạo Thao Tác Mới</span>
                </button>
              ) : (
                /* Custom Action Creation Form */
                <form onSubmit={handleAddCustomAction} className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-900 dark:text-blue-300">
                      Tạo Thao Tác Nhanh Tùy Chỉnh
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomForm(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Hủy
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Tên thao tác *
                    </label>
                    <input
                      type="text"
                      required
                      value={customActionForm.label}
                      onChange={(e) => setCustomActionForm({ ...customActionForm, label: e.target.value })}
                      placeholder="Ví dụ: Lịch Thi Cuối Kỳ"
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Mô tả ngắn
                    </label>
                    <input
                      type="text"
                      value={customActionForm.description}
                      onChange={(e) => setCustomActionForm({ ...customActionForm, description: e.target.value })}
                      placeholder="Ví dụ: Tra cứu lịch thi & phòng thi"
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Icon Emoji
                      </label>
                      <select
                        value={customActionForm.icon}
                        onChange={(e) => setCustomActionForm({ ...customActionForm, icon: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="🚀">🚀 Tên lửa</option>
                        <option value="⚡">⚡ Sấm sét</option>
                        <option value="📱">📱 Điện thoại</option>
                        <option value="🏫">🏫 Trường học</option>
                        <option value="👤">👤 Sinh viên</option>
                        <option value="📊">📊 Thống kê</option>
                        <option value="📅">📅 Lịch</option>
                        <option value="🔗">🔗 Liên kết</option>
                        <option value="🎓">🎓 Bằng cấp</option>
                        <option value="🔔">🔔 Thông báo</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Màu sắc
                      </label>
                      <select
                        value={customActionForm.color}
                        onChange={(e) => setCustomActionForm({ ...customActionForm, color: e.target.value as QuickActionItem["color"] })}
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="blue">Xanh dương</option>
                        <option value="emerald">Xanh lá (Emerald)</option>
                        <option value="indigo">Xanh chàm (Indigo)</option>
                        <option value="violet">Tím (Violet)</option>
                        <option value="amber">Vàng hổ phách</option>
                        <option value="rose">Hồng đào (Rose)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Hành động khi nhấn
                      </label>
                      <select
                        value={customActionForm.targetType}
                        onChange={(e) => setCustomActionForm({ ...customActionForm, targetType: e.target.value as "tab" | "url" })}
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="tab">Chuyển sang màn hình (Tab)</option>
                        <option value="url">Mở đường dẫn web (URL)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Điểm đến (Tab / URL)
                      </label>
                      {customActionForm.targetType === "tab" ? (
                        <select
                          value={customActionForm.targetValue}
                          onChange={(e) => setCustomActionForm({ ...customActionForm, targetValue: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                          <option value="attendance">Điểm danh QR</option>
                          <option value="classrooms">Lớp học</option>
                          <option value="students">Hồ sơ sinh viên</option>
                          <option value="org">Tổ chức &amp; Cơ sở</option>
                        </select>
                      ) : (
                        <input
                          type="url"
                          required
                          value={customActionForm.targetValue}
                          onChange={(e) => setCustomActionForm({ ...customActionForm, targetValue: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
                  >
                    Lưu Thao Tác Mới
                  </button>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
              <button
                type="button"
                onClick={resetToDefaultActions}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
              >
                🔄 Khôi phục mặc định
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowEditActionsModal(false);
                  setShowAddCustomForm(false);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                Hoàn Tất &amp; Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
