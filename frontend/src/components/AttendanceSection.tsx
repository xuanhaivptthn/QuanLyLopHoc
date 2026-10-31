"use client";

import React, { useState, useEffect, useCallback, useRef, useTransition } from "react";
import {
  Classroom,
  AttendanceSession,
  AttendanceRecord,
  AttendanceStatus,
  QrTokenResponse,
} from "@/types";
import { fetchApi } from "@/lib/api-client";
import { useToast } from "@/lib/toast";
import { QrCodeView } from "@/components/QrCodeView";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  QrCode,
  Users,
  Clock,
  RefreshCw,
  Plus,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Save,
  Search,
  Check,
  AlertCircle,
  Copy,
  Smartphone,
  Calendar,
} from "lucide-react";

interface AttendanceSectionProps {
  initialClassroomId?: string;
  initialSessionId?: string;
  onOpenClassroom?: (classroomId: string) => void;
  onSelectClassroom?: (cls: Classroom | null) => void;
}

export function AttendanceSection({
  initialClassroomId,
  initialSessionId,
  onOpenClassroom,
  onSelectClassroom,
}: AttendanceSectionProps) {
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(initialClassroomId || "");
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Studio Mode: QR Studio vs Manual Roll-Call Sheet
  const [studioMode, setStudioMode] = useState<"qr" | "roster">("qr");

  // Local record status modifications { recordId: { status, remarks } }
  const [localRecords, setLocalRecords] = useState<
    Record<string, { status: AttendanceStatus; remarks: string }>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic QR Token state
  const [qrTokenData, setQrTokenData] = useState<QrTokenResponse | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number>(0);
  const [autoRefreshQr, setAutoRefreshQr] = useState<boolean>(true);
  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check-in simulator state (for demo / testing student check-in)
  const [checkInQrToken, setCheckInQrToken] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Filter in roster
  const [rosterSearch, setRosterSearch] = useState("");

  // Create Session Modal State
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    sessionDate: new Date().toISOString().split("T")[0],
    startTime: "08:00:00",
    endTime: "10:30:00",
  });

  // Load classrooms on mount
  const loadClassrooms = useCallback(async () => {
    try {
      const data = await fetchApi<Classroom[]>("/classrooms");
      setClassrooms(data || []);
    } catch {
      // Ignored
    }
  }, []);

  // Load sessions for selected classroom
  const loadSessions = useCallback(
    async (classroomId: string, targetSessionId?: string) => {
      if (!classroomId) {
        setSessions([]);
        setActiveSession(null);
        return;
      }
      setIsLoading(true);
      try {
        const data = await fetchApi<AttendanceSession[]>(`/classrooms/${classroomId}/sessions`);
        setSessions(data || []);
        if (data && data.length > 0) {
          const match = targetSessionId
            ? data.find((s) => s.id === targetSessionId)
            : initialSessionId
            ? data.find((s) => s.id === initialSessionId)
            : data[0];
          setActiveSession(match || data[0]);
        } else {
          setActiveSession(null);
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Không thể tải danh sách ca học", "Lỗi");
      } finally {
        setIsLoading(false);
      }
    },
    [initialSessionId, toast]
  );

  // Load attendance records for a session
  const loadSessionRecords = useCallback(async (sessionId: string) => {
    try {
      const data = await fetchApi<AttendanceRecord[]>(`/sessions/${sessionId}/records`);
      setRecords(data || []);
      const mapping: Record<string, { status: AttendanceStatus; remarks: string }> = {};
      data?.forEach((r) => {
        mapping[r.id] = { status: r.status, remarks: r.remarks || "" };
      });
      setLocalRecords(mapping);
    } catch {
      setRecords([]);
      setLocalRecords({});
    }
  }, []);

  // Fetch / Refresh Dynamic QR Token (POST /sessions/{id}/open-qr)
  const refreshDynamicQr = useCallback(
    async (sessionId: string) => {
      try {
        const data = await fetchApi<QrTokenResponse>(`/sessions/${sessionId}/open-qr`, {
          method: "POST",
        });
        setQrTokenData(data);
        setCheckInQrToken(data.qrToken);
        setQrSecondsLeft(data.validitySeconds || 30);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Không thể tạo mã QR điểm danh", "Lỗi QR");
      }
    },
    [toast]
  );

  useEffect(() => {
    loadClassrooms();
  }, [loadClassrooms]);

  useEffect(() => {
    if (initialClassroomId) {
      setSelectedClassroomId(initialClassroomId);
    }
  }, [initialClassroomId]);

  useEffect(() => {
    if (selectedClassroomId) {
      loadSessions(selectedClassroomId);
    } else {
      setSessions([]);
      setActiveSession(null);
    }
  }, [selectedClassroomId, loadSessions]);

  useEffect(() => {
    if (activeSession?.id) {
      loadSessionRecords(activeSession.id);
      refreshDynamicQr(activeSession.id);
    } else {
      setRecords([]);
      setQrTokenData(null);
    }
  }, [activeSession?.id, loadSessionRecords, refreshDynamicQr]);

  // QR Countdown & Auto-Refresh Timer
  useEffect(() => {
    if (!qrTokenData || !activeSession) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setQrSecondsLeft((prev) => {
        if (prev <= 1) {
          if (autoRefreshQr && activeSession) {
            refreshDynamicQr(activeSession.id);
            // Also refresh records to catch any new check-ins
            loadSessionRecords(activeSession.id);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [qrTokenData, activeSession, autoRefreshQr, refreshDynamicQr, loadSessionRecords]);

  // Create Session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassroomId) return;
    setIsLoading(true);
    try {
      const newSession = await fetchApi<AttendanceSession>(
        `/classrooms/${selectedClassroomId}/sessions`,
        {
          method: "POST",
          body: JSON.stringify(sessionForm),
        }
      );
      toast.success(
        `Đã tạo ca học ngày ${newSession.sessionDate} (${newSession.startTime} - ${newSession.endTime})`,
        "Tạo ca học thành công"
      );
      setShowCreateSessionModal(false);
      await loadSessions(selectedClassroomId, newSession.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi tạo ca học", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  // Student Check-In Simulator (POST /sessions/{id}/check-in)
  const handleStudentCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !checkInQrToken.trim()) return;
    setIsCheckingIn(true);
    try {
      await fetchApi(`/sessions/${activeSession.id}/check-in`, {
        method: "POST",
        body: JSON.stringify({ qrToken: checkInQrToken.trim() }),
      });
      toast.success("Điểm danh sinh viên thành công!", "Check-in thành công");
      loadSessionRecords(activeSession.id);
      loadSessions(selectedClassroomId, activeSession.id);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Mã QR không hợp lệ hoặc đã hết hạn",
        "Check-in thất bại"
      );
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Local record status change
  const handleStatusChange = (recordId: string, status: AttendanceStatus) => {
    setLocalRecords((prev) => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || { remarks: "" }),
        status,
      },
    }));
  };

  // Local record remarks change
  const handleRemarksChange = (recordId: string, remarks: string) => {
    setLocalRecords((prev) => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || { status: "ABSENT" as AttendanceStatus }),
        remarks,
      },
    }));
  };

  // Mark all enrolled as PRESENT
  const handleMarkAllPresent = () => {
    const updated: Record<string, { status: AttendanceStatus; remarks: string }> = {};
    records.forEach((r) => {
      updated[r.id] = {
        status: "PRESENT",
        remarks: localRecords[r.id]?.remarks || r.remarks || "",
      };
    });
    setLocalRecords(updated);
    toast.info("Đã chọn trạng thái Có mặt cho tất cả sinh viên. Nhấn 'Lưu Điểm Danh' để hoàn tất.");
  };

  // Save Bulk Records (PUT /sessions/{id}/records)
  const handleSaveRecords = async () => {
    if (!activeSession) return;
    setIsSaving(true);
    try {
      const payload = {
        records: Object.entries(localRecords).map(([recordId, val]) => ({
          recordId,
          status: val.status,
          remarks: val.remarks || undefined,
        })),
      };

      const updated = await fetchApi<AttendanceRecord[]>(`/sessions/${activeSession.id}/records`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setRecords(updated);
      toast.success("Đã lưu kết quả điểm danh ca học!", "Lưu thành công");
      await loadSessions(selectedClassroomId, activeSession.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu điểm danh", "Lỗi lưu");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter records in roster
  const filteredRecords = records.filter(
    (r) =>
      r.studentName.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      r.studentCode.toLowerCase().includes(rosterSearch.toLowerCase())
  );

  // Calculate live counters
  const totalInSession = records.length;
  const presentCount = Object.values(localRecords).filter((r) => r.status === "PRESENT").length;
  const lateCount = Object.values(localRecords).filter((r) => r.status === "LATE").length;
  const absentCount = Object.values(localRecords).filter((r) => r.status === "ABSENT").length;
  const excusedCount = Object.values(localRecords).filter((r) => r.status === "EXCUSED").length;

  const currentClassroom = classrooms.find((c) => c.id === selectedClassroomId);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar: Classroom & Session Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Phòng Điểm Danh
          </h1>
          {activeSession && (
            <Badge variant="outline" className="font-mono text-xs">
              {activeSession.classroomCode}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Class Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Lớp:</span>
            <select
              value={selectedClassroomId}
              onChange={(e) => {
                const val = e.target.value;
                startTransition(() => {
                  setSelectedClassroomId(val);
                  if (onSelectClassroom) {
                    const match = classrooms.find((c) => c.id === val) || null;
                    onSelectClassroom(match);
                  }
                });
              }}
              className="h-8 px-2.5 rounded-md border border-border bg-background text-foreground text-xs font-semibold"
            >
              <option value="">-- Chọn lớp học --</option>
              {classrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.code} - {cls.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedClassroomId}
            onClick={() => setShowCreateSessionModal(true)}
            className="h-8 text-xs gap-1 disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            Tạo ca học
          </Button>
        </div>
      </div>

      {/* Sessions Horizontal Bar */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Chọn ca học:
          </span>
          {sessions.map((s) => {
            const isSelected = activeSession?.id === s.id;
            return (
              <Button
                key={s.id}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSession(s)}
                className="h-8 px-3 text-xs gap-2 shrink-0"
              >
                <span className="font-mono font-semibold">{s.sessionDate}</span>
                <span className="text-[11px] opacity-75">
                  ({s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)})
                </span>
                <Badge
                  variant={isSelected ? "outline" : "secondary"}
                  className="text-[9px] px-1 py-0 uppercase font-mono"
                >
                  {s.status}
                </Badge>
              </Button>
            );
          })}
        </div>
      )}

      {/* Studio View */}
      {activeSession ? (
        <div className="flex flex-col gap-5">
          {/* Session Overview Stats Banner */}
          <Card className="p-4 shadow-xs">
            <div className="flex flex-col gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    {activeSession.classroomCode} • Ca ngày {activeSession.sessionDate}
                  </h2>
                  <Badge variant="outline" className="font-mono text-xs">
                    {activeSession.startTime.slice(0, 5)} - {activeSession.endTime.slice(0, 5)}
                  </Badge>
                  <Badge
                    variant={activeSession.status === "ACTIVE" ? "default" : "secondary"}
                    className="font-mono text-[10px] uppercase"
                  >
                    {activeSession.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lớp: {activeSession.classroomName} • Sĩ số danh sách: {totalInSession} sinh viên
                </p>
              </div>

              {/* Counters - Moved down & minified into compact pills */}
              <div className="pt-2.5 border-t border-border/60 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25">
                  <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[11px] uppercase font-semibold text-emerald-700 dark:text-emerald-400">
                    Có mặt
                  </span>
                  <span className="text-xs font-bold font-mono text-emerald-800 dark:text-emerald-300">
                    {presentCount}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25">
                  <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-[11px] uppercase font-semibold text-amber-700 dark:text-amber-400">
                    Đi muộn
                  </span>
                  <span className="text-xs font-bold font-mono text-amber-800 dark:text-amber-300">
                    {lateCount}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/25">
                  <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-[11px] uppercase font-semibold text-rose-700 dark:text-rose-400">
                    Vắng mặt
                  </span>
                  <span className="text-xs font-bold font-mono text-rose-800 dark:text-rose-300">
                    {absentCount}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/25">
                  <span className="size-1.5 rounded-full bg-sky-500 shrink-0" />
                  <span className="text-[11px] uppercase font-semibold text-sky-700 dark:text-sky-400">
                    Có phép
                  </span>
                  <span className="text-xs font-bold font-mono text-sky-800 dark:text-sky-300">
                    {excusedCount}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Mode Tabs: QR Studio vs Roll-Call Sheet */}
          <div className="flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStudioMode("qr")}
                className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  studioMode === "qr"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <QrCode className="size-3.5" />
                  Mã QR Động 30s Trực Tiếp
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStudioMode("roster")}
                className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  studioMode === "roster"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  Bảng Điểm Danh Thủ Công ({records.length})
                </span>
              </button>
            </div>

            {studioMode === "roster" && (
              <div className="flex items-center gap-2 pb-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllPresent}
                  className="h-7 text-xs"
                >
                  <Check className="size-3 text-emerald-500" />
                  Đánh dấu tất cả có mặt
                </Button>

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={isSaving}
                  onClick={handleSaveRecords}
                  className="h-7 text-xs gap-1"
                >
                  <Save className="size-3" />
                  {isSaving ? "Đang lưu..." : "Lưu điểm danh"}
                </Button>
              </div>
            )}
          </div>

          {/* MODE 1: Dynamic QR Studio */}
          {studioMode === "qr" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: QR Display Card */}
              <Card className="lg:col-span-2 p-6 shadow-xs flex flex-col items-center text-center justify-between gap-6">
                <div className="w-full flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="size-4 text-foreground" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Mã QR Điểm Danh Lớp Học
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => refreshDynamicQr(activeSession.id)}
                      className="h-7 px-2 text-[11px] gap-1"
                    >
                      <RefreshCw className="size-3" />
                      Làm mới mã
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsProjectorMode(!isProjectorMode)}
                      className="size-7"
                      title="Chế độ máy chiếu toàn màn hình"
                    >
                      <Maximize2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* QR Code Canvas */}
                {qrTokenData ? (
                  <div className="flex flex-col items-center gap-4 my-2">
                    <div className="p-4 bg-card rounded-xl border border-border shadow-xs">
                      <QrCodeView value={qrTokenData.qrToken} size={220} />
                    </div>

                    {/* Countdown indicator */}
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="size-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Mã tự động đổi sau:</span>
                      <span
                        className={cn(
                          "font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border transition-colors",
                          qrSecondsLeft <= 5
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 animate-pulse"
                            : qrSecondsLeft <= 10
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        )}
                      >
                        {qrSecondsLeft} giây
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground max-w-sm">
                      Yêu cầu sinh viên mở camera hoặc ứng dụng sinh viên để quét mã QR hiển thị trên màn hình.
                    </p>
                  </div>
                ) : (
                  <div className="p-12 text-center text-xs text-muted-foreground">
                    Đang tạo mã QR động...
                  </div>
                )}

                {/* Bottom Quick Switch */}
                <div className="w-full pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Trạng thái ca học:{" "}
                    <strong className="text-foreground uppercase">{activeSession.status}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setStudioMode("roster")}
                    className="text-foreground hover:underline font-semibold"
                  >
                    Xem danh sách điểm danh &rarr;
                  </button>
                </div>
              </Card>

              {/* Right Col: Live Activity Feed & Simulator */}
              <div className="flex flex-col gap-4">
                {/* Live Activity Feed */}
                <Card className="p-4 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <span className="text-xs font-bold text-foreground">
                      Sinh Viên Đã Điểm Danh ({presentCount + lateCount})
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Real-time
                    </Badge>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length ===
                    0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground italic">
                        Chưa có sinh viên nào check-in trong ca học này.
                      </div>
                    ) : (
                      records
                        .filter((r) => r.status === "PRESENT" || r.status === "LATE")
                        .map((r) => (
                          <div
                            key={r.id}
                            className="p-2 rounded-lg bg-muted/50 border border-border flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-semibold text-foreground">{r.studentName}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {r.studentCode}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={r.status === "PRESENT" ? "default" : "secondary"}
                                className="text-[9px] uppercase font-mono"
                              >
                                {r.status}
                              </Badge>
                              {r.checkInTime && (
                                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                  {new Date(r.checkInTime).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </Card>

                {/* Simulator Card: Check-in testing */}
                <Card className="p-4 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 border-b border-border pb-2.5">
                    <Smartphone className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground">
                      Mô Phỏng Quét Check-in
                    </span>
                  </div>

                  <form onSubmit={handleStudentCheckIn} className="flex flex-col gap-2.5">
                    <p className="text-[11px] text-muted-foreground">
                      Dùng để kiểm thử endpoint <code>POST /sessions/{activeSession.id}/check-in</code>:
                    </p>
                    <Input
                      type="text"
                      placeholder="Mã QR token..."
                      value={checkInQrToken}
                      onChange={(e) => setCheckInQrToken(e.target.value)}
                      className="h-8 text-xs font-mono bg-background"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isCheckingIn || !checkInQrToken.trim()}
                      className="text-xs gap-1"
                    >
                      <CheckCircle2 className="size-3.5" />
                      {isCheckingIn ? "Đang gửi check-in..." : "Gửi Check-In Thử Nghiệm"}
                    </Button>
                  </form>
                </Card>
              </div>
            </div>
          )}

          {/* MODE 2: Manual Roll-Call Sheet */}
          {studioMode === "roster" && (
            <Card className="shadow-xs overflow-hidden">
              <div className="p-3 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Tìm sinh viên theo tên hoặc MSSV..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>

                <div className="text-xs text-muted-foreground">
                  Hiển thị <strong>{filteredRecords.length}</strong> / {records.length} sinh viên
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground italic">
                  Không tìm thấy sinh viên nào trong danh sách ca học.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                        <th className="py-2.5 px-4 w-12 text-center">STT</th>
                        <th className="py-2.5 px-4 font-mono">Mã SV</th>
                        <th className="py-2.5 px-4">Họ và tên</th>
                        <th className="py-2.5 px-4">Trạng thái điểm danh</th>
                        <th className="py-2.5 px-4">Giờ quét</th>
                        <th className="py-2.5 px-4">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredRecords.map((r, idx) => {
                        const currentStatus = localRecords[r.id]?.status || r.status;
                        const currentRemarks =
                          localRecords[r.id]?.remarks !== undefined
                            ? localRecords[r.id].remarks
                            : r.remarks || "";

                        return (
                          <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 text-center text-muted-foreground">{idx + 1}</td>
                            <td className="py-2.5 px-4">
                              <span className="font-mono font-semibold text-xs px-1.5 py-0.5 rounded bg-muted/80 text-foreground border border-border">
                                {r.studentCode}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-medium text-foreground flex items-center gap-2">
                              <span
                                className={cn(
                                  "size-2 rounded-full shrink-0",
                                  currentStatus === "PRESENT"
                                    ? "bg-emerald-500"
                                    : currentStatus === "LATE"
                                    ? "bg-amber-500"
                                    : currentStatus === "ABSENT"
                                    ? "bg-rose-500"
                                    : "bg-sky-500"
                                )}
                              />
                              <span>{r.studentName}</span>
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(r.id, "PRESENT")}
                                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                                    currentStatus === "PRESENT"
                                      ? "bg-emerald-600 text-white shadow-xs font-bold ring-1 ring-emerald-700"
                                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}
                                >
                                  Có mặt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(r.id, "LATE")}
                                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                                    currentStatus === "LATE"
                                      ? "bg-amber-600 text-white shadow-xs font-bold ring-1 ring-amber-700"
                                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}
                                >
                                  Đi muộn
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(r.id, "ABSENT")}
                                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                                    currentStatus === "ABSENT"
                                      ? "bg-rose-600 text-white shadow-xs font-bold ring-1 ring-rose-700"
                                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}
                                >
                                  Vắng mặt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(r.id, "EXCUSED")}
                                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                                    currentStatus === "EXCUSED"
                                      ? "bg-sky-600 text-white shadow-xs font-bold ring-1 ring-sky-700"
                                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}
                                >
                                  Có phép
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">
                              {r.checkInTime
                                ? new Date(r.checkInTime).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })
                                : "—"}
                            </td>
                            <td className="py-2.5 px-4">
                              <Input
                                type="text"
                                placeholder="Ghi chú lý do..."
                                value={currentRemarks}
                                onChange={(e) => handleRemarksChange(r.id, e.target.value)}
                                className="h-7 text-xs bg-background max-w-xs"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      ) : (
        /* Empty State when no session available */
        <Card className="p-12 text-center flex flex-col items-center gap-3 shadow-xs">
          <Calendar className="size-10 text-muted-foreground stroke-1" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {currentClassroom
                ? `Lớp ${currentClassroom.code} chưa có ca học nào`
                : "Chưa chọn lớp học"}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {currentClassroom
                ? "Tạo ca học mới để bắt đầu phát sinh mã QR điểm danh động hoặc thực hiện điểm danh danh sách."
                : "Vui lòng chọn một lớp học ở menu bên trên để quản lý ca học và điểm danh."}
            </p>
          </div>
          {selectedClassroomId && (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowCreateSessionModal(true)}
              className="gap-1.5 text-xs mt-1"
            >
              <Plus className="size-3.5" />
              Tạo ca học ngay
            </Button>
          )}
        </Card>
      )}

      {/* Projector Fullscreen Modal */}
      {isProjectorMode && qrTokenData && activeSession && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-8">
          <div className="absolute top-6 right-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsProjectorMode(false)}
              className="gap-1 text-xs"
            >
              <Minimize2 className="size-4" />
              Thoát toàn màn hình
            </Button>
          </div>

          <div className="flex flex-col items-center gap-6 max-w-lg text-center">
            <div className="space-y-1.5">
              <Badge variant="outline" className="font-mono text-sm uppercase px-3 py-1 font-bold">
                {activeSession.classroomCode} • {activeSession.classroomName}
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Quét Mã QR Để Điểm Danh
              </h2>
              <p className="text-sm text-muted-foreground">
                Ca học ngày {activeSession.sessionDate} ({activeSession.startTime} - {activeSession.endTime})
              </p>
            </div>

            <div className="p-6 bg-card rounded-2xl border-2 border-border shadow-xl">
              <QrCodeView value={qrTokenData.qrToken} size={320} />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Mã QR đổi mới sau:</span>
              <span
                className={cn(
                  "font-mono text-base font-bold px-3.5 py-1 rounded-full border transition-colors",
                  qrSecondsLeft <= 5
                    ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse"
                    : qrSecondsLeft <= 10
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                )}
              >
                {qrSecondsLeft}s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tạo Ca Học (POST /classrooms/{classroomId}/sessions) */}
      {showCreateSessionModal && selectedClassroomId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <Card className="w-full max-w-md shadow-xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-foreground" />
                <h3 className="text-sm font-bold text-foreground">
                  Tạo Ca Học Mới
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateSessionModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground" htmlFor="session-date-modal">
                  Ngày học *
                </label>
                <Input
                  id="session-date-modal"
                  type="date"
                  required
                  value={sessionForm.sessionDate}
                  onChange={(e) => setSessionForm({ ...sessionForm, sessionDate: e.target.value })}
                  className="h-8 text-xs font-mono bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-foreground" htmlFor="session-start-modal">
                    Giờ bắt đầu *
                  </label>
                  <Input
                    id="session-start-modal"
                    type="time"
                    step="1"
                    required
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                    className="h-8 text-xs font-mono bg-background"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-foreground" htmlFor="session-end-modal">
                    Giờ kết thúc *
                  </label>
                  <Input
                    id="session-end-modal"
                    type="time"
                    step="1"
                    required
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                    className="h-8 text-xs font-mono bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateSessionModal(false)}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={isLoading} className="text-xs">
                  {isLoading ? "Đang tạo..." : "Xác nhận tạo ca học"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
