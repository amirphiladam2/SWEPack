"use client";

import { Check, FolderPlus, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  addResourceToCollection,
  ApiError,
  fetchCollections,
} from "@/lib/api";
import type { BackendCollection } from "@/types/backend";

type Props = {
  resourceId: string;
  resourceName: string;
};

let collectionsCache: BackendCollection[] | null = null;

export function AddToCollectionMenu({ resourceId, resourceName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [collections, setCollections] = useState<BackendCollection[]>(
    () => collectionsCache ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  async function openMenu() {
    setIsOpen(true);
    setError("");
    if (collectionsCache?.length) return;
    setLoading(true);
    try {
      const items = await fetchCollections();
      collectionsCache = items;
      setCollections(items);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError && requestError.status === 401
          ? "Sign in to add resources to a collection."
          : "Collections could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function addToCollection(collection: BackendCollection) {
    setAddingId(collection.id);
    setError("");
    try {
      await addResourceToCollection(collection.id, resourceId);
      setAddedIds((current) => new Set(current).add(collection.id));
    } catch (requestError) {
      setError(
        requestError instanceof ApiError && requestError.status === 409
          ? "Already in this collection."
          : requestError instanceof ApiError
            ? requestError.message
            : "This resource could not be added.",
      );
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--blue)]"
        type="button"
        aria-label={`Add ${resourceName} to a collection`}
        aria-expanded={isOpen}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
      >
        <FolderPlus size={16} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-xl">
          <p className="px-2 pb-2 pt-1 text-xs font-bold text-[var(--text)]">Add to collection</p>
          {loading && <div className="flex items-center gap-2 px-2 py-4 text-xs text-[var(--muted)]"><LoaderCircle className="animate-spin" size={15} /> Loading collections</div>}
          {!loading && error && <p className="px-2 py-3 text-xs leading-5 text-red-600" role="alert">{error}</p>}
          {!loading && !error && collections.length === 0 && <p className="px-2 py-3 text-xs leading-5 text-[var(--muted)]">Create a collection first, then add this resource.</p>}
          {!loading && collections.map((collection) => {
            const added = addedIds.has(collection.id);
            return (
              <button
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-xs transition hover:bg-[var(--surface-muted)] disabled:opacity-60"
                disabled={addingId === collection.id || added}
                key={collection.id}
                type="button"
                onClick={() => addToCollection(collection)}
              >
                <span className="truncate font-medium text-[var(--text)]">{collection.name}</span>
                {addingId === collection.id ? <LoaderCircle className="shrink-0 animate-spin text-[var(--muted)]" size={14} /> : added && <Check className="shrink-0 text-[var(--blue)]" size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
