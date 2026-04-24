"use client";

import { useEffect } from "react";

interface PendingToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

export function PendingToast({
  message,
  onDismiss,
  durationMs = 3500,
}: PendingToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <div
      className="fixed bottom-24 left-4 right-4 z-[60] animate-slide-up cursor-pointer"
      onClick={onDismiss}
    >
      <div className="bg-zinc-900/95 text-white text-sm rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3 backdrop-blur-sm max-w-md mx-auto">
        <span className="text-base shrink-0">💰</span>
        <p className="flex-1 leading-snug">{message}</p>
        <span className="text-zinc-400 text-xs shrink-0 font-bold">×</span>
      </div>
    </div>
  );
}
