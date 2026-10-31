"use client";

import React, { useState, useEffect, useCallback, useRef, useTransition } from "react";
import {
  Classroom,
  AttendanceSession,
  AttendanceRecord,
  AttendanceStatus,
  QrTokenResponse,
  UpdateRecordItem,
} from "@/types";
import { fetchApi } from "@/lib/api-client";
import { QrCodeView } from "@/components/QrCodeView";
import { useToast } from "@/lib/toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap,
  Smartphone,
  Calendar,
  Clock,
  Maximize2,
  Minimize2,
  Copy,
  Plus,
  RefreshCw,
  Check,
  CheckCircle2,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceSectionProps {
  initialClassroomId?: string | null;
}

export function AttendanceSection({ initialClassroomId }: AttendanceSectionProps) {
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(initialClassroomId || "");
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [localRecords, setLocalRecords] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic QR Token state
  const [qrTokenData, setQrTokenData] = useState<QrTokenResponse | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number>(0);
  const [autoRefreshQr, setAutoRefreshQr] = useState<boolean>(true);
  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check-in simulator state
  const [checkInQrToken, setCheckInQrToken] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Create Session Modal State
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    sessionDate: "",
    startTime: "08:00",
    endTime: "10:15",
  });

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSessionForm((prev) => ({
      ...prev,
      sessionDate: prev.sessionDate || today,
    }));
  }, []);

  const selectedClassroomIdRef = useRef(selectedClassroomId);
  useEffect(() => {
    selectedClassroomIdRef.current = selectedClassroomId;
  }, [selectedClassroomId]);

  const loadClassrooms = useCallback(async () => {
    try {
      const data = await fetchApi<Classroom[]>("/classrooms");
      setClassrooms(data || []);
      if (!selectedClassroomIdRef.current && data && data.length > 0) {
        setSelectedClassroomId(data[0].id);
      }
    } catch {
      // Ignored
    }
  }, []);

  const loadSessions = useCallback(async (classroomId: string) => {
    if (!classroomId) return;
    setIsLoading(true);
    try {
      const data = await fetchApi<AttendanceSession[]>(`/classrooms/${classroomId}/sessions`);
      setSessions(data || []);
      if (data && data.length > 0) {
        setActiveSession((prev) => (prev ? data.find((s) => s.id === prev.id) || data[0] : data[0]));
      } else {
        setActiveSession(null);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể tải danh sách ca học", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadSessionRecords = useCallback(async (sessionId: string) => {
    try {
      const data = await fetchApi<AttendanceRecord[]>(`/sessions/${sessionId}/records`);
      setRecords(data || []);
      const mapping: Record<string, { status: AttendanceStatus; remarks: string }> = {};
      data?.forEach((r) => {
        mapping[r.id] = { status: r.status, remarks: r.remarks || "" };
      });
      setLocalRecords(mapping);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể tải danh sách điểm danh", "Lỗi");
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    loadClassrooms();
  }, [loadClassrooms]);

  useEffect(() => {
    if (selectedClassroomId) {
      loadSessions(selectedClassroomId);
    }
  }, [selectedClassroomId, loadSessions]);

  useEffect(() => {
    if (activeSession?.id) {
      loadSessionRecords(activeSession.id);
    } else {
      setRecords([]);
      setLocalRecords({});
      setQrTokenData(null);
      setQrSecondsLeft(0);
    }
  }, [activeSession?.id, loadSessionRecords]);

  // Generate / Refresh Dynamic QR Token
  const handleGenerateQr = useCallback(async () => {
    if (!activeSession) return;
    try {
      const data = await fetchApi<QrTokenResponse>(`/sessions/${activeSession.id}/open-qr`, {
        method: "POST",
      });
      setQrTokenData(data);
      setCheckInQrToken(data.qrToken);
      setQrSecondsLeft(data.validitySeconds || 30);
      toast.info(`Mã QR động mới đã kích hoạt (hiệu lực ${data.validitySeconds || 30}s)`, "Dynamic QR");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo mã QR", "Lỗi QR");
    }
  }, [activeSession, toast]);

  // QR Countdown Timer
  useEffect(() => {
    if (!qrTokenData || qrSecondsLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setQrSecondsLeft((prev) => {
        if (prev <= 1) {
          if (autoRefreshQr && activeSession) {
            handleGenerateQr();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [qrTokenData, qrSecondsLeft, autoRefreshQr, activeSession, handleGenerateQr]);

  // Create Session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassroomId) return;
    setIsLoading(true);
    try {
      const newSession = await fetchApi<AttendanceSession>(`/classrooms/${selectedClassroomId}/sessions`, {
        method: "POST",
        body: JSON.stringify(sessionForm),
      });
      toast.success(
        `Đã tạo ca học ngày ${newSession.sessionDate} (${newSession.startTime} - ${newSession.endTime})`,
        "Tạo ca học thành công"
      );
      setShowCreateSessionModal(false);
      await loadSessions(selectedClassroomId);
      setActiveSession(newSession);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi tạo ca học", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  // Student Check-In Simulator
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
      loadSessions(selectedClassroomId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Mã QR không hợp lệ hoặc đã hết hạn", "Check-in thất bại");
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
        ...(prev[recordId] || { status: "PRESENT" }),
        remarks,
      },
    }));
  };

  // Mark all present shortcut
  const handleMarkAllPresent = () => {
    const updated: Record<string, { status: AttendanceStatus; remarks: string }> = {};
    records.forEach((r) => {
      updated[r.id] = {
        status: "PRESENT",
        remarks: localRecords[r.id]?.remarks || "Có mặt đầy đủ",
      };
    });
    setLocalRecords(updated);
    toast.info("Đã đánh dấu tất cả sinh viên CÓ MẶT. Nhớ bấm 'Lưu Kết Quả'.", "Đánh dấu tất cả");
  };

  // Save Bulk Records
  const handleSaveRecords = async () => {
    if (!activeSession) return;
    setIsSaving(true);
    try {
      const payload: UpdateRecordItem[] = records.map((r) => ({
        recordId: r.id,
        status: localRecords[r.id]?.status || r.status,
        remarks: localRecords[r.id]?.remarks,
      }));

      await fetchApi<AttendanceRecord[]>(`/sessions/${activeSession.id}/records`, {
        method: "PUT",
        body: JSON.stringify({ records: payload }),
      });

      toast.success("Đã lưu bảng điểm danh thành công!", "Cập nhật hoàn tất");
      loadSessionRecords(activeSession.id);
      loadSessions(selectedClassroomId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi lưu bảng điểm danh", "Lỗi lưu");
    } finally {
      setIsSaving(false);
    }
  };

  // Count attendance stats
  const presentCount = Object.values(localRecords).filter((r) => r.status === "PRESENT").length;
  const lateCount = Object.values(localRecords).filter((r) => r.status === "LATE").length;
  const absentCount = Object.values(localRecords).filter((r) => r.status === "ABSENT").length;
  const excusedCount = Object.values(localRecords).filter((r) => r.status === "EXCUSED").length;

  const currentClassroom = classrooms.find((c) => c.id === selectedClassroomId);

  return (
    <div className="flex flex-col gap-6">
      {/* Header and Classroom / Session Selectors */}
      <Card className="p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Zap className="size-5 text-foreground" />
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Studio Điểm Danh &amp; Dynamic QR
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Mã QR xoay vòng 30s chống gian lận, chế độ máy chiếu giảng đường và sổ điểm danh trực tiếp
            </p>
          </div>

          {/* Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="select-class" className="text-xs font-medium text-muted-foreground">
                Lớp:
              </label>
              <select
                id="select-class"
                value={selectedClassroomId}
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(() => {
                    setSelectedClassroomId(val);
                  });
                }}
                className="px-2.5 py-1 rounded-md border border-border bg-background text-foreground text-xs"
              >
                {classrooms.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.code} - {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => setShowCreateSessionModal(true)}
              className="text-xs"
            >
              <Plus className="size-3.5" data-icon="inline-start" />
              Tạo Ca Học
            </Button>
          </div>
        </div>
      </Card>

      {/* Sessions Horizontal Scroller */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
          {sessions.map((s) => {
            const isSelected = activeSession?.id === s.id;
            return (
              <Button
                key={s.id}
                type="button"
                variant={isSelected ? "default" : "outline"}
                onClick={() => setActiveSession(s)}
                className="h-auto py-2 px-3 text-left shrink-0 rounded-lg flex flex-col items-start gap-1"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold">{s.sessionDate}</span>
                  <Badge
                    variant={isSelected ? "outline" : s.status === "ACTIVE" ? "default" : "secondary"}
                    className={cn(
                      "text-[9px] px-1 py-0 uppercase font-mono",
                      isSelected && "border-primary-foreground/30 text-primary-foreground"
                    )}
                  >
                    {s.status}
                  </Badge>
                </div>
                <span
                  className={cn(
                    "text-[11px] font-normal",
                    isSelected ? "text-primary-foreground/75" : "text-muted-foreground"
                  )}
                >
                  {s.startTime} - {s.endTime} • {s.totalStudents} SV
                </span>
              </Button>
            );
          })}
        </div>
      )}

      {/* Main Studio View: QR Code & Roll-Call Roster */}
      {activeSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Dynamic QR Studio */}
          <div className="flex flex-col gap-4">
            <Card className="p-4 shadow-2xs flex flex-col items-center text-center">
              <div className="w-full flex items-center justify-between border-b border-border pb-3 mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mã QR Điểm Danh Trực Tiếp
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {activeSession.sessionDate}
                </Badge>
              </div>

              {/* QR Code Display */}
              {qrTokenData ? (
                <div className="flex flex-col items-center gap-3.5 w-full">
                  <div className="p-3 bg-white rounded-xl border border-border shadow-xs">
                    <QrCodeView value={qrTokenData.qrToken} size={200} />
                  </div>

                  {/* Circular Countdown Progress Ring */}
                  <div className="flex items-center gap-3">
                    <div className="relative size-10 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-muted"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={qrSecondsLeft <= 5 ? "text-destructive" : "text-foreground"}
                          strokeDasharray={`${(qrSecondsLeft / 30) * 100}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute font-mono font-bold text-xs tabular-nums text-foreground">
                        {qrSecondsLeft}s
                      </span>
                    </div>

                    <div className="text-left">
                      <div className="text-xs font-semibold text-foreground">
                        {qrSecondsLeft > 0 ? "Mã đang hiệu lực" : "Hết hạn"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {autoRefreshQr ? "Tự động đổi mới 30s" : "Chế độ thủ công"}
                      </div>
                    </div>
                  </div>

                  {/* Token String Preview with Copy */}
                  <div className="w-full flex items-center gap-1.5 p-1.5 rounded-md bg-muted/50 border border-border">
                    <input
                      type="text"
                      readOnly
                      value={qrTokenData.qrToken}
                      className="flex-1 bg-transparent font-mono text-[11px] text-muted-foreground select-all truncate px-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(qrTokenData.qrToken);
                        toast.success("Đã sao chép mã Token vào clipboard!", "Đã sao chép");
                      }}
                      className="h-6 text-[10px] px-2"
                    >
                      <Copy className="size-3" data-icon="inline-start" />
                      Copy
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center gap-2">
                  <div className="size-12 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                    <Zap className="size-6" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Chưa kích hoạt mã QR cho ca học này
                  </span>
                </div>
              )}

              {/* Action Buttons for QR */}
              <div className="w-full mt-4 flex flex-col gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  onClick={handleGenerateQr}
                  className="w-full text-xs"
                >
                  <RefreshCw className="size-3.5" data-icon="inline-start" />
                  {qrTokenData ? "Làm Mới Mã QR (Reset 30s)" : "Tạo & Mở Dynamic QR"}
                </Button>

                {qrTokenData && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsProjectorMode(true)}
                    className="w-full text-xs"
                  >
                    <Maximize2 className="size-3.5" data-icon="inline-start" />
                    Chế Độ Máy Chiếu Giảng Đường
                  </Button>
                )}

                <label className="flex items-center justify-center gap-2 text-xs text-muted-foreground cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={autoRefreshQr}
                    onChange={(e) => setAutoRefreshQr(e.target.checked)}
                    className="size-3.5 rounded border-border text-foreground focus:ring-ring"
                  />
                  <span>Tự động quay vòng mã mỗi 30s</span>
                </label>
              </div>
            </Card>

            {/* Student Check-In Simulator */}
            <Card className="p-4 shadow-2xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Smartphone className="size-3.5 text-muted-foreground" />
                  Mô phỏng Quét QR (Check-in Test)
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  /check-in
                </Badge>
              </div>
              <form onSubmit={handleStudentCheckIn} className="flex flex-col gap-2">
                <Input
                  type="text"
                  required
                  value={checkInQrToken}
                  onChange={(e) => setCheckInQrToken(e.target.value)}
                  placeholder="Dán mã QR Token tại đây..."
                  className="h-8 text-xs font-mono bg-background"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  disabled={isCheckingIn || !checkInQrToken.trim()}
                  className="w-full text-xs"
                >
                  {isCheckingIn ? "Đang xử lý..." : "Mô Phỏng Sinh Viên Quét Mã"}
                </Button>
              </form>
            </Card>
          </div>

          {/* Right 2 Columns: Live Roll-Call Roster Table */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card className="p-4 shadow-2xs flex flex-col gap-4">
              {/* Counters & Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    Có mặt: {presentCount}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Đi muộn: {lateCount}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Vắng: {absentCount}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Có phép: {excusedCount}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllPresent}
                    className="text-xs"
                  >
                    Tất cả Có mặt
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveRecords}
                    disabled={isSaving}
                    className="text-xs"
                  >
                    <Save className="size-3.5" data-icon="inline-start" />
                    {isSaving ? "Đang lưu..." : "Lưu Kết Quả"}
                  </Button>
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border font-medium">
                    <tr>
                      <th className="p-2.5 font-medium">Mã SV</th>
                      <th className="p-2.5 font-medium">Họ và Tên</th>
                      <th className="p-2.5 font-medium">Thời Gian Quét</th>
                      <th className="p-2.5 font-medium">Trạng Thái</th>
                      <th className="p-2.5 font-medium">Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                          Chưa có sinh viên trong ca học này. Hãy ghi danh sinh viên vào lớp học.
                        </td>
                      </tr>
                    ) : (
                      records.map((r) => {
                        const currentStatus = localRecords[r.id]?.status || r.status;
                        const currentRemarks = localRecords[r.id]?.remarks ?? r.remarks ?? "";

                        return (
                          <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-2.5 font-mono font-medium text-foreground">
                              {r.studentCode}
                            </td>
                            <td className="p-2.5 font-medium text-foreground">
                              {r.studentName}
                            </td>
                            <td className="p-2.5 text-[11px] text-muted-foreground font-mono">
                              {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : "-"}
                            </td>
                            <td className="p-2.5">
                              {/* Status Toggle Buttons */}
                              <div className="inline-flex rounded-md p-0.5 bg-muted border border-border">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(r.id, "PRESENT")}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors",
                                    currentStatus === "PRESENT"
                                      ? "bg-background text-foreground shadow-2xs font-bold"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  Có mặt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(r.id, "LATE")}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors",
                                    currentStatus === "LATE"
                                      ? "bg-background text-foreground shadow-2xs font-bold"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  Muộn
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(r.id, "ABSENT")}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors",
                                    currentStatus === "ABSENT"
                                      ? "bg-background text-foreground shadow-2xs font-bold"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  Vắng
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(r.id, "EXCUSED")}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors",
                                    currentStatus === "EXCUSED"
                                      ? "bg-background text-foreground shadow-2xs font-bold"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  Phép
                                </button>
                              </div>
                            </td>
                            <td className="p-2.5">
                              <Input
                                type="text"
                                value={currentRemarks}
                                onChange={(e) => handleRemarksChange(r.id, e.target.value)}
                                placeholder="Ghi chú..."
                                className="h-7 text-[11px] bg-background"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center shadow-2xs flex flex-col items-center gap-3">
          <div className="size-12 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
            <Calendar className="size-6" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">
            Chưa có ca học nào được chọn
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Hãy chọn một ca học ở thanh bên trên hoặc bấm &quot;Tạo Ca Học&quot; để mở studio điểm danh.
          </p>
        </Card>
      )}

      {/* Fullscreen Projector Mode Modal */}
      {isProjectorMode && qrTokenData && activeSession && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-background text-foreground flex flex-col p-8 overflow-y-auto"
        >
          {/* Top Bar of Projector */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-foreground">
                Chế Độ Máy Chiếu Giảng Đường • EduAttend Projector
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsProjectorMode(false)}
            >
              <Minimize2 className="size-3.5" data-icon="inline-start" />
              Thoát Máy Chiếu (ESC)
            </Button>
          </div>

          {/* Centered Large QR Screen */}
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center gap-6">
            <div className="flex flex-col gap-1">
              <Badge variant="outline" className="font-mono text-xs font-bold mx-auto">
                {currentClassroom?.code || activeSession.classroomCode}
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
                {currentClassroom?.name || activeSession.classroomName}
              </h1>
              <p className="text-muted-foreground text-sm">
                Ngày {activeSession.sessionDate} • Ca: {activeSession.startTime} - {activeSession.endTime}
              </p>
            </div>

            {/* Giant QR Code */}
            <div className="p-6 rounded-2xl bg-white text-black border border-border shadow-2xl flex flex-col items-center">
              <QrCodeView value={qrTokenData.qrToken} size={340} />
            </div>

            {/* Large Countdown & Counter */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-extrabold font-mono text-foreground tabular-nums">
                  {qrSecondsLeft}s
                </span>
                <span className="text-xs text-muted-foreground max-w-[130px] text-left">
                  Mã QR tự động đổi mới sau mỗi 30 giây
                </span>
              </div>

              <div className="h-8 w-px bg-border" />

              <div className="flex items-center gap-3">
                <span className="text-4xl font-extrabold font-mono text-foreground tabular-nums">
                  {presentCount + lateCount} / {records.length}
                </span>
                <span className="text-xs text-muted-foreground text-left">
                  Sinh viên đã quét mã điểm danh thành công
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateSessionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-md shadow-xl p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">
                Tạo Ca Học / Ca Điểm Danh Mới
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateSessionModal(false)}
                className="size-7"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateSession} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">
                  Ngày Học *
                </label>
                <Input
                  type="date"
                  required
                  value={sessionForm.sessionDate}
                  onChange={(e) => setSessionForm({ ...sessionForm, sessionDate: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-foreground">
                    Giờ Bắt Đầu *
                  </label>
                  <Input
                    type="time"
                    required
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                    className="h-8 text-xs font-mono bg-background"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-foreground">
                    Giờ Kết Thúc *
                  </label>
                  <Input
                    type="time"
                    required
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                    className="h-8 text-xs font-mono bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateSessionModal(false)}
                >
                  Hủy Bỏ
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? "Đang tạo..." : "Xác Nhận Tạo Ca"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
