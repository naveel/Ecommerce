"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { v4 as uuid } from "uuid";

export type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  type?: "success" | "error" | "info";
};

interface ToastContextValue {
  toasts: ToastMessage[];
  push: (toast: Omit<ToastMessage, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const push = useCallback((toast: Omit<ToastMessage, "id">) => {
    setToasts((current) => [
      ...current,
      {
        id: uuid(),
        ...toast
      }
    ]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-soft transition-all`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-sm text-slate-600">{toast.description}</p>
                ) : null}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
