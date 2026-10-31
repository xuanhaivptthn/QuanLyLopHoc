"use client";

import React from "react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "ghost" | "outline" | "default" | "secondary";
  size?: "icon" | "default" | "sm" | "lg" | "icon-sm" | "icon-xs";
  className?: string;
}

export function ThemeToggle({
  variant = "ghost",
  size = "icon",
  className,
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={(e) => toggleTheme(e)}
      className={cn("relative overflow-hidden cursor-pointer", className)}
      aria-label={
        resolvedTheme === "dark"
          ? "Chuyển sang giao diện sáng"
          : "Chuyển sang giao diện tối"
      }
      title={
        resolvedTheme === "dark"
          ? "Chuyển sang giao diện sáng"
          : "Chuyển sang giao diện tối"
      }
    >
      <div className="relative size-4 flex items-center justify-center">
        <Sun
          className={cn(
            "size-4 text-foreground transition-all duration-300 transform",
            resolvedTheme === "dark"
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          )}
        />
        <Moon
          className={cn(
            "size-4 text-foreground absolute transition-all duration-300 transform",
            resolvedTheme === "dark"
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          )}
        />
      </div>
    </Button>
  );
}
