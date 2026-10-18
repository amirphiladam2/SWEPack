import { ResourceCard } from "@/components/resources/resource-card";
import type { Resource } from "@/types/resource";

type Props = {
  resources: Resource[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
};

export function ResourceGrid({
  resources,
  loading,
  error,
  onRetry,
  hasFilters,
  onClearFilters,
}: Props) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading resources" aria-busy="true" role="status">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            className="min-h-[372px] animate-pulse overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]"
            key={index}
          >
            <div className="h-[138px] bg-[var(--surface-muted)]" />
            <div className="space-y-4 p-5">
              <div className="h-5 w-24 rounded bg-[var(--surface-muted)]" />
              <div className="h-5 w-3/4 rounded bg-[var(--surface-muted)]" />
              <div className="space-y-2">
                <div className="h-3 rounded bg-[var(--surface-muted)]" />
                <div className="h-3 rounded bg-[var(--surface-muted)]" />
                <div className="h-3 w-2/3 rounded bg-[var(--surface-muted)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (error && !resources.length) {
    return (
      <div
        className="grid min-h-64 place-items-center rounded-xl border border-dashed border-red-200 px-4 text-center"
        role="alert"
      >
        <div>
          <p className="text-sm text-red-600">{error}</p>
          <button
            className="mt-4 rounded-lg border border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            type="button"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (!resources.length) {
    return (
      <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--line)] px-4 text-center">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">
            {hasFilters ? "No resources match these filters." : "No resources yet."}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {hasFilters
              ? "Try a different search or clear your filters."
              : "Check back soon for new additions."}
          </p>
          {hasFilters && (
            <button
              className="mt-4 rounded-lg bg-[var(--blue)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              type="button"
              onClick={onClearFilters}
            >
              Clear search and filters
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <>
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900" role="status">
          <span>Showing previously loaded results. {error}</span>
          <button
            className="shrink-0 font-semibold underline"
            type="button"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </>
  );
}
