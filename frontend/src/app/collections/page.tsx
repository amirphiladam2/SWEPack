"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ApiError, createCollection, deleteCollection, fetchCollections } from "@/lib/api";
import type { BackendCollection } from "@/types/backend";
import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { CollectionCreateForm } from "@/components/collections/collection-create-form";
import { CollectionList } from "@/components/collections/collection-list";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<BackendCollection[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCollections()
      .then(setCollections)
      .catch((requestError) => {
        setError(
          requestError instanceof ApiError && requestError.status === 401
            ? "Sign in to create and manage collections."
            : "We couldn't load your collections.",
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const collection = await createCollection({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setCollections((current) => [collection, ...current]);
      setName("");
      setDescription("");
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We couldn't create this collection.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(collection: BackendCollection) {
    if (!window.confirm(`Delete "${collection.name}"?`)) return;
    setError("");
    try {
      await deleteCollection(collection.id);
      setCollections((current) => current.filter((item) => item.id !== collection.id));
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We couldn't delete this collection.",
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <Navbar />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
          <Link href="/" className="hover:text-[var(--text)]">Home</Link>
          <span>›</span>
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
            isSubmitting={isSubmitting}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onSubmit={handleCreate}
          />
          <CollectionList
            collections={collections}
            isLoading={isLoading}
            error={error}
            onDelete={handleDelete}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
