"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { ApiError, createCollection, deleteCollection, fetchCollections } from "@/lib/api";
import type { BackendCollection } from "@/types/backend";
import { CollectionCreateForm } from "@/components/collections/collection-create-form";
import { CollectionList } from "@/components/collections/collection-list";
import { useAuthSession } from "@/components/providers/auth-session-provider";

export default function CollectionsPage() {
  const {
    user: currentUser,
    isReady,
    error: sessionError,
    refresh,
  } = useAuthSession();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const collectionsQuery = useQuery({
    queryKey: ["collections"],
    queryFn: fetchCollections,
    enabled: isReady && Boolean(currentUser),
  });
  const collections = collectionsQuery.data ?? [];
  const createMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: (collection) => {
      queryClient.setQueryData<BackendCollection[]>(["collections"], (current = []) => [collection, ...current]);
      setName("");
      setDescription("");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: (_, id) => {
      queryClient.setQueryData<BackendCollection[]>(["collections"], (current = []) => current.filter((item) => item.id !== id));
    },
  });

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We couldn't create this collection.",
      );
    }
  }

  async function handleDelete(collection: BackendCollection) {
    if (!window.confirm(`Delete "${collection.name}"?`)) return;
    setError("");
    try {
      await deleteMutation.mutateAsync(collection.id);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We couldn't delete this collection.",
      );
    }
  }

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
            {sessionError ? "Could not check your sign-in" : "Sign in to view collections"}
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {sessionError
              ? sessionError
              : "Sign in to create and manage your saved collections."}
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
        <div className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
          <Link href="/" className="hover:text-[var(--text)]">Home</Link>
          <ChevronRight size={13} />
          <strong className="text-[var(--text)]">Collections</strong>
        </div>
        <header className="flex flex-col justify-between gap-6 py-12 sm:flex-row sm:items-end sm:py-16">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--blue)]">YOUR LIBRARY</p>
            <h1 className="text-4xl font-bold leading-tight tracking-[-0.06em] sm:text-5xl">Collections</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">Organize the resources you want to revisit and share.</p>
          </div>
          <div className="flex items-center gap-5">
            <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--muted)] shadow-sm">
              <span>{collections.length === 1 ? "Collection" : "Collections"}</span>
              <strong className="text-sm text-[var(--text)]">{collections.length}</strong>
            </span>
            <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 text-xs font-semibold hover:bg-[var(--surface-muted)]" href="/">
              Browse resources <ArrowUpRight size={15} />
            </Link>
          </div>
        </header>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(240px,.72fr)_minmax(0,1.28fr)]">
          <CollectionCreateForm
            name={name}
            description={description}
            isSubmitting={createMutation.isPending}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onSubmit={handleCreate}
          />
          <CollectionList
            collections={collections}
            isLoading={collectionsQuery.isPending}
            error={error || (collectionsQuery.error ? "We couldn't load your collections." : "")}
            onDelete={handleDelete}
          />
        </div>
    </main>
  );
}
