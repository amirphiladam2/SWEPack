"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  fetchResourceMetadata,
  fetchMyResources,
  submitResource,
} from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { resourceTypes } from "@/types/backend";
import type { ResourceSubmission } from "@/types/submission";
import { useTaxonomy } from "@/hooks/use-taxonomy";

export function SubmitResourceForm() {
  const queryClient = useQueryClient();
  const { categories, tags } = useTaxonomy();
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    "Thanks! Your resource was submitted for review.",
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [previewImageUrl, setPreviewImageUrl] = useState<string | undefined>();
  const [metadataStatus, setMetadataStatus] = useState<"idle" | "loading" | "error">("idle");
  const [metadataMessage, setMetadataMessage] = useState("");
  const [isTitleEdited, setIsTitleEdited] = useState(false);
  const [isDescriptionEdited, setIsDescriptionEdited] = useState(false);

  async function populateFromUrl() {
    if (!url.trim() || !/^https?:\/\//i.test(url.trim())) return;
    setMetadataStatus("loading");
    setMetadataMessage("");
    try {
      const metadata = await fetchResourceMetadata(url.trim());
      if (!isTitleEdited && metadata.title) setTitle(metadata.title);
      if (!isDescriptionEdited && metadata.description) setDescription(metadata.description);
      setLogoUrl(metadata.logoUrl);
      setPreviewImageUrl(metadata.previewImageUrl);
      setMetadataStatus("idle");
    } catch (requestError) {
      setMetadataStatus("error");
      setMetadataMessage(
        requestError instanceof ApiError
          ? requestError.message
          : "We couldn't fetch details for this URL.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedForm = event.currentTarget;
    setStatus("submitting");
    setError("");
    setSuccessMessage("Thanks! Your resource was submitted for review.");
    const form = new FormData(event.currentTarget);
    const typeValue = String(form.get("type") ?? "");
    const type = resourceTypes.find((resourceType) => resourceType === typeValue);
    if (!type) {
      setStatus("error");
      setError("Please select a valid resource type.");
      return;
    }
    const submission: ResourceSubmission = {
      title: title.trim(),
      url: url.trim(),
      description: description.trim(),
      logoUrl,
      previewImageUrl,
      type,
      categoryId: String(form.get("categoryId") ?? "") || undefined,
      tagIds: selectedTagIds,
    };

    function finishSubmission(message: string) {
      submittedForm.reset();
      setSelectedTagIds([]);
      setTitle("");
      setUrl("");
      setDescription("");
      setLogoUrl(undefined);
      setPreviewImageUrl(undefined);
      setIsTitleEdited(false);
      setIsDescriptionEdited(false);
      setSuccessMessage(message);
      setStatus("success");
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["resources"] });
    }

    function urlsMatch(first: string, second: string) {
      try {
        return new URL(first).href === new URL(second).href;
      } catch {
        return first.trim() === second.trim();
      }
    }

    try {
      await submitResource(submission);
      finishSubmission("Thanks! Your resource was submitted for review.");
    } catch (requestError) {
      const isConflict =
        requestError instanceof ApiError && requestError.status === 409;
      const isKnownFailure =
        requestError instanceof ApiError &&
        requestError.status >= 400 &&
        requestError.status < 500 &&
        !isConflict;

      if (isKnownFailure) {
        setStatus("error");
        setError(
          requestError.status === 401
            ? "Please sign in before submitting a resource."
            : requestError.message,
        );
        return;
      }

      try {
        const submittedResources = await fetchMyResources();
        const wasCreated = submittedResources.some(
          (resource) => urlsMatch(resource.url, submission.url),
        );
        if (wasCreated) {
          finishSubmission(
            "This resource has already been submitted for review.",
          );
          return;
        }
      } catch (verificationError) {
        setStatus("error");
        setError(
          isConflict && requestError instanceof ApiError
            ? requestError.message
            : verificationError instanceof ApiError
              ? verificationError.message
              : "We couldn't confirm whether the resource was submitted. Don't submit it again yet; check the admin dashboard before retrying.",
        );
        return;
      }

      setStatus("error");
      setError(
        isConflict && requestError instanceof ApiError
          ? requestError.message
          : requestError instanceof ApiError
            ? requestError.message
            : "The request may have reached the server, but we couldn't confirm it. Don't submit it again yet; check the admin dashboard before retrying.",
      );
    }
  }

  return (
    <form className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm sm:p-8" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Resource details</h2>
        <p className="mt-2 text-xs text-[var(--muted)]">All submissions are reviewed before appearing in the library.</p>
      </div>
      <label className="mt-4 grid gap-2 text-xs font-semibold">
        Resource name
        <input className="h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--blue)]" name="title" required placeholder="e.g. shadcn/ui" value={title} onChange={(event) => { setTitle(event.target.value); setIsTitleEdited(true); }} />
      </label>
      <label className="mt-4 grid gap-2 text-xs font-semibold">
        Website URL
        <input className="h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--blue)]"
          name="url"
          type="url"
          required
          placeholder="https://example.com"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onBlur={() => void populateFromUrl()}
        />
        {metadataStatus === "loading" && <span className="text-xs font-normal text-[var(--muted)]">Finding website details…</span>}
        {metadataStatus === "error" && <span className="text-xs font-normal text-amber-700">{metadataMessage}</span>}
      </label>
      <label className="mt-4 grid gap-2 text-xs font-semibold">
        Short description
        <textarea className="min-h-28 resize-y rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none focus:border-[var(--blue)]"
          name="description"
          required
          rows={4}
          placeholder="Tell the community what makes this resource useful."
          value={description}
          onChange={(event) => { setDescription(event.target.value); setIsDescriptionEdited(true); }}
        />
        <span className="text-xs font-normal text-[var(--muted)]">We fill this from the website when available. You can edit it before submitting.</span>
      </label>
      <div className="grid gap-0 sm:grid-cols-2 sm:gap-4">
        <label className="mt-4 grid gap-2 text-xs font-semibold">
          Category
          <select className="h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--blue)]" name="categoryId" required defaultValue="">
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-4 grid gap-2 text-xs font-semibold">
          Resource type
          <select className="h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--blue)]" name="type" required defaultValue="">
            <option value="" disabled>
              Select a type
            </option>
            {resourceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-4 grid gap-2 text-xs font-semibold">
        Tags
        <div className="flex min-h-11 flex-wrap gap-2 py-1" role="group" aria-label="Tags">
          {tags.map((tag) => (
            <button
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${selectedTagIds.includes(tag.id) ? "border-blue-200 bg-[var(--blue-soft)] text-[var(--blue)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--line-strong)]"}`}
              key={tag.id}
              type="button"
              aria-pressed={selectedTagIds.includes(tag.id)}
              onClick={() =>
                setSelectedTagIds((current) =>
                  current.includes(tag.id)
                    ? current.filter((id) => id !== tag.id)
                    : [...current, tag.id],
                )
              }
            >
              {tag.name}
            </button>
          ))}
          {!tags.length && <span className="text-xs font-normal text-[var(--muted)]">No tags are available yet.</span>}
        </div>
        <span className="text-xs font-normal text-[var(--muted)]">Select any tags that help describe this resource.</span>
      </label>
      <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
        Every resource is reviewed before it appears in the public library.
      </p>
      {status === "success" && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-xs text-green-700" role="status">
          {successMessage}
        </p>
      )}
      {status === "error" && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--line)] px-4 text-xs font-semibold hover:bg-[var(--surface-muted)]" href="/">
          Back to resources
        </Link>
        <button
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--blue)] px-4 text-xs font-semibold text-white hover:bg-blue-700"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Submitting…" : "Submit resource"}
        </button>
      </div>
    </form>
  );
}
