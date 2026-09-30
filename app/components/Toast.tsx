"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { Toast as ToastType } from "../types";

interface ToastProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-sm z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastType;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const config = {
    success: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-900",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    },
    error: {
      bg: "bg-rose-50 border-rose-200 text-rose-900",
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    },
    info: {
      bg: "bg-sky-50 border-sky-200 text-sky-900",
      icon: <Info className="w-5 h-5 text-sky-600 shrink-0" />,
    },
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all transform duration-200 ease-out translate-y-0 ${config.bg}`}
      role="alert"
    >
      {config.icon}
      <p className="text-sm font-medium flex-1 pt-0.5 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors -mr-1 -mt-1 rounded-lg cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
