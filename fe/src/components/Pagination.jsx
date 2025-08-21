import React from "react";

export default function Pagination({ page, total, pageSize = 5, onPage }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < pageCount;

  // compact page buttons (1 … current-1, current, current+1 … last)
  const pages = [];
  const push = (v, label = String(v), disabled = false) =>
    pages.push({ v, label, disabled });

  const addRange = (from, to) => {
    for (let i = from; i <= to; i++) push(i);
  };

  push(1);
  if (page > 3) push(null, "…", true);
  addRange(Math.max(2, page - 1), Math.min(pageCount - 1, page + 1));
  if (page < pageCount - 2) push(null, "…", true);
  if (pageCount > 1) push(pageCount);

  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <button
        onClick={() => canPrev && onPage(page - 1)}
        disabled={!canPrev}
        className="px-3 py-1.5 rounded-md border disabled:opacity-50"
      >
        Prev
      </button>

      <div className="flex items-center gap-1">
        {pages.map((p, idx) =>
          p.disabled ? (
            <span key={idx} className="px-2 text-gray-500">…</span>
          ) : (
            <button
              key={idx}
              onClick={() => onPage(p.v)}
              className={`px-3 py-1.5 rounded-md border ${
                p.v === page ? "bg-blue-950 text-white border-blue-950" : "hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => canNext && onPage(page + 1)}
        disabled={!canNext}
        className="px-3 py-1.5 rounded-md border disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
