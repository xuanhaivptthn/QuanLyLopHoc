import { ApiLogEntry } from "@/types";
import { toast } from "@/lib/toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

type LogListener = (logs: ApiLogEntry[]) => void;
type AuthListener = (token: string | null) => void;

let apiLogs: ApiLogEntry[] = [];
const logListeners = new Set<LogListener>();
const authListeners = new Set<AuthListener>();

export interface FetchApiOptions extends RequestInit {
  skipErrorToast?: boolean;
  skipConsoleLog?: boolean;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
  authListeners.forEach((listener) => listener(token));
}

export function subscribeToAuth(listener: AuthListener): () => void {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

export function getApiLogs(): ApiLogEntry[] {
  return [...apiLogs];
}

export function clearApiLogs(): void {
  apiLogs = [];
  logListeners.forEach((l) => l([]));
}

export function subscribeToApiLogs(listener: LogListener): () => void {
  logListeners.add(listener);
  listener([...apiLogs]);
  return () => {
    logListeners.delete(listener);
  };
}

function addLogEntry(entry: ApiLogEntry) {
  apiLogs = [entry, ...apiLogs].slice(0, 60);
  logListeners.forEach((l) => l([...apiLogs]));
}

// -------------------------------------------------------------
// Primary fetchApi implementation communicating directly with backend
// -------------------------------------------------------------
export async function fetchApi<T>(
  endpoint: string,
  options: FetchApiOptions = {}
): Promise<T> {
  const token = getStoredToken();
  const startTime = Date.now();
  const method = (options.method || "GET").toUpperCase();

  let requestBodyParsed: unknown = undefined;
  if (options.body && typeof options.body === "string") {
    try {
      requestBodyParsed = JSON.parse(options.body);
    } catch {
      requestBodyParsed = options.body;
    }
  }

  const logId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toLocaleTimeString();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const durationMs = Date.now() - startTime;
    let responseData: unknown = null;

    if (response.status !== 204) {
      const contentType = response.headers.get("content-type");
      if (contentType && (contentType.includes("application/json") || contentType.includes("problem+json"))) {
        responseData = await response.json().catch(() => null);
      } else {
        const text = await response.text();
        responseData = text ? { raw: text } : null;
      }
    }

    const logEntry: ApiLogEntry = {
      id: logId,
      timestamp,
      method,
      endpoint,
      status: response.status,
      statusText: response.statusText,
      requestBody: requestBodyParsed,
      responseBody: responseData,
      durationMs,
    };

    if (!response.ok) {
      const errorObj = responseData as Record<string, unknown> | null;
      let errMsg = `HTTP ${response.status} ${response.statusText}`;

      if (errorObj) {
        if (typeof errorObj.detail === "string" && errorObj.detail.trim().length > 0) {
          errMsg = errorObj.detail;
        } else if (typeof errorObj.title === "string" && errorObj.title.trim().length > 0) {
          errMsg = errorObj.title;
        } else if (typeof errorObj.message === "string" && errorObj.message.trim().length > 0) {
          errMsg = errorObj.message;
        } else if (Array.isArray(errorObj.errors)) {
          errMsg = errorObj.errors.join(", ");
        }

        if (errorObj.invalidFields && typeof errorObj.invalidFields === "object") {
          const fields = Object.entries(errorObj.invalidFields as Record<string, string>)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join("; ");
          errMsg = `${errMsg} (${fields})`;
        }
      }

      logEntry.error = errMsg;
      addLogEntry(logEntry);

      // Detailed styled console logging for developers
      if (!options.skipConsoleLog) {
        console.groupCollapsed(
          `%c[API Error] ${method} ${endpoint} (${response.status} ${response.statusText})`,
          "color: #ef4444; font-weight: bold;"
        );
        console.error("Error Message:", errMsg);
        console.log("Full URL:", `${API_BASE_URL}${endpoint}`);
        console.log("Status Code:", response.status, response.statusText);
        if (requestBodyParsed !== undefined) {
          console.log("Request Payload:", requestBodyParsed);
        }
        if (responseData !== null) {
          console.log("Response Body:", responseData);
        }
        console.log("Response Duration:", `${durationMs}ms`);
        console.groupEnd();
      }

      // Simple Error Toast Notification
      if (!options.skipErrorToast) {
        toast.error(errMsg, `Lỗi HTTP ${response.status}`);
      }

      if (response.status === 401 && endpoint !== "/auth/login") {
        setStoredToken(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("auth:unauthorized", {
              detail: { reason: "session_expired", endpoint },
            })
          );
        }
      }

      throw new Error(errMsg);
    }

    addLogEntry(logEntry);
    return responseData as T;
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : "Lỗi kết nối mạng";

    if (!apiLogs.some((l) => l.id === logId)) {
      addLogEntry({
        id: logId,
        timestamp,
        method,
        endpoint,
        status: 0,
        statusText: "Network Disconnected",
        requestBody: requestBodyParsed,
        durationMs,
        error: errMsg,
      });

      if (!options.skipConsoleLog) {
        console.groupCollapsed(
          `%c[API Network Disconnected] ${method} ${endpoint}`,
          "color: #dc2626; font-weight: bold;"
        );
        console.error("Network Error Details:", error);
        console.log("Target URL:", `${API_BASE_URL}${endpoint}`);
        if (requestBodyParsed !== undefined) {
          console.log("Request Payload:", requestBodyParsed);
        }
        console.groupEnd();
      }

      if (!options.skipErrorToast) {
        toast.error(errMsg, "Không thể kết nối máy chủ");
      }
    }

    throw error;
  }
}
