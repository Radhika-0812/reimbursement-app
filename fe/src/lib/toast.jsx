// src/lib/toast.jsx
import React, { useEffect, useState } from "react";

let _id = 0;
const listeners = new Set();
const emit = (e) => listeners.forEach((fn) => fn(e));

export function toast(message, opts = {}) {
  const id = ++_id;
  const { type = "info", duration = 3000, action } = opts;
  emit({ kind: "add", item: { id, message, type, duration, action } });
  return id;
}
toast.dismiss = (id) => emit({ kind: "remove", id });
toast.promise = async (p, labels = {}, opts = {}) => {
  const { loading = "Working…", success = "Done!", error = "Failed" } = labels;
  const id = toast(loading, { ...opts, type: "info", duration: 999999 });
  try {
    const res = await p;
    toast.dismiss(id);
    toast(success, { ...opts, type: "success" });
    return res;
  } catch (e) {
    toast.dismiss(id);
    toast(typeof error === "function" ? error(e) : error, { ...opts, type: "error", duration: 5000 });
    throw e;
  }
};

function useBus() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const on = (evt) => {
      if (evt.kind === "add") {
        const t = evt.item;
        setItems((prev) => [...prev, t]);
        if (t.duration !== Infinity && t.duration > 0) {
          const timer = setTimeout(() => emit({ kind: "remove", id: t.id }), t.duration);
          return () => clearTimeout(timer);
        }
      } else if (evt.kind === "remove") {
        setItems((prev) => prev.filter((x) => x.id !== evt.id));
      }
    };
    listeners.add(on);
    return () => listeners.delete(on);
  }, []);
  return { items, remove: (id) => emit({ kind: "remove", id }) };
}

function color(type) {
  switch (type) {
    case "success": return { bar: "oklch(75% .15 150)" };
    case "error":   return { bar: "oklch(62% .20 25)" };
    case "warning": return { bar: "oklch(85% .12 85)" };
    default:        return { bar: "var(--primary)" };
  }
}

export function ToastViewport() {
  const { items, remove } = useBus();
  return (
    <div className="fixed z-[10000] bottom-4 right-4 flex flex-col gap-2 w-[min(92vw,380px)]">
      {items.map((t) => {
        const c = color(t.type);
        return (
          <div key={t.id} className="rounded-xl border shadow-lg overflow-hidden"
               style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
            <div className="flex">
              <div style={{ width: 6, background: c.bar }} />
              <div className="flex-1 p-3">
                <div className="text-sm">{t.message}</div>
                {t.action && (
                  <button
                    onClick={() => { try { t.action.onClick?.(); } finally { remove(t.id); } }}
                    className="mt-2 text-xs underline"
                    style={{ color: "var(--primary)" }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button onClick={() => remove(t.id)} className="px-2 text-lg opacity-60 hover:opacity-100" aria-label="Dismiss">×</button>
            </div>
          </div>
        );
      })}
  
    </div>
  );
}

export default toast;
