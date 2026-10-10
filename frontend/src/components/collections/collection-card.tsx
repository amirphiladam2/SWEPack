import Link from "next/link";
import { ArrowUpRight, Library, Trash2 } from "lucide-react";
import type { BackendCollection } from "@/types/backend";

type Props = {
  collection: BackendCollection;
  onDelete: (collection: BackendCollection) => void;
};

export function CollectionCard({ collection, onDelete }: Props) {
  return (
    <article className="flex flex-col justify-between gap-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm sm:flex-row">
      <div className="flex min-w-0 gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] text-[var(--muted)]">
          <Library size={16} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--blue)]">
            {collection._count?.resources ?? 0} resources
          </p>
          <h3 className="mt-1 font-semibold">{collection.name}</h3>
          <p className="mt-1 max-w-xl text-sm leading-5 text-[var(--muted)]">
            {collection.description || "A personal collection of useful resources."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
        <Link
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-xs font-semibold hover:bg-[var(--surface-muted)]"
          href={`/collections/${collection.id}`}
        >
          Open <ArrowUpRight size={15} />
        </Link>
        <button
          className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-xs font-semibold text-[var(--muted)] hover:text-red-600"
          type="button"
          onClick={() => onDelete(collection)}
          aria-label={`Delete ${collection.name}`}
        >
          <Trash2 size={15} /> <span>Delete</span>
        </button>
      </div>
    </article>
  );
}
