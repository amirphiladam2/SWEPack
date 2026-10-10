import { Search } from "lucide-react";

type Props = { value: string; onChange: (value: string) => void };

export function SearchBar({ value, onChange }: Props) {
  return (
    <label className="flex h-14 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-[var(--muted)] shadow-sm">
      <Search size={16} aria-hidden="true" />
      <input
        className="min-w-0 flex-1 bg-transparent px-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search resources, tools, and libraries"
        aria-label="Search resources"
      />
      <kbd className="rounded-md border border-[var(--line)] bg-[var(--surface-muted)] px-2 py-1 text-[11px]">⌘ K</kbd>
    </label>
  );
}
