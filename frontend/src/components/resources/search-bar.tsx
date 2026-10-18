"use client";

import { useEffect, useRef } from "react";
import { Command, Search, X } from "lucide-react";

type Props = { value: string; onChange: (value: string) => void };

export function SearchBar({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() !== "k" ||
        (!event.metaKey && !event.ctrlKey) ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <div className="surface-card flex h-[60px] items-center gap-3 rounded-2xl px-4 text-[var(--muted)] transition hover:border-[var(--line-strong)]">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]"><Search size={17} aria-hidden="true" /></span>
      <input
        ref={inputRef}
        className="min-w-0 flex-1 bg-transparent px-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search resources, tools, and libraries"
        aria-label="Search resources"
      />
      {value && (
        <button
          className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
      <button
        className="hidden items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] px-2 py-1 text-[11px] transition hover:text-[var(--text)] sm:inline-flex"
        type="button"
        aria-label="Focus search (Control or Command plus K)"
        title="Focus search (Control or Command + K)"
        onClick={() => inputRef.current?.focus()}
      >
        <Command size={11} aria-hidden="true" /> K
      </button>
    </div>
  );
}
