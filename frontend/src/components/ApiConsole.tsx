"use client";

import React, { useState, useEffect } from "react";
import { ApiLogEntry } from "@/types";
import { clearApiLogs, getApiLogs, subscribeToApiLogs, fetchApi } from "@/lib/api-client";
import { useToast } from "@/lib/toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, X, Trash2, Play } from "lucide-react";

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
        <Button
          type="button"
          variant={isOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full shadow-md gap-2 h-9 px-3.5"
          aria-label="Mở bảng thanh tra API"
        >
          <Activity className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">API Inspector</span>
          <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px] font-mono">
            {logs.length}
          </Badge>
        </Button>
      </div>

      {/* Floating Drawer Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          className="fixed bottom-16 right-4 z-40 w-full max-w-lg max-h-[520px] flex flex-col rounded-xl bg-card border border-border shadow-xl overflow-hidden animate-in slide-in-from-bottom-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-foreground" />
              <span className="text-xs font-semibold text-foreground">
                HTTP Network &amp; API Traffic
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">({logs.length} calls)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePing}
                className="h-7 px-2 text-[10px] gap-1"
              >
                <Play className="size-3" />
                Ping
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearApiLogs}
                className="h-7 px-2 text-[10px] gap-1"
              >
                <Trash2 className="size-3" />
                Clear
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="size-7"
                aria-label="Đóng bảng API Inspector"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Logs List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border text-xs">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs italic">
                Chưa có yêu cầu API nào được ghi nhận. Thao tác trên giao diện để theo dõi traffic.
              </div>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const isSuccess = log.status >= 200 && log.status < 300;
                const isError = log.status === 0 || log.status >= 400;

                return (
                  <div key={log.id} className="p-3 hover:bg-muted/40 transition-colors">
                    <div
                      className="flex items-center justify-between gap-2 cursor-pointer"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Method badge */}
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] uppercase font-bold px-1.5 py-0"
                        >
                          {log.method}
                        </Badge>

                        <span className="font-mono text-[11px] font-medium text-foreground truncate">
                          {log.endpoint}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant={isSuccess ? "secondary" : isError ? "destructive" : "outline"}
                          className="font-mono text-[10px] px-1.5 py-0"
                        >
                          {log.status > 0 ? log.status : "FAIL"}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {log.durationMs}ms
                        </span>
                      </div>
                    </div>

                    {/* Expandable JSON details */}
                    {isExpanded && (
                      <div className="mt-3 p-3 rounded-lg bg-muted text-foreground font-mono text-[10px] space-y-2 overflow-x-auto border border-border">
                        <div className="text-muted-foreground text-[9px] uppercase tracking-wider">
                          Time: {log.timestamp} • Status: {log.statusText}
                        </div>

                        {log.requestBody ? (
                          <div>
                            <span className="text-foreground font-semibold">Request Payload:</span>
                            <pre className="mt-0.5 whitespace-pre-wrap">
                              {JSON.stringify(log.requestBody, null, 2)}
                            </pre>
                          </div>
                        ) : null}

                        {log.responseBody ? (
                          <div>
                            <span className="text-foreground font-semibold">Response Data:</span>
                            <pre className="mt-0.5 whitespace-pre-wrap max-h-40 overflow-y-auto">
                              {JSON.stringify(log.responseBody, null, 2)}
                            </pre>
                          </div>
                        ) : null}

                        {log.error ? (
                          <div className="text-destructive">
                            <span className="font-semibold">Error Message:</span> {log.error}
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
