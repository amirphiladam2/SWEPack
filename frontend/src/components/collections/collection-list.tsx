import Link from "next/link";
import type { BackendCollection } from "@/types/backend";
import { CollectionCard } from "@/components/collections/collection-card";

type Props = {
  collections: BackendCollection[];
  isLoading: boolean;
  error: string;
  onDelete: (collection: BackendCollection) => void;
};

export function CollectionList({ collections, isLoading, error, onDelete }: Props) {
  return (
    <section className="min-w-0" aria-live="polite">
      <div className="mb-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--blue)]">
          SAVED WORKSPACES
        </p>
        <h2 className="text-lg font-bold tracking-tight">Your collections</h2>
      </div>
      {error && (
        <div className="mb-3 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p>{error}</p>
          {error.startsWith("Sign in") && (
            <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3 font-semibold">
              Sign in
            </Link>
          )}
        </div>
      )}
      {isLoading ? (
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]">
          Loading collections…
        </div>
      ) : collections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center">
          <h3 className="font-semibold">No collections yet</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Create your first collection, then add resources from the library.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}
