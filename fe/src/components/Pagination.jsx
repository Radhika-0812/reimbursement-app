// src/components/Pagination.jsx
import React from "react";

export default function Pagination({ page, total, pageSize = 5, onPage }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < pageCount;

  // compact page buttons (1 … current-1, current, current+1 … last)
  const pages = [];
  const push = (v, label = String(v), disabled = false) => pages.push({ v, label, disabled });
  const addRange = (from, to) => { for (let i = from; i <= to; i++) push(i); };

  push(1);
  if (page > 3) push(null, "…", true);
  addRange(Math.max(2, page - 1), Math.min(pageCount - 1, page + 1));
  if (page < pageCount - 2) push(null, "…", true);
  if (pageCount > 1) push(pageCount);

  const baseBtn =
    "px-3 py-1.5 rounded-md border text-sm transition-opacity select-none focus:outline-none focus-visible:ring-2";

  const subtle = {
    background: "var(--sidebar-accent)",
    borderColor: "var(--border)",
    color: "var(--foreground)",
  };
  const active = {
    background: "var(--primary)",
    borderColor: "var(--primary)",
    color: "var(--primary-foreground)",
  };

  return (
    <div className="mt-4 flex items-center justify-between gap-2" style={{ color: "var(--foreground)" }}>
      {/* Prev */}
      <button
        onClick={() => canPrev && onPage(page - 1)}
        disabled={!canPrev}
        aria-disabled={!canPrev}
        aria-label="Previous page"
        className={`${baseBtn} ${!canPrev ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}`}
        style={subtle}
      >
        Prev
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pages.map((p, idx) =>
          p.disabled ? (
            <span key={idx} className="px-2" style={{ color: "color-mix(in oklch, var(--foreground) 50%, transparent)" }}>
              …
            </span>
          ) : (
            <button
              key={idx}
              onClick={() => onPage(p.v)}
              aria-current={p.v === page ? "page" : undefined}
              aria-label={p.v === page ? `Page ${p.label}, current` : `Go to page ${p.label}`}
              className={`${baseBtn} hover:opacity-90`}
              style={p.v === page ? active : subtle}
            >
              {p.label}
            </button>
          )
        )}
      </div>

      {/* Next */}
      <button
        onClick={() => canNext && onPage(page + 1)}
        disabled={!canNext}
        aria-disabled={!canNext}
        aria-label="Next page"
        className={`${baseBtn} ${!canNext ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}`}
        style={subtle}
      >
        Next
      </button>
    </div>
  );
}
