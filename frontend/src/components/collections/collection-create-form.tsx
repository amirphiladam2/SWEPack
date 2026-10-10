"use client";

import type { FormEvent } from "react";
import { FolderPlus } from "lucide-react";

type Props = {
  name: string;
  description: string;
  isSubmitting: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CollectionCreateForm({
  name,
  description,
  isSubmitting,
  onNameChange,
  onDescriptionChange,
  onSubmit,
}: Props) {
  return (
    <form
      className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm"
      onSubmit={onSubmit}
    >
      <div className="mb-5 grid h-10 w-10 place-items-center rounded-lg border border-blue-200 bg-[var(--blue-soft)] text-[var(--blue)]">
        <FolderPlus size={18} />
      </div>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">New collection</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          Start a focused list for a project, stack, or learning path.
        </p>
      </div>
      <label className="mt-4 grid gap-2 text-xs font-semibold">
        Name
        <input
          className="h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--blue)]"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          required
          minLength={2}
          maxLength={100}
          placeholder="e.g. React foundations"
        />
      </label>
      <label className="mt-4 grid gap-2 text-xs font-semibold">
        <span>
          Description <span className="font-normal text-[var(--muted)]">Optional</span>
        </span>
        <textarea
          className="min-h-28 resize-y rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none focus:border-[var(--blue)]"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          maxLength={500}
          rows={4}
          placeholder="What belongs in this collection?"
        />
      </label>
      <button
        className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[var(--blue)] px-4 text-xs font-semibold text-white hover:bg-blue-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating…" : "Create collection"}
      </button>
    </form>
  );
}
