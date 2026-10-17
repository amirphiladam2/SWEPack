import type { Category } from "@/types/resource";

type Props = {
  categories: Category[];
  tags: string[];
  selected: string;
  onSelect: (category: string) => void;
  onTagSelect: (tag: string) => void;
};

export function FilterSidebar({ categories, tags, selected, onSelect, onTagSelect }: Props) {
  return (
    <aside className="surface-card hidden rounded-2xl p-5 lg:block" aria-label="Resource filters">
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-4 text-xs">
        <strong>Refine results</strong>
        <button className="text-xs text-[var(--blue)]" type="button" onClick={() => onSelect("")}>Clear all</button>
      </div>
      <p className="mb-3 mt-5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Categories</p>
      {categories.map(({ id, name, count }) => (
        <label className="grid min-h-9 cursor-pointer grid-cols-[18px_1fr_auto] items-center gap-2 rounded-lg px-1 text-[13px] transition hover:bg-[var(--surface-muted)]" key={id}>
          <input
            className="h-4 w-4 accent-[var(--blue)]"
            type="checkbox"
            checked={selected === id}
            onChange={() => onSelect(selected === id ? "" : id)}
          />
          <span>{name}</span>
          <small className="text-xs text-[var(--muted)]">{count}</small>
        </label>
      ))}
      <div className="mt-5 border-t border-[var(--line)] pt-1">
        <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Popular tags</p>
        {tags.map((tag) => (
          <button className="m-1 rounded-full bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--muted)] transition hover:bg-[var(--blue-soft)] hover:text-[var(--blue)]" type="button" key={tag} onClick={() => onTagSelect(tag)}>
            {tag}
          </button>
        ))}
      </div>
    </aside>
  );
}
