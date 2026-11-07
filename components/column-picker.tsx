"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Columns3, RotateCcw, Search } from "lucide-react";
import { Button, cn } from "@/components/ui";
import { orderColumnIds, type LeadColumn } from "@/lib/lead-columns";

export function ColumnPicker({
  options,
  selected,
  onChange,
  onReset,
}: {
  options: LeadColumn[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const root = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const btn = root.current?.querySelector("button");
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const width = 320;
      setPos({
        top: r.bottom + 8,
        left: Math.min(Math.max(16, r.left), window.innerWidth - width - 16),
      });
    };
    place();
    const onDoc = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const query = q.trim().toLowerCase();
  const groups = useMemo(() => {
    const filtered = query
      ? options.filter((o) => o.label.toLowerCase().includes(query) || o.group.toLowerCase().includes(query))
      : options;
    const names = [...new Set(filtered.map((o) => o.group))];
    return names.map((name) => ({ name, items: filtered.filter((o) => o.group === name) }));
  }, [options, query]);

  const apply = (mutate: (ids: Set<string>) => void) => {
    const next = new Set(selected);
    mutate(next);
    onChange(orderColumnIds([...next], options));
  };

  return (
    <div className="relative" ref={root}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Columns3 size={14} />
        Columns
        <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
          {selected.length}
        </span>
      </Button>
      {open ? (
        <div
          className="fixed z-50 w-[320px] overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_18px_40px_rgba(20,50,63,0.14)]"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="border-b border-[var(--line)] p-3">
            <p className="mb-2 text-xs font-medium text-[var(--muted)]">Choose columns to show</p>
            <label className="flex h-9 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-2.5">
              <Search size={14} className="text-[var(--muted)]" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search fields"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
              />
            </label>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {groups.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-[var(--muted)]">No matching fields</p>
            ) : (
              groups.map((group) => (
                <div key={group.name} className="mb-2 last:mb-0">
                  <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    {group.name}
                  </p>
                  {group.items.map((item) => {
                    const on = selectedSet.has(item.id);
                    return (
                      <label
                        key={item.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-[var(--canvas)]",
                          item.locked && "cursor-default opacity-70",
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none flex h-4 w-4 items-center justify-center rounded border",
                            on
                              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                              : "border-[var(--line)] bg-white",
                          )}
                        >
                          {on ? <Check size={11} strokeWidth={3} /> : null}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={on}
                          disabled={item.locked}
                          onChange={(e) =>
                            apply((ids) => {
                              if (e.target.checked) ids.add(item.id);
                              else ids.delete(item.id);
                            })
                          }
                        />
                        <span className="flex-1">{item.label}</span>
                        {item.locked ? <span className="text-[10px] text-[var(--muted)]">Required</span> : null}
                      </label>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] px-3 py-2">
            <button
              type="button"
              className="text-xs text-[var(--muted)] hover:text-[var(--ink)]"
              onClick={() =>
                apply((ids) => {
                  groups.flatMap((g) => g.items).forEach((item) => ids.add(item.id));
                })
              }
            >
              Select all
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
              onClick={onReset}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
