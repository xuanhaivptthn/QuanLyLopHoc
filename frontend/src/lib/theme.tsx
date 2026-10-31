"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme, event?: React.MouseEvent) => void;
  toggleTheme: (event?: React.MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as Theme | null;
      if (saved && (saved === "light" || saved === "dark" || saved === "system")) {
        return saved;
      }
    }
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "dark") return "dark";
      if (saved === "light") return "light";
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const updateResolved = () => {
      if (theme === "system") {
        const isDark = media.matches;
        const apply = () => {
          setResolvedTheme(isDark ? "dark" : "light");
          if (isDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        };

        if (
          "startViewTransition" in document &&
          typeof document.startViewTransition === "function" &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          document.startViewTransition(apply);
        } else {
          document.documentElement.classList.add("theme-transitioning");
          apply();
          setTimeout(() => {
            document.documentElement.classList.remove("theme-transitioning");
          }, 300);
        }
      }
    };

    media.addEventListener("change", updateResolved);
    return () => media.removeEventListener("change", updateResolved);
  }, [theme]);

  const executeTransition = (newTheme: Theme, event?: React.MouseEvent) => {
    const isDark =
      newTheme === "dark"
        ? true
        : newTheme === "light"
        ? false
        : window.matchMedia("(prefers-color-scheme: dark)").matches;

    const applyDOM = () => {
      setThemeState(newTheme);
      setResolvedTheme(isDark ? "dark" : "light");
      localStorage.setItem("theme", newTheme);

      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    if (
      typeof document === "undefined" ||
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      applyDOM();
      return;
    }

    if ("startViewTransition" in document && typeof document.startViewTransition === "function") {
      const x = event?.clientX;
      const y = event?.clientY;
      const hasCoords = typeof x === "number" && typeof y === "number" && (x > 0 || y > 0);

      const transition = document.startViewTransition(() => {
        applyDOM();
      });

      if (hasCoords && typeof document.documentElement.animate === "function") {
        const endRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
        );

        transition.ready
          .then(() => {
            try {
              document.documentElement.animate(
                {
                  clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${endRadius}px at ${x}px ${y}px)`,
                  ],
                },
                {
                  duration: 350,
                  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
                  pseudoElement: "::view-transition-new(root)",
                }
              );
            } catch {
              // Gracefully fallback to standard view transition fade
            }
          })
          .catch(() => {});
      }
    } else {
      document.documentElement.classList.add("theme-transitioning");
      applyDOM();
      setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
      }, 300);
    }
  };

  const setTheme = (newTheme: Theme, event?: React.MouseEvent) => {
    executeTransition(newTheme, event);
  };

  const toggleTheme = (event?: React.MouseEvent) => {
    const nextTheme: Theme = resolvedTheme === "dark" ? "light" : "dark";
    executeTransition(nextTheme, event);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
