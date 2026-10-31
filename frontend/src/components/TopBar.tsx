"use client";

import React from "react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Sun, Moon, FileText, Zap } from "lucide-react";

interface TopBarProps {
  currentTabName: string;
  selectedClassName?: string | null;
  onOpenNewSession?: () => void;
  onOpenMobileMenu?: () => void;
}

export function TopBar({
  currentTabName,
  selectedClassName,
  onOpenNewSession,
  onOpenMobileMenu,
}: TopBarProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="h-14 bg-card text-card-foreground border-b border-border sticky top-0 z-10 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenMobileMenu}
            className="md:hidden"
            aria-label="Mở menu"
          >
            <Menu className="size-4" />
          </Button>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-muted-foreground">EduAttend</span>
          <span>/</span>
          <span className="text-foreground font-semibold">{currentTabName}</span>
          {selectedClassName && (
            <>
              <span>/</span>
              <Badge variant="secondary" className="font-mono text-[11px] font-semibold max-w-[180px] truncate">
                {selectedClassName}
              </Badge>
            </>
          )}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Backend Status Badge */}
        <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium py-1">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>Spring Boot (:8080)</span>
        </Badge>

        {/* Swagger UI link */}
        <Button
          variant="outline"
          size="sm"
          className="hidden lg:inline-flex text-xs"
          render={
            <a
              href="http://localhost:8080/api/swagger-ui.html"
              target="_blank"
              rel="noreferrer"
            />
          }
          title="Tài liệu OpenAPI / Swagger"
        >
          <FileText className="size-3.5" data-icon="inline-start" />
          Swagger Docs
        </Button>

        {/* Dark/Light Theme Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={resolvedTheme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="size-4 text-foreground" />
          ) : (
            <Moon className="size-4 text-foreground" />
          )}
        </Button>

        {/* Quick Launch QR Button */}
        {onOpenNewSession && (
          <Button
            type="button"
            size="sm"
            onClick={onOpenNewSession}
            className="text-xs"
          >
            <Zap className="size-3.5" data-icon="inline-start" />
            <span className="hidden sm:inline">Điểm Danh Ngay</span>
          </Button>
        )}
      </div>
    </header>
  );
}
