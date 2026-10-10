"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchCategories, fetchTags } from "@/lib/api";
import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { FilterSidebar } from "@/components/resources/filter-sidebar";
import { ResourceGrid } from "@/components/resources/resource-grid";
import { SearchBar } from "@/components/resources/search-bar";
import { useResources } from "@/hooks/use-resources";
import type { Category } from "@/types/resource";

export default function ResourcesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"default" | "name">("default");
  const { resources, isLoading, error, meta, saveResource } = useResources(
    query,
    category,
    page,
  );
  useEffect(() => {
    Promise.all([fetchCategories(), fetchTags()])
      .then(([categoryItems, tagItems]) => {
        setCategories(categoryItems.map(({ id, name }) => ({ id, name })));
        setTags(tagItems.map(({ name }) => name));
      })
      .catch(() => setCategories([]));
  }, []);
  function handleQueryChange(value: string) {
    setPage(1);
    setQuery(value);
  }

  function handleCategoryChange(value: string) {
    setPage(1);
    setCategory(value);
  }
  const sortedResources = useMemo(
    () =>
      sort === "name"
        ? [...resources].sort((a, b) => a.name.localeCompare(b.name))
        : resources,
    [resources, sort],
  );
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <Navbar />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-8 sm:px-8 sm:py-10" id="resources">
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]"><Link href="/" className="hover:text-[var(--text)]">Home</Link><span>›</span><strong className="text-[var(--text)]">Resources</strong>
        </div>
        <section className="flex flex-col justify-between gap-8 py-12 sm:flex-row sm:items-end sm:py-16">
          <div className="max-w-2xl">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--blue)]">THE OPEN WEB FOR BUILDERS</p>
            <h1 className="mb-4 max-w-3xl text-[clamp(2.2rem,5vw,3.6rem)] font-bold leading-[1.04] tracking-[-0.07em]">Find the tools that move software forward</h1>
            <p className="max-w-xl text-[15px] leading-7 text-[var(--muted)]">
              A carefully organized library of tools, guides, infrastructure,
              and communities worth keeping close.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-5 sm:items-end">
            <div className="flex gap-2">
              <Link className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--blue)] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700" href="/submit">
                Submit a resource
              </Link>
              <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]" href="/collections">
                Explore collections
              </Link>
            </div>
          </div>
        </section>
        <SearchBar value={query} onChange={handleQueryChange} />
        <div className="flex gap-2 overflow-x-auto py-5 pb-8" aria-label="Resource categories">
          <button
            className={`h-9 whitespace-nowrap rounded-lg px-3 text-xs font-medium ${!category ? "border border-blue-200 bg-[var(--blue-soft)] text-[var(--blue)]" : "text-[var(--muted)] hover:bg-[var(--surface-muted)]"}`}
            onClick={() => handleCategoryChange("")}
          >
          All resources {meta?.total ?? "—"}
          </button>
          {categories.map(({ id, name, count }) => (
            <button
              className={`h-9 whitespace-nowrap rounded-lg px-3 text-xs font-medium ${category === id ? "border border-blue-200 bg-[var(--blue-soft)] text-[var(--blue)]" : "text-[var(--muted)] hover:bg-[var(--surface-muted)]"}`}
              key={id}
              onClick={() => handleCategoryChange(id)}
            >
              {name} {count !== undefined && <small>{count}</small>}
            </button>
          ))}
        </div>
        <section className="grid gap-8 lg:grid-cols-[205px_minmax(0,1fr)]">
          <FilterSidebar
            categories={categories}
            tags={tags}
            selected={category}
            onSelect={handleCategoryChange}
            onTagSelect={handleQueryChange}
          />
          <div className="min-w-0">
            <header className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="mb-1 text-lg font-bold tracking-tight">Resource library</h2>
                <p className="text-xs text-[var(--muted)]">
                  {isLoading
                    ? "Updating resources…"
                    : `${meta?.total ?? sortedResources.length} matching resources`}
                </p>
              </div>
              <button
                className="h-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                onClick={() => setSort(sort === "default" ? "name" : "default")}
              >
                Sort: {sort === "default" ? "Default" : "Name"}⌄
              </button>
            </header>
            <ResourceGrid
              resources={sortedResources}
              loading={isLoading}
              error={error}
              onSave={saveResource}
            />
            {meta && meta.totalPages > 1 && (
              <nav className="mt-6 flex items-center justify-center gap-4 text-xs text-[var(--muted)]" aria-label="Resource pages">
                <button
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)]"
                  disabled={page === 1 || isLoading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <span>
                  Page <strong>{meta.page}</strong> of {meta.totalPages}
                </span>
                <button
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)]"
                  disabled={page === meta.totalPages || isLoading}
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
      <SiteFooter />
    </div>
  );
}
