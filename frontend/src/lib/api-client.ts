import { ApiLogEntry } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

type LogListener = (logs: ApiLogEntry[]) => void;
type AuthListener = (token: string | null) => void;

let apiLogs: ApiLogEntry[] = [];
const logListeners = new Set<LogListener>();
const authListeners = new Set<AuthListener>();

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
  options: RequestInit = {}
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
        if (typeof errorObj.detail === "string") {
          errMsg = errorObj.detail;
        } else if (typeof errorObj.message === "string") {
          errMsg = errorObj.message;
        } else if (Array.isArray(errorObj.errors)) {
          errMsg = errorObj.errors.join(", ");
        }
      }

      logEntry.error = errMsg;
      addLogEntry(logEntry);

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
    const errMsg = error instanceof Error ? error.message : "Network error";

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
    }

    throw error;
  }
}
