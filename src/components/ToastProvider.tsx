"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: Toast["type"], message: string) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const colors = {
    success: { bg: "var(--bg)", border: "var(--success)", text: "var(--success)", icon: "✓" },
    error: { bg: "var(--bg)", border: "var(--danger)", text: "var(--danger)", icon: "✕" },
    info: { bg: "var(--bg)", border: "var(--primary)", text: "var(--primary)", icon: "i" },
  };
  const c = colors[toast.type];

  return (
    <div
      className="pointer-events-auto animate-fade-in rounded-2xl text-sm font-medium shadow-lg overflow-hidden"
      style={{
        background: c.bg,
        color: c.text,
        boxShadow: "6px 6px 14px var(--shadow-dark), -4px -4px 10px var(--shadow-light)",
      }}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: c.border, color: "#fff" }}
        >
          {c.icon}
        </span>
        <span className="flex-1">{toast.message}</span>
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      </div>
      <div
        className="h-1 rounded-full animate-shrink-bar"
        style={{ background: c.border }}
      />
    </div>
  );
}
