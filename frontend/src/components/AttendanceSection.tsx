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
    <div className="space-y-6">
      {/* Header and Classroom / Session Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>⚡ Studio Điểm Danh &amp; Dynamic QR</span>
          </h2>
          <p className="text-xs text-slate-500">
            Mã QR xoay vòng 30s chống gian lận, chế độ máy chiếu giảng đường và sổ điểm danh trực tiếp
          </p>
        </div>

        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Select Classroom */}
          <div className="flex items-center gap-2">
            <label htmlFor="select-class" className="text-xs font-semibold text-slate-500">
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
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              {classrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.code} - {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* New Session Button */}
          <button
            type="button"
            onClick={() => setShowCreateSessionModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tạo Ca Học
          </button>
        </div>
      </div>

      {/* Sessions Horizontal Scroller */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {sessions.map((s) => {
            const isSelected = activeSession?.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSession(s)}
                className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25"
                    : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{s.sessionDate}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : s.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <span className={`text-xs mt-0.5 ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                    {s.startTime} - {s.endTime} • {s.totalStudents} SV
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Studio View: QR Code & Roll-Call Roster */}
      {activeSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Dynamic QR Studio */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col items-center text-center">
              <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mã QR Điểm Danh Trực Tiếp
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  {activeSession.sessionDate}
                </span>
              </div>

              {/* QR Code Display */}
              {qrTokenData ? (
                <div className="space-y-4 flex flex-col items-center">
                  <QrCodeView value={qrTokenData.qrToken} size={220} />

                  {/* Circular Countdown Progress Ring */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-200 dark:text-slate-800"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={qrSecondsLeft <= 5 ? "text-rose-500" : "text-blue-600 dark:text-blue-400"}
                          strokeDasharray={`${(qrSecondsLeft / 30) * 100}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute font-mono font-bold text-xs tabular-nums text-slate-900 dark:text-white">
                        {qrSecondsLeft}s
                      </span>
                    </div>

                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {qrSecondsLeft > 0 ? "Mã đang hiệu lực" : "Hết hạn"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {autoRefreshQr ? "Tự động làm mới khi hết giờ" : "Tự động tắt"}
                      </div>
                    </div>
                  </div>

                  {/* Token String Preview with Copy */}
                  <div className="w-full flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <input
                      type="text"
                      readOnly
                      value={qrTokenData.qrToken}
                      className="flex-1 bg-transparent font-mono text-[11px] text-slate-600 dark:text-slate-300 select-all truncate"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(qrTokenData.qrToken);
                        toast.success("Đã sao chép mã Token vào clipboard!", "Đã sao chép");
                      }}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Chưa kích hoạt mã QR cho ca học này
                  </span>
                </div>
              )}

              {/* Action Buttons for QR */}
              <div className="w-full mt-4 space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleGenerateQr}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {qrTokenData ? "Làm Mới Mã QR (Reset 30s)" : "Tạo & Mở Dynamic QR"}
                </button>

                {qrTokenData && (
                  <button
                    type="button"
                    onClick={() => setIsProjectorMode(true)}
                    className="w-full py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Bật Chế Độ Máy Chiếu Giảng Đường
                  </button>
                )}

                <label className="flex items-center justify-center gap-2 text-xs text-slate-500 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={autoRefreshQr}
                    onChange={(e) => setAutoRefreshQr(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Tự động quay vòng mã mỗi 30s</span>
                </label>
              </div>
            </div>

            {/* Student Check-In Simulator */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  📱 Mô phỏng Quét QR (Check-in Test)
                </span>
                <span className="text-[10px] text-slate-400">Endpoint: /check-in</span>
              </div>
              <form onSubmit={handleStudentCheckIn} className="space-y-2">
                <input
                  type="text"
                  required
                  value={checkInQrToken}
                  onChange={(e) => setCheckInQrToken(e.target.value)}
                  placeholder="Dán mã QR Token tại đây..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
                <button
                  type="submit"
                  disabled={isCheckingIn || !checkInQrToken.trim()}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-colors"
                >
                  {isCheckingIn ? "Đang xử lý..." : "Mô Phỏng Sinh Viên Quét Mã"}
                </button>
              </form>
            </div>
          </div>

          {/* Right 2 Columns: Live Roll-Call Roster Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
              {/* Counters & Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                    Có mặt: {presentCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-xs">
                    Đi muộn: {lateCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs">
                    Vắng: {absentCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xs">
                    Có phép: {excusedCount}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs"
                  >
                    Đánh dấu tất cả Có mặt
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveRecords}
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/20"
                  >
                    {isSaving ? "Đang lưu..." : "Lưu Kết Quả"}
                  </button>
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
                    <tr>
                      <th className="p-3">Mã SV</th>
                      <th className="p-3">Họ và Tên</th>
                      <th className="p-3">Thời Gian Quét</th>
                      <th className="p-3">Trạng Thái</th>
                      <th className="p-3">Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                          Chưa có sinh viên trong ca học này. Hãy ghi danh sinh viên vào lớp học.
                        </td>
                      </tr>
                    ) : (
                      records.map((r) => {
                        const currentStatus = localRecords[r.id]?.status || r.status;
                        const currentRemarks = localRecords[r.id]?.remarks ?? r.remarks ?? "";

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {r.studentCode}
                            </td>
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                              {r.studentName}
                            </td>
                            <td className="p-3 text-[11px] text-slate-500">
                              {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : "-"}
                            </td>
                            <td className="p-3">
                              {/* Status Pill Toggle Buttons */}
                              <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(r.id, "PRESENT")}
                                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                                    currentStatus === "PRESENT"
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                  }`}
                                >
                                  Có mặt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(r.id, "LATE")}
                                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                                    currentStatus === "LATE"
                                      ? "bg-amber-500 text-white shadow-xs"
                                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                  }`}
                                >
                                  Muộn
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(r.id, "ABSENT")}
                                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                                    currentStatus === "ABSENT"
                                      ? "bg-rose-600 text-white shadow-xs"
                                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                  }`}
                                >
                                  Vắng
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(r.id, "EXCUSED")}
                                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                                    currentStatus === "EXCUSED"
                                      ? "bg-indigo-600 text-white shadow-xs"
                                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                  }`}
                                >
                                  Phép
                                </button>
                              </div>
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={currentRemarks}
                                onChange={(e) => handleRemarksChange(r.id, e.target.value)}
                                placeholder="Ghi chú..."
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            📅
          </div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Chưa có ca học nào được chọn
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy chọn một ca học ở thanh bên trên hoặc bấm &quot;Tạo Ca Học&quot; để mở studio điểm danh.
          </p>
        </div>
      )}

      {/* Fullscreen Projector Mode Modal */}
      {isProjectorMode && qrTokenData && activeSession && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-8 overflow-y-auto"
        >
          {/* Top Bar of Projector */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-sm font-bold text-slate-300">
                Chế Độ Máy Chiếu Giảng Đường • EduAttend Projector
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsProjectorMode(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-colors"
            >
              Thoát Máy Chiếu (ESC)
            </button>
          </div>

          {/* Centered Large QR Screen */}
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center space-y-6">
            <div className="space-y-1">
              <div className="text-blue-400 font-mono text-sm font-bold">
                {currentClassroom?.code || activeSession.classroomCode}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {currentClassroom?.name || activeSession.classroomName}
              </h1>
              <p className="text-slate-400 text-sm">
                Ngày {activeSession.sessionDate} • Ca: {activeSession.startTime} - {activeSession.endTime}
              </p>
            </div>

            {/* Giant QR Code */}
            <div className="p-6 rounded-3xl bg-white shadow-2xl flex flex-col items-center">
              <QrCodeView value={qrTokenData.qrToken} size={360} />
            </div>

            {/* Large Countdown & Counter */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-extrabold font-mono text-blue-400 tabular-nums">
                  {qrSecondsLeft}s
                </span>
                <span className="text-xs text-slate-400 max-w-[120px] text-left">
                  Mã QR tự động đổi mới sau mỗi 30 giây
                </span>
              </div>

              <div className="h-8 w-px bg-slate-800" />

              <div className="flex items-center gap-3">
                <span className="text-4xl font-extrabold font-mono text-emerald-400 tabular-nums">
                  {presentCount + lateCount} / {records.length}
                </span>
                <span className="text-xs text-slate-400 text-left">
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
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Tạo Ca Học / Ca Điểm Danh Mới
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateSessionModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ngày Học *
                </label>
                <input
                  type="date"
                  required
                  value={sessionForm.sessionDate}
                  onChange={(e) => setSessionForm({ ...sessionForm, sessionDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giờ Bắt Đầu *
                  </label>
                  <input
                    type="time"
                    required
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giờ Kết Thúc *
                  </label>
                  <input
                    type="time"
                    required
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateSessionModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  {isLoading ? "Đang tạo..." : "Xác Nhận Tạo Ca"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
