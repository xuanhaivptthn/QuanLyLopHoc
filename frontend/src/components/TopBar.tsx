"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

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
        {/* Dark/Light Theme Toggle */}
        <ThemeToggle />

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
