import { ResourceCard } from "@/components/resources/resource-card";
import type { Resource } from "@/types/resource";

type Props = {
  resources: Resource[];
  loading: boolean;
  error: string | null;
  hasFilters: boolean;
  onClearFilters: () => void;
};

export function ResourceGrid({ resources, loading, error, hasFilters, onClearFilters }: Props) {
  if (loading) return <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]" role="status">Loading resources…</div>;
  if (error) return <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-red-200 px-4 text-center text-sm text-red-600" role="alert">{error}</div>;
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {resources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}
    </div>
  );
}
