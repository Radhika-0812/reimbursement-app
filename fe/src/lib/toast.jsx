import React, { useEffect, useMemo, useState } from "react";
import { on, emit } from "./eventBus";

// Use anywhere: toast("Saved!", { type: "success", duration: 3000 })
export function toast(message, opts = {}) {
  emit("toast:show", { id: crypto.randomUUID(), message, ...opts });
}

const DEFAULTS = { type: "info", duration: 3000 };

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const off = on("toast:show", (t) => {
      const toastObj = { ...DEFAULTS, ...t };
      setToasts((prev) => [...prev, toastObj]);
      // auto-dismiss
      const ms = Number(toastObj.duration) || DEFAULTS.duration;
      setTimeout(() => dismiss(toastObj.id), ms);
    });
    return off;
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const typeStyles = useMemo(() => ({
    success: "bg-emerald-600",
    error:   "bg-rose-600",
    warning: "bg-amber-600",
    info:    "bg-slate-800",
  }), []);

  return (
    <div className="fixed z-[9999] top-4 right-4 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto shadow-lg text-white rounded-xl px-4 py-3 min-w-[220px] max-w-xs ${typeStyles[t.type] || typeStyles.info}`}
        >
          <div className="flex items-start gap-3">
            <div className="text-sm leading-snug flex-1">{t.message}</div>
            <button
              className="text-white/80 hover:text-white text-sm"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
