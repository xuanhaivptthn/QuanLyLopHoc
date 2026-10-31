"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, AuthResponse } from "@/types";
import { fetchApi, getStoredToken, setStoredToken, subscribeToAuth } from "./api-client";
import { useToast } from "./toast";

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User, redirectPath?: string) => void;
  logout: (options?: { reason?: string; redirect?: boolean }) => void;
  refreshUser: () => Promise<User | null>;
  switchOrganization: (organizationId: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ["/login", "/auth/login", "/signup", "/register"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep a ref to the latest pathname to avoid stale closures in event listeners
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setCurrentUser(null);
      setTokenState(null);
      return null;
    }

    try {
      const user = await fetchApi<User>("/auth/me");
      setCurrentUser(user);
      setTokenState(currentToken);
      return user;
    } catch {
      setCurrentUser(null);
      setTokenState(null);
      return null;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const currentToken = getStoredToken();
      setTokenState(currentToken);

      if (!currentToken) {
        if (isMounted) {
          setCurrentUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const user = await fetchApi<User>("/auth/me");
        if (isMounted) {
          setCurrentUser(user);
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
          setTokenState(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // Subscribe to internal token changes
    const unsubAuth = subscribeToAuth((newToken) => {
      setTokenState(newToken);
      if (!newToken) {
        setCurrentUser(null);
      }
    });

    // Listen for unauthorized 401 events anywhere in the app
    const handleUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent<{ reason?: string; endpoint?: string }>;
      const reason = customEvent.detail?.reason || "session_expired";
      
      setCurrentUser(null);
      setTokenState(null);

      const currentPath = typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : pathnameRef.current;

      const isPublic = PUBLIC_ROUTES.some((route) => currentPath.startsWith(route));
      if (!isPublic) {
        toast.warning(
          "Phiên làm việc đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
          "Phiên làm việc kết thúc"
        );
        router.replace(`/login?reason=${reason}&redirect=${encodeURIComponent(currentPath)}`);
      }
    };

    // Cross-tab synchronization via storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token") {
        if (!e.newValue) {
          // Token was deleted in another tab
          setCurrentUser(null);
          setTokenState(null);

          const currentPath = typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : pathnameRef.current;

          const isPublic = PUBLIC_ROUTES.some((route) => currentPath.startsWith(route));
          if (!isPublic) {
            toast.info("Đã đăng xuất từ tab khác.", "Thông báo");
            router.replace(`/login?reason=session_expired&redirect=${encodeURIComponent(currentPath)}`);
          }
        } else {
          // Token was updated in another tab -> re-fetch current user
          setTokenState(e.newValue);
          refreshUser();
        }
      }
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      isMounted = false;
      unsubAuth();
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refreshUser, router, toast]);

  const login = useCallback(
    (newToken: string, user: User, redirectPath?: string) => {
      setStoredToken(newToken);
      setTokenState(newToken);
      setCurrentUser(user);
      setIsLoading(false);

      const target = redirectPath && redirectPath.startsWith("/") ? redirectPath : "/";
      router.replace(target);
    },
    [router]
  );

  const logout = useCallback(
    (options?: { reason?: string; redirect?: boolean }) => {
      setStoredToken(null);
      setTokenState(null);
      setCurrentUser(null);

      toast.info("Đã đăng xuất khỏi phiên làm việc.", "Đăng xuất");

      if (options?.redirect !== false) {
        const reasonQuery = options?.reason ? `?reason=${options.reason}` : "";
        router.replace(`/login${reasonQuery}`);
      }
    },
    [router, toast]
  );
  const switchOrganization = useCallback(
    async (organizationId: string | null) => {
      setIsLoading(true);
      try {
        const res = await fetchApi<AuthResponse>("/auth/switch-organization", {
          method: "POST",
          body: JSON.stringify({ organizationId }),
        });
        setStoredToken(res.token);
        setTokenState(res.token);
        const updatedUser: User = {
          id: res.userId,
          email: res.email,
          fullName: res.fullName,
          role: res.role,
          activeOrganizationId: res.activeOrganizationId,
          activeOrganizationName: res.activeOrganizationName,
          organizations: res.organizations,
        };
        setCurrentUser(updatedUser);
        toast.success(
          organizationId
            ? `Đã chuyển sang không gian: ${res.activeOrganizationName}`
            : "Đã chuyển về Tài khoản cá nhân / Giảng viên độc lập",
          "Chuyển không gian làm việc"
        );
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Không thể chuyển không gian", "Lỗi");
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const isAuthenticated = !!token && !!currentUser;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refreshUser,
        switchOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
