"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/client-utils";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  push: (toast: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      window.setTimeout(() => remove(id), 4200);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, message) => push({ title, message, tone: "success" }),
      error: (title, message) => push({ title, message, tone: "error" }),
      info: (title, message) => push({ title, message, tone: "info" }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-[76px] z-[100] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-2xl backdrop-blur-xl",
                toast.tone === "success" && "border-green/30 bg-[#12291d]/95",
                toast.tone === "error" && "border-red/30 bg-[#2a171c]/95",
                toast.tone === "info" && "border-line bg-surface/95",
              )}
            >
              {toast.tone === "success" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green" />
              ) : toast.tone === "error" ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-red" />
              ) : (
                <Info className="mt-0.5 size-4 shrink-0 text-blue" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold">{toast.title}</p>
                {toast.message ? <p className="mt-0.5 text-xs leading-5 text-muted">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className="rounded p-0.5 text-muted transition hover:bg-white/5 hover:text-white"
                aria-label="Dismiss notification"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
