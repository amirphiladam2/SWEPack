import { Command, Search, SlidersHorizontal } from "lucide-react";

type Props = { value: string; onChange: (value: string) => void };

export function SearchBar({ value, onChange }: Props) {
  return (
    <label className="surface-card flex h-[60px] items-center gap-3 rounded-2xl px-4 text-[var(--muted)] transition hover:border-[var(--line-strong)]">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]"><Search size={17} aria-hidden="true" /></span>
      <input
        className="min-w-0 flex-1 bg-transparent px-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search resources, tools, and libraries"
        aria-label="Search resources"
      />
      <kbd className="hidden items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] px-2 py-1 text-[11px] sm:inline-flex"><Command size={11} /> K</kbd>
      <SlidersHorizontal className="sm:hidden" size={17} />
    </label>
  );
}
