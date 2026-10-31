"use client";

import React, { useState, useEffect } from "react";
import { ApiLogEntry } from "@/types";
import { clearApiLogs, getApiLogs, subscribeToApiLogs, fetchApi } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export function ApiConsole() {
  const toast = useToast();
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    setLogs(getApiLogs());
    return subscribeToApiLogs((updated) => {
      setLogs(updated);
    });
  }, []);

  const handlePing = async () => {
    try {
      await fetchApi("/auth/me");
      toast.success("Kết nối API backend thành công!", "Ping OK");
    } catch {
      // Log will capture it
    }
  };

  return (
    <>
      {/* Floating Pill in Bottom-Right */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-full shadow-lg border text-xs font-bold transition-all duration-200 transform hover:scale-105 ${
            isOpen
              ? "bg-slate-900 text-white border-slate-700 dark:bg-white dark:text-slate-900"
              : "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-blue-500"
          }`}
          aria-label="Mở bảng thanh tra API"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>API Inspector</span>
          <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px]">
            {logs.length}
          </span>
        </button>
      </div>

      {/* Floating Drawer Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          className="fixed bottom-16 right-4 z-40 w-full max-w-lg max-h-[520px] flex flex-col rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                HTTP Network &amp; API Traffic
              </span>
              <span className="text-[10px] text-slate-400 font-mono">({logs.length} calls)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePing}
                className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-[10px] font-bold"
              >
                Test Ping
              </button>
              <button
                type="button"
                onClick={clearApiLogs}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[10px] font-bold"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm leading-none"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Logs List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Chưa có yêu cầu API nào được ghi nhận. Thao tác trên giao diện để theo dõi traffic.
              </div>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const isSuccess = log.status >= 200 && log.status < 300;
                const isError = log.status === 0 || log.status >= 400;

                return (
                  <div key={log.id} className="p-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <div
                      className="flex items-center justify-between gap-2 cursor-pointer"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Method badge */}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold font-mono ${
                            log.method === "GET"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : log.method === "POST"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : log.method === "PUT"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {log.method}
                        </span>

                        <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {log.endpoint}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isSuccess
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : isError
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {log.status > 0 ? log.status : "FAIL"}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {log.durationMs}ms
                        </span>
                      </div>
                    </div>

                    {/* Expandable JSON details */}
                    {isExpanded && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] space-y-2 overflow-x-auto">
                        <div className="text-slate-400 text-[9px] uppercase tracking-wider">
                          Time: {log.timestamp} • Status: {log.statusText}
                        </div>

                        {log.requestBody ? (
                          <div>
                            <span className="text-amber-400 font-bold">Request Payload:</span>
                            <pre className="mt-0.5 whitespace-pre-wrap">
                              {JSON.stringify(log.requestBody, null, 2)}
                            </pre>
                          </div>
                        ) : null}

                        {log.responseBody ? (
                          <div>
                            <span className="text-emerald-400 font-bold">Response Data:</span>
                            <pre className="mt-0.5 whitespace-pre-wrap max-h-40 overflow-y-auto">
                              {JSON.stringify(log.responseBody, null, 2)}
                            </pre>
                          </div>
                        ) : null}

                        {log.error ? (
                          <div className="text-rose-400">
                            <span className="font-bold">Error Message:</span> {log.error}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
