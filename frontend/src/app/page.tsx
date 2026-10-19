"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, ArrowRight, Compass, Library } from "lucide-react";
import { FilterSidebar } from "@/components/resources/filter-sidebar";
import { ResourceGrid } from "@/components/resources/resource-grid";
import { SearchBar } from "@/components/resources/search-bar";
import { useResources } from "@/hooks/use-resources";
import type { Category } from "@/types/resource";
import { useTaxonomy } from "@/hooks/use-taxonomy";

export default function ResourcesPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"default" | "name">("default");
  const {
    resources,
    isLoading,
    isFetching,
    error,
    meta,
    retry,
  } = useResources(
    debouncedQuery.trim(),
    category,
    page,
    sort === "name" ? "title" : "newest",
  );
  const taxonomy = useTaxonomy();
  const categories: Category[] = taxonomy.categories.map(({ id, name }) => ({
    id,
    name,
  }));
  const tags = taxonomy.tags.map(({ name }) => name);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  function handleQueryChange(value: string) {
    setPage(1);
    setQuery(value);
  }

  function handleCategoryChange(value: string) {
    setPage(1);
    setCategory(value);
  }
  function clearFilters() {
    setPage(1);
    setCategory("");
    setQuery("");
    setDebouncedQuery("");
  }
  return (
    <main className="page-shell flex-1" id="resources">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-12 sm:px-10 sm:py-16">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow mb-4 flex items-center gap-2"><Library size={14} /> Resource library</p>
            <h1 className="mb-5 max-w-3xl font-[family-name:var(--font-geist)] text-[clamp(2.5rem,5vw,4.25rem)] font-bold leading-[1.02] tracking-[-0.055em]">Find tools that help your work take shape.</h1>
            <p className="max-w-xl text-[15px] leading-7 text-[var(--muted)]">
              A carefully organized library of tools, guides, infrastructure,
              and communities worth keeping close.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-5 sm:items-end">
            <div className="flex gap-2">
              <Link className="primary-action inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-white transition" href="/submit">
                Submit a resource <ArrowRight size={14} />
              </Link>
              <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-xs font-bold text-[var(--text)] transition hover:bg-[var(--surface-muted)]" href="/collections">
                <Compass size={14} /> Collections
              </Link>
            </div>
          </div>
          </div>
        </section>
        <section className="relative z-10 -mt-7 px-2 sm:px-6"><SearchBar value={query} onChange={handleQueryChange} /></section>
        <div className="flex gap-2 overflow-x-auto py-6 pb-8" aria-label="Resource categories">
          <button
            className={`h-9 whitespace-nowrap rounded-full px-3.5 text-xs font-bold transition ${!category ? "bg-[var(--blue)] text-white shadow-md shadow-indigo-500/20" : "border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--line-strong)]"}`}
            onClick={() => handleCategoryChange("")}
          >
          All resources {meta?.total ?? "—"}
          </button>
          {categories.map(({ id, name, count }) => (
            <button
              className={`h-9 whitespace-nowrap rounded-full px-3.5 text-xs font-bold transition ${category === id ? "bg-[var(--blue)] text-white shadow-md shadow-indigo-500/20" : "border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--line-strong)]"}`}
              key={id}
              onClick={() => handleCategoryChange(id)}
            >
              {name} {count !== undefined && <small>{count}</small>}
            </button>
          ))}
        </div>
        <section className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <FilterSidebar
            categories={categories}
            tags={tags}
            selected={category}
            onSelect={handleCategoryChange}
            onTagSelect={handleQueryChange}
            onClear={clearFilters}
          />
          <div className="min-w-0">
            <header className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow mb-2">Curated picks</p>
                <h2 className="mb-1 text-2xl font-extrabold tracking-[-.04em]">Resource library</h2>
                <p className="text-xs text-[var(--muted)]" aria-live="polite">
                  {isLoading
                    ? "Loading resources…"
                    : isFetching
                      ? "Updating resources…"
                      : `${meta?.total ?? resources.length} matching resources`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {(query || category) && (
                  <button
                    className="h-10 rounded-xl px-3 text-xs font-semibold text-[var(--blue)] transition hover:bg-[var(--blue-soft)]"
                    type="button"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
                <button
                  className="h-10 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-bold text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)]"
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setSort(sort === "default" ? "name" : "default");
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">Sort: {sort === "default" ? "Default" : "Name"}<ArrowDownUp size={13} /></span>
                </button>
              </div>
            </header>
            <ResourceGrid
              resources={resources}
              loading={isLoading}
              error={error}
              onRetry={retry}
              hasFilters={Boolean(query || category)}
              onClearFilters={clearFilters}
            />
            {meta && meta.totalPages > 0 && (
              <nav className="mt-6 flex items-center justify-center gap-4 text-xs text-[var(--muted)]" aria-label="Resource pages">
                <button
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)]"
                  disabled={page === 1 || isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <span>
                  Page <strong>{meta.page}</strong> of {meta.totalPages}
                </span>
                <button
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)]"
                  disabled={page === meta.totalPages || isFetching}
                  onClick={() =>
                    setPage((current) => Math.min(meta.totalPages, current + 1))
                  }
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </section>
    </main>
  );
}
