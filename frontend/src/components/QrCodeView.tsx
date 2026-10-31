"use client";

import React, { useMemo } from "react";
import { generateQrMatrix } from "@/lib/qr";

interface QrCodeViewProps {
  value: string;
  size?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
}

export function QrCodeView({
  value,
  size = 240,
  className = "",
  darkColor = "#0f172a",
  lightColor = "#ffffff",
}: QrCodeViewProps) {
  const matrix = useMemo(() => {
    if (!value) return [];
    try {
      return generateQrMatrix(value);
    } catch {
      return [];
    }
  }, [value]);

  if (!matrix || matrix.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs ${className}`}
        style={{ width: size, height: size }}
      >
        Waiting for token...
      </div>
    );
  }

  const dimension = matrix.length;
  const padding = 2; // quiet zone in module units
  const totalDim = dimension + padding * 2;

  // Generate SVG path for dark modules for highest rendering performance
  let path = "";
  for (let r = 0; r < dimension; r++) {
    for (let c = 0; c < dimension; c++) {
      if (matrix[r][c]) {
        const x = c + padding;
        const y = r + padding;
        path += `M${x},${y}h1v1h-1z `;
      }
    }
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center p-3 rounded-2xl bg-white shadow-md border border-slate-200/80 dark:border-slate-700/80 ${className}`}
    >
      <svg
        viewBox={`0 0 ${totalDim} ${totalDim}`}
        width={size}
        height={size}
        className="block rounded-lg"
        shapeRendering="crispEdges"
        aria-label={`QR code for dynamic token: ${value}`}
        role="img"
      >
        <rect width={totalDim} height={totalDim} fill={lightColor} />
        <path d={path} fill={darkColor} />
      </svg>
    </div>
  );
}
