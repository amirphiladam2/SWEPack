"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ApiError, fetchCollectionResources, fetchCollections } from "@/lib/api";
import { toResourceViewModel, type Resource } from "@/types/resource";
import { useAuthSession } from "@/components/providers/auth-session-provider";

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const {
    user: currentUser,
    isReady,
    error: sessionError,
    refresh,
  } = useAuthSession();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [collectionName, setCollectionName] = useState("Collection");

  useEffect(() => {
    if (!isReady || !currentUser) return;
    Promise.all([fetchCollectionResources(params.id), fetchCollections()])
      .then(([items, collections]) => {
        setResources(
          items.map(({ resource }) => toResourceViewModel(resource, new Set())),
        );
        setCollectionName(
          collections.find((collection) => collection.id === params.id)?.name ??
            "Collection",
        );
      })
      .catch((requestError) => {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "We couldn't load this collection.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [params.id, isReady, currentUser]);

  if (!isReady) {
    return (
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]" role="status">
          Checking your account…
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-xl rounded-xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight">
            {sessionError ? "Could not check your sign-in" : "Sign in to view this collection"}
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {sessionError
              ? sessionError
              : "Sign in to view your saved collection and its resources."}
          </p>
          {sessionError ? (
            <button
              className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-[var(--blue)] px-4 text-xs font-semibold text-white hover:opacity-90"
              onClick={() => void refresh()}
              type="button"
            >
              Try again
            </button>
          ) : (
            <Link
              className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-[var(--blue)] px-4 text-xs font-semibold text-white hover:opacity-90"
              href="/login"
            >
              Sign in
            </Link>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex items-center gap-1 text-[11px] text-[var(--muted)]"><Link href="/collections">Collections</Link><ChevronRight size={13} /><strong className="text-[var(--text)]">{collectionName}</strong>
        </div>
        <header className="flex flex-col justify-between gap-6 py-12 sm:flex-row sm:items-end sm:py-16">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--blue)]">CURATED LIST</p>
            <h1 className="text-4xl font-bold tracking-[-0.06em] sm:text-5xl">{collectionName}</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">{resources.length} resources saved in this collection.</p>
          </div>
          <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 text-xs font-semibold hover:bg-[var(--surface-muted)]" href="/collections">
            All collections
          </Link>
        </header>
        {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700" role="alert">{error}</p>}
        {isLoading ? (
          <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]">Loading resources…</div>
        ) : resources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center">
            <h3 className="font-semibold">This collection is empty</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">Save a resource to a collection when collection management is available.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {resources.map((resource) => (
              <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm" key={resource.id}>
                <div className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-bold ${resource.color}`}>
                    {resource.letter}
                  </span>
                  <div>
                    <h3 className="font-semibold">{resource.name}</h3>
                    <span className="mt-1 inline-block text-[11px] text-[var(--muted)]">{resource.type}</span>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{resource.description}</p>
                <div className="mt-5 flex items-center border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                  <a
                    className="overflow-hidden text-ellipsis whitespace-nowrap hover:text-[var(--blue)]"
                    href={/^https?:\/\//i.test(resource.url) ? resource.url : `https://${resource.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {resource.url}
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
    </main>
  );
}
