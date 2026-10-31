"use client";

import React, { useTransition } from "react";
import { Classroom, Student, AttendanceSession, User } from "@/types";

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

  // Metrics calculation
  const [todayStr, setTodayStr] = React.useState("");

  React.useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0]);
  }, []);

  const totalClassrooms = classrooms.length;
  const totalStudents = students.length;
  const todaySessions = sessions.filter((s) => s.sessionDate === todayStr);

  const totalAttendees = sessions.reduce((acc, s) => acc + (s.totalStudents || 0), 0);
  const totalPresents = sessions.reduce((acc, s) => acc + (s.presentCount || 0) + (s.lateCount || 0), 0);
  const attendanceRate = totalAttendees > 0 ? Math.round((totalPresents / totalAttendees) * 100) : 92;

  const activeSessions = sessions.filter((s) => s.status === "ACTIVE");

  const handleGoToAttendance = (clsId?: string) => {
    startTransition(() => {
      if (clsId) {
        const found = classrooms.find((c) => c.id === clsId);
        if (found && onSelectClassroom) onSelectClassroom(found);
      }
      onNavigateTab("attendance");
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-bold text-white/90">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                {currentUser?.activeOrganizationName
                  ? `${currentUser.activeOrganizationName} • Học kỳ 2026-1`
                  : "Tài khoản cá nhân • Học kỳ 2026-1"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Xin chào, {currentUser?.fullName || "Giảng viên / Quản trị viên"}!
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Hệ thống quản lý lớp học và điểm danh tự động bằng Dynamic QR Code 30 giây.
              Giám sát chuyên cần sinh viên tức thì theo thời gian thực.
            </p>
          </div>

          {/* Quick Action in Hero */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleGoToAttendance()}
              className="px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-md transition-all transform hover:-translate-y-0.5"
            >
              ⚡ Bắt Đầu Điểm Danh QR
            </button>
            <button
              type="button"
              onClick={onOpenNewClassModal}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs backdrop-blur-md border border-white/20 transition-all"
            >
              ➕ Thêm Lớp Học
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Classrooms */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lớp Học Hoạt Động
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {totalClassrooms}
            </div>
            <div className="mt-1 flex items-center text-xs text-slate-500">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Đang giảng dạy</span>
              <span className="mx-1.5">•</span>
              <span>Kỳ 2026-1</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Enrolled Students */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng Sinh Viên
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {totalStudents}
            </div>
            <div className="mt-1 flex items-center text-xs text-slate-500">
              <span className="text-blue-600 dark:text-blue-400 font-medium">Đã cấp mã số sinh viên</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Today's Sessions */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-amber-400 dark:hover:border-amber-500 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ca Học Hôm Nay
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {todaySessions.length}
            </div>
            <div className="mt-1 flex items-center text-xs text-slate-500">
              {activeSessions.length > 0 ? (
                <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {activeSessions.length} ca đang mở QR
                </span>
              ) : (
                <span>Không có ca học nào đang mở</span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 4: Attendance Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tỷ Lệ Chuyên Cần
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {attendanceRate}%
              </div>
              <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                Đúng giờ &amp; Có phép
              </div>
            </div>
            {/* Visual Mini Ring */}
            <div className="w-11 h-11 relative flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500"
                  strokeDasharray={`${attendanceRate}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule & Live Session Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Class Schedule */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Lịch Học &amp; Điểm Danh Hôm Nay ({todayStr})
              </h2>
              <p className="text-xs text-slate-500">
                Các ca học được xếp lịch và trạng thái điểm danh trực tiếp
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleGoToAttendance()}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Xem tất cả ca học &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 italic">
                Chưa có ca học nào được thiết lập. Hãy tạo ca học trong phần &quot;Điểm danh &amp; Dynamic QR&quot;.
              </div>
            ) : (
              sessions.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {s.classroomCode}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {s.classroomName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 animate-pulse"
                            : s.status === "COMPLETED"
                            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                        }`}
                      >
                        {s.status === "ACTIVE" ? "ĐANG MỞ QR" : s.status === "COMPLETED" ? "ĐÃ KẾT THÚC" : "SẮP DIỄN RA"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>Ca: {s.startTime} - {s.endTime}</span>
                      <span>•</span>
                      <span>Sĩ số: {s.totalStudents}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Có mặt: {s.presentCount + (s.lateCount || 0)}/{s.totalStudents}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGoToAttendance(s.classroomId)}
                    className="self-end sm:self-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors"
                  >
                    Vào Điểm Danh
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Quick Actions & Live Activity */}
        <div className="space-y-6">
          {/* Quick Shortcuts */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tác Vụ Nhanh (Shortcuts)
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onNavigateTab("classrooms")}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-center transition-all group"
              >
                <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  🏫
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Quản lý lớp</span>
              </button>

              <button
                type="button"
                onClick={onOpenNewStudentModal}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-center transition-all group"
              >
                <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  👤
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Thêm sinh viên</span>
              </button>

              <button
                type="button"
                onClick={() => handleGoToAttendance()}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-center transition-all group"
              >
                <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  📱
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Dynamic QR</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab("org")}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-center transition-all group"
              >
                <span className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  🏢
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Trung tâm/Trường</span>
              </button>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 shadow-sm space-y-2">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Bảo Mật Dynamic QR 30s
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mã QR tự động xoay vòng mỗi 30 giây với thuật toán Token Cryptographic UUID,
              ngăn chặn tuyệt đối việc chia sẻ ảnh chụp màn hình cho bạn bè điểm danh hộ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
