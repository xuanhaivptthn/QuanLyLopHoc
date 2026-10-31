"use client";

import React, { useMemo } from "react";
import { Classroom, Student, AttendanceSession, User } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  Calendar,
  Zap,
  Plus,
  UserPlus,
  Clock,
  ArrowRight,
  Building2,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

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
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Compute metrics from actual backend data
  const totalClassrooms = classrooms.length;
  const totalStudents = students.length;
  const totalSessions = sessions.length;

  const { overallRate, todaySessions, upcomingSessions } = useMemo(() => {
    let totalRoster = 0;
    let totalPresent = 0;

    sessions.forEach((s) => {
      totalRoster += s.totalStudents || 0;
      totalPresent += (s.presentCount || 0) + (s.lateCount || 0);
    });

    const rate = totalRoster > 0 ? Math.round((totalPresent / totalRoster) * 100) : 0;

    // Filter today's sessions
    const today = sessions.filter((s) => s.sessionDate === todayStr);

    // Sorted sessions (most recent first)
    const sorted = [...sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));

    return {
      overallRate: rate,
      todaySessions: today,
      upcomingSessions: sorted.slice(0, 5),
    };
  }, [sessions, todayStr]);

  const activeWorkspaceName =
    currentUser?.activeOrganizationName || "Tài khoản cá nhân / Giảng viên độc lập";

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Banner */}
      <Card className="p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Xin chào, {currentUser?.fullName || "Giảng viên"}!
            </h1>
            <Badge variant="outline" className="font-mono text-[10px]">
              {currentUser?.role === "CENTER_ADMIN"
                ? "Quản trị trung tâm"
                : currentUser?.role === "TEACHER"
                ? "Giảng viên"
                : "Người dùng"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="size-3.5" />
            <span>Không gian làm việc:</span>
            <strong className="text-foreground">{activeWorkspaceName}</strong>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenNewClassModal}
            className="text-xs gap-1.5"
          >
            <Plus className="size-3.5" />
            Tạo lớp học
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onNavigateTab("attendance")}
            className="text-xs gap-1.5"
          >
            <Zap className="size-3.5" />
            Vào phòng điểm danh
          </Button>
        </div>
      </Card>

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Classrooms */}
        <Card
          onClick={() => onNavigateTab("classrooms")}
          className="p-4 shadow-xs hover:border-primary/50 transition-colors cursor-pointer flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Tổng lớp học</span>
            <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-foreground">
              <BookOpen className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">{totalClassrooms}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Lớp đang giảng dạy</p>
          </div>
        </Card>

        {/* Metric 2: Students */}
        <Card
          onClick={() => onNavigateTab("students")}
          className="p-4 shadow-xs hover:border-primary/50 transition-colors cursor-pointer flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Tổng sinh viên</span>
            <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-foreground">
              <Users className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">{totalStudents}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Hồ sơ trong danh bạ</p>
          </div>
        </Card>

        {/* Metric 3: Sessions */}
        <Card
          onClick={() => onNavigateTab("attendance")}
          className="p-4 shadow-xs hover:border-primary/50 transition-colors cursor-pointer flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Ca điểm danh</span>
            <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-foreground">
              <Calendar className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">{totalSessions}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Buổi học đã khởi tạo</p>
          </div>
        </Card>

        {/* Metric 4: Attendance Rate */}
        <Card className="p-4 shadow-xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Tỷ lệ chuyên cần</span>
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-primary">{overallRate}%</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Trung bình các ca học</p>
          </div>
        </Card>
      </div>

      {/* Main Grid: Today's Schedule vs Recent Classrooms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Ca học hôm nay & Gần nhất */}
        <Card className="lg:col-span-2 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-foreground" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Lịch Ca Học Hôm Nay &amp; Gần Nhất
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab("attendance")}
              className="text-xs h-7 gap-1"
            >
              Xem tất cả ca học
              <ArrowRight className="size-3" />
            </Button>
          </div>

          <div className="p-4 flex-1">
            {todaySessions.length > 0 ? (
              <div className="space-y-3 mb-4">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Ca học diễn ra hôm nay ({todaySessions.length}):
                </div>
                {todaySessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {session.classroomCode}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {session.startTime} - {session.endTime}
                        </Badge>
                        <Badge variant="default" className="text-[9px] uppercase font-mono">
                          {session.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{session.classroomName}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-xs font-mono text-muted-foreground">
                        {session.presentCount} / {session.totalStudents} có mặt
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onNavigateTab("attendance")}
                        className="h-8 text-xs gap-1"
                      >
                        <Zap className="size-3" />
                        Điểm danh ngay
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {upcomingSessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                Chưa có ca học nào được khởi tạo trong hệ thống.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">
                  Các ca học gần nhất:
                </div>
                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 hover:bg-muted/30 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-foreground">
                          {session.sessionDate}
                        </span>
                        <div>
                          <div className="font-semibold text-foreground">
                            {session.classroomCode} - {session.classroomName}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {session.startTime} - {session.endTime}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px] font-mono uppercase">
                          {session.status}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigateTab("attendance")}
                          className="h-7 text-xs"
                        >
                          Điểm danh
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Right Col: Quick Access Classrooms */}
        <Card className="shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-foreground" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Lớp Học Đang Mở ({totalClassrooms})
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab("classrooms")}
              className="text-xs h-7"
            >
              Xem tất cả
            </Button>
          </div>

          <div className="p-4 flex-1">
            {classrooms.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center gap-2">
                <BookOpen className="size-6 text-muted-foreground stroke-1" />
                <p className="text-xs text-muted-foreground">Chưa có lớp học nào</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenNewClassModal}
                  className="text-xs mt-1"
                >
                  <Plus className="size-3" />
                  Tạo lớp đầu tiên
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {classrooms.slice(0, 4).map((cls) => (
                  <div
                    key={cls.id}
                    onClick={() => {
                      if (onSelectClassroom) onSelectClassroom(cls);
                      onNavigateTab("classrooms");
                    }}
                    className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-foreground">
                          {cls.code}
                        </span>
                        <Badge variant="secondary" className="text-[9px] font-mono">
                          {cls.semester}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {cls.name}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-semibold text-foreground">
                        {cls.totalStudents ?? 0} SV
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-muted/20 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenNewStudentModal}
              className="w-full text-xs gap-1.5"
            >
              <UserPlus className="size-3.5" />
              Thêm sinh viên vào danh bạ
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
