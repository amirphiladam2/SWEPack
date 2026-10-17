import { ResourceCard } from "@/components/resources/resource-card";
import type { Resource } from "@/types/resource";

type Props = {
  resources: Resource[];
  loading: boolean;
  error: string | null;
};

export function ResourceGrid({ resources, loading, error }: Props) {
  if (loading) return <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]" role="status">Loading resources…</div>;
  if (error) return <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-red-200 px-4 text-center text-sm text-red-600" role="alert">{error}</div>;
  if (!resources.length) return <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--line)] px-4 text-center text-sm text-[var(--muted)]">No resources matched your search.</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {resources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}
    </div>
  );
}
