"use client";

import React, { useEffect } from "react";
import { ThemeProvider } from "@/lib/theme";
import { ToastProvider, toast } from "@/lib/toast";
import { AuthProvider } from "@/lib/auth-context";

function GlobalErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("[Uncaught Global Error]:", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
      // Optionally notify user on unexpected runtime failure
      if (process.env.NODE_ENV === "development") {
        toast.error(event.message || "Đã xảy ra lỗi không mong muốn", "Lỗi Runtime");
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("[Unhandled Promise Rejection]:", event.reason);
      const reasonMsg =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === "string"
          ? event.reason
          : "Yêu cầu bất đồng bộ thất bại";

      if (process.env.NODE_ENV === "development") {
        toast.warning(reasonMsg, "Promise Rejection");
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <GlobalErrorHandler />
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
