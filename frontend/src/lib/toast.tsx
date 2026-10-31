"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  timestamp: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id" | "timestamp">) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => string;
  error: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function emitToast(toast: Omit<ToastItem, "id" | "timestamp">) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:toast", { detail: toast }));
  }
}

/**
 * Standalone toast utility that can be imported and called anywhere in the app
 * (both inside and outside of React components, such as in api-client.ts)
 */
export const toast = {
  success: (message: string, title?: string, duration = 4000) => {
    emitToast({ type: "success", title, message, duration });
  },
  error: (message: string, title?: string, duration = 5000) => {
    emitToast({ type: "error", title, message, duration });
  },
  warning: (message: string, title?: string, duration = 4500) => {
    emitToast({ type: "warning", title, message, duration });
  },
  info: (message: string, title?: string, duration = 4000) => {
    emitToast({ type: "info", title, message, duration });
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4500 }: Omit<ToastItem, "id" | "timestamp">) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = {
        id,
        type,
        title,
        message,
        duration,
        timestamp: Date.now(),
      };

      setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep maximum 5 toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Omit<ToastItem, "id" | "timestamp">>;
      if (customEvent.detail) {
        addToast(customEvent.detail);
      }
    };
    window.addEventListener("app:toast", handleToastEvent);
    return () => window.removeEventListener("app:toast", handleToastEvent);
  }, [addToast]);

  const success = useCallback(
    (message: string, title?: string, duration?: number) => addToast({ type: "success", title, message, duration }),
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) => addToast({ type: "error", title, message, duration: duration ?? 5500 }),
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) => addToast({ type: "warning", title, message, duration }),
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) => addToast({ type: "info", title, message, duration }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      {/* Toast container floating top right */}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-2 sm:px-0"
        role="region"
        aria-label="Thông báo hệ thống"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            aria-live={t.type === "error" ? "assertive" : "polite"}
            aria-atomic="true"
            className="pointer-events-auto relative overflow-hidden flex items-start gap-3 p-3.5 rounded-lg border border-border bg-card text-card-foreground shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-top-2"
          >
            {/* Status Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {t.type === "error" && (
                <AlertCircle className="size-4 text-destructive" />
              )}
              {t.type === "success" && (
                <CheckCircle2 className="size-4 text-primary" />
              )}
              {t.type === "warning" && (
                <AlertTriangle className="size-4 text-amber-500" />
              )}
              {t.type === "info" && (
                <Info className="size-4 text-muted-foreground" />
              )}
            </div>

            {/* Message Body */}
            <div className="flex-1 min-w-0 pr-1">
              {t.title && <h4 className="text-xs font-semibold leading-tight mb-0.5 text-foreground">{t.title}</h4>}
              <p className="text-xs text-muted-foreground leading-relaxed break-words">{t.message}</p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <X className="size-3.5" />
            </button>

            {/* Progress duration indicator bar */}
            {t.duration && t.duration > 0 && (
              <div
                className="absolute bottom-0 left-0 h-0.5 w-full bg-primary/30"
                style={{
                  animation: `shrinkWidth ${t.duration}ms linear forwards`,
                }}
              />
            )}
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes shrinkWidth {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
