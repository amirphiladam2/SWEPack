"use client";

import {
  Check,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ApiError,
  createCategory,
  createTag,
  deleteCategory,
  deleteResource,
  deleteTag,
  fetchAdminResources,
  fetchAdminSummary,
  fetchCategories,
  fetchCurrentUser,
  fetchTags,
  updateCategory,
  updateResource,
  updateResourceStatus,
  updateTag,
} from "@/lib/api";
import {
  BackendCategory,
  BackendResource,
  BackendTag,
  resourceTypes,
} from "@/types/backend";

const statuses = ["PENDING", "PUBLISHED", "REJECTED", "ARCHIVED"] as const;

function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "The request could not be completed. Please try again.";
}

function statusClass(status: BackendResource["status"]) {
  return status === "PUBLISHED"
    ? "bg-green-50 text-green-700"
    : status === "REJECTED"
      ? "bg-red-50 text-red-700"
      : status === "ARCHIVED"
        ? "bg-slate-100 text-slate-600"
        : "bg-amber-50 text-amber-700";
}

export default function AdminPage() {
  const router = useRouter();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resources, setResources] = useState<BackendResource[]>([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, published: 0, rejected: 0, archived: 0 });
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [tags, setTags] = useState<BackendTag[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"resources" | "taxonomy">("resources");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingResource, setEditingResource] = useState<BackendResource | null>(null);
  const [editingCategory, setEditingCategory] = useState<BackendCategory | null>(null);
  const [editingTag, setEditingTag] = useState<BackendTag | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [tagName, setTagName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const resourceLoadId = useRef(0);
  const hasLoadedInitialData = useRef(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [, resourceSummary] = await Promise.all([
        loadResources(),
        fetchAdminSummary(),
      ]);
      setSummary(resourceSummary);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        router.push("/login");
        return;
      }
      setError(
        requestError instanceof ApiError && requestError.status === 403
          ? "Your account does not have administrator access."
          : errorMessage(requestError),
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadResources() {
    const loadId = ++resourceLoadId.current;
    const resourceResponse = await fetchAdminResources(search, status);
    if (loadId === resourceLoadId.current) {
      setResources(resourceResponse.data);
    }
  }

  async function loadTaxonomy() {
    try {
      const [categoryItems, tagItems] = await Promise.all([
        fetchCategories(),
        fetchTags(),
      ]);
      setCategories(categoryItems);
      setTags(tagItems);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  useEffect(() => {
    fetchCurrentUser()
      .then((user) => {
        if (user.role !== "ADMIN") {
          setError("Your account does not have administrator access.");
          return;
        }
        setIsAdmin(true);
      })
      .catch((requestError) => {
        if (requestError instanceof ApiError && requestError.status === 401) {
          router.push("/login");
        } else {
          setError(errorMessage(requestError));
        }
      })
      .finally(() => setIsCheckingAccess(false));
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      if (isAdmin) {
        hasLoadedInitialData.current = true;
        void loadData();
      }
    });
    // Initial access loads the summary and resource list together.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !hasLoadedInitialData.current) return;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void loadResources()
        .catch((requestError) => {
          if (requestError instanceof ApiError && requestError.status === 401) {
            router.push("/login");
            return;
          }
          setError(
            requestError instanceof ApiError && requestError.status === 403
              ? "Your account does not have administrator access."
              : errorMessage(requestError),
          );
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(timeout);
    // Filter changes reload only the resource list after the user pauses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, search, status]);

  useEffect(() => {
    queueMicrotask(() => {
      if (isAdmin) void loadTaxonomy();
    });
    // Taxonomy is loaded once after access is confirmed.
  }, [isAdmin]);

  async function changeStatus(resource: BackendResource, nextStatus: BackendResource["status"]) {
    setError("");
    try {
      await updateResourceStatus(resource.id, nextStatus);
      setNotice(`Resource ${nextStatus.toLowerCase()}.`);
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function removeResource(resource: BackendResource) {
    if (!window.confirm(`Delete "${resource.title}"? This cannot be undone.`)) return;
    try {
      await deleteResource(resource.id);
      setNotice("Resource deleted.");
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function saveResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingResource) return;
    const form = new FormData(event.currentTarget);
    setIsSaving(true);
    try {
      await updateResource(editingResource.id, {
        title: String(form.get("title") ?? "").trim(),
        url: String(form.get("url") ?? "").trim(),
        description: String(form.get("description") ?? "").trim(),
        type: String(form.get("type")) as BackendResource["type"],
        categoryId: String(form.get("categoryId") ?? "") || undefined,
      });
      setEditingResource(null);
      setNotice("Resource updated.");
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    setIsSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: categoryName.trim(),
          description: categoryDescription.trim(),
        });
      } else {
        await createCategory({
          name: categoryName.trim(),
          description: categoryDescription.trim() || undefined,
        });
      }
      setEditingCategory(null);
      setCategoryName("");
      setCategoryDescription("");
      setNotice("Category saved.");
      await loadTaxonomy();
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tagName.trim()) return;
    setIsSaving(true);
    try {
      if (editingTag) await updateTag(editingTag.id, { name: tagName.trim() });
      else await createTag({ name: tagName.trim() });
      setEditingTag(null);
      setTagName("");
      setNotice("Tag saved.");
      await loadTaxonomy();
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeTaxonomyItem(type: "category" | "tag", id: string) {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      if (type === "category") await deleteCategory(id);
      else await deleteTag(id);
      setNotice(`${type === "category" ? "Category" : "Tag"} deleted.`);
      await loadTaxonomy();
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  if (isCheckingAccess) {
    return <LoadingState label="Checking administrator access…" />;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
          {error || "Administrator access is required."}
          <Link className="mt-5 inline-flex h-10 items-center rounded-lg border border-red-200 bg-white px-4 font-semibold" href="/">
            Back to resources
          </Link>
      </div>
    );
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--blue)]">ADMIN CONSOLE</p>
            <h1 className="text-3xl font-bold tracking-[-0.05em] sm:text-4xl">Keep SWEPack curated.</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">Review submissions, manage the library, and maintain taxonomy.</p>
          </div>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold hover:bg-[var(--surface-muted)]" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {(error || notice) && (
          <div className={`mt-6 rounded-lg border p-3 text-xs ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`} role={error ? "alert" : "status"}>
            {error || notice}
          </div>
        )}

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total", count: summary.total, Icon: FileText },
            { label: "Pending", count: summary.pending, Icon: Shield },
            { label: "Published", count: summary.published, Icon: Check },
            { label: "Rejected", count: summary.rejected, Icon: X },
            { label: "Archived", count: summary.archived, Icon: FileText },
          ].map(({ label, count, Icon }) => (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm" key={String(label)}>
              <div className="flex items-center justify-between text-[var(--muted)]"><span className="text-xs font-semibold">{label}</span><Icon size={16} /></div>
              <p className="mt-3 text-2xl font-bold">{count}</p>
            </div>
          ))}
        </section>

        <div className="mt-10 flex gap-2 border-b border-[var(--line)]">
          <button className={`border-b-2 px-1 pb-3 text-sm font-semibold ${activeTab === "resources" ? "border-[var(--blue)] text-[var(--blue)]" : "border-transparent text-[var(--muted)]"}`} onClick={() => setActiveTab("resources")}>Resources</button>
          <button className={`border-b-2 px-1 pb-3 text-sm font-semibold ${activeTab === "taxonomy" ? "border-[var(--blue)] text-[var(--blue)]" : "border-transparent text-[var(--muted)]"}`} onClick={() => setActiveTab("taxonomy")}>Categories & tags</button>
        </div>

        {activeTab === "resources" ? (
          <section className="mt-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input className="h-10 flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--blue)]" placeholder="Search title or URL" value={search} onChange={(event) => setSearch(event.target.value)} />
              <select className="h-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--blue)]" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            {loading ? <LoadingState label="Loading resources…" /> : resources.length === 0 ? <EmptyState label="No resources match this view." /> : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="border-b border-[var(--line)] bg-[var(--surface-muted)] text-[var(--muted)]"><tr><th className="px-4 py-3 font-semibold">Resource</th><th className="px-4 py-3 font-semibold">Submitted by</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Created</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead>
                  <tbody>
                    {resources.map((resource) => <tr className="border-b border-[var(--line)] last:border-0" key={resource.id}>
                      <td className="max-w-[330px] px-4 py-4"><p className="font-semibold">{resource.title}</p><a className="mt-1 block truncate text-[var(--blue)] hover:underline" href={resource.url} target="_blank" rel="noreferrer">{resource.url}</a></td>
                      <td className="px-4 py-4 text-[var(--muted)]">{resource.submittedBy?.email ?? "Unknown"}</td>
                      <td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass(resource.status)}`}>{resource.status}</span></td>
                      <td className="px-4 py-4 text-[var(--muted)]">{new Date(resource.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-4"><div className="flex justify-end gap-2">
                        {resource.status === "PENDING" && <><button aria-label={`Approve ${resource.title}`} className="rounded-lg bg-green-600 p-2 text-white hover:bg-green-700" onClick={() => void changeStatus(resource, "PUBLISHED")}><Check size={14} /></button><button aria-label={`Reject ${resource.title}`} className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700" onClick={() => void changeStatus(resource, "REJECTED")}><X size={14} /></button></>}
                        <button aria-label={`Edit ${resource.title}`} className="rounded-lg border border-[var(--line)] p-2 text-[var(--muted)] hover:bg-[var(--surface-muted)]" onClick={() => setEditingResource(resource)}><Pencil size={14} /></button>
                        <button aria-label={`Delete ${resource.title}`} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50" onClick={() => void removeResource(resource)}><Trash2 size={14} /></button>
                      </div></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <TaxonomyPanel title="Categories" icon={<FileText size={16} />} items={categories} name={categoryName} setName={setCategoryName} description={categoryDescription} setDescription={setCategoryDescription} editing={editingCategory} onEdit={(item) => { setEditingCategory(item); setCategoryName(item.name); setCategoryDescription(item.description ?? ""); }} onCancel={() => { setEditingCategory(null); setCategoryName(""); setCategoryDescription(""); }} onSubmit={saveCategory} onDelete={(id) => void removeTaxonomyItem("category", id)} isSaving={isSaving} />
            <TaxonomyPanel title="Tags" icon={<TagIcon size={16} />} items={tags} name={tagName} setName={setTagName} editing={editingTag} onEdit={(item) => { setEditingTag(item); setTagName(item.name); }} onCancel={() => { setEditingTag(null); setTagName(""); }} onSubmit={saveTag} onDelete={(id) => void removeTaxonomyItem("tag", id)} isSaving={isSaving} />
          </section>
        )}
      </main>
      {editingResource && <ResourceEditor resource={editingResource} categories={categories} onClose={() => setEditingResource(null)} onSubmit={saveResource} isSaving={isSaving} />}
    </>
  );
}

function LoadingState({ label }: { label: string }) {
  return <div className="grid min-h-48 place-items-center text-sm text-[var(--muted)]">{label}</div>;
}

function EmptyState({ label }: { label: string }) {
  return <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] p-10 text-center text-sm text-[var(--muted)]">{label}</div>;
}

function ResourceEditor({ resource, categories, onClose, onSubmit, isSaving }: { resource: BackendResource; categories: BackendCategory[]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; isSaving: boolean }) {
  return <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-label="Edit resource">
    <form className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xl" onSubmit={onSubmit}>
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Edit resource</h2><button type="button" aria-label="Close editor" onClick={onClose}><X size={18} /></button></div>
      <label className="mt-5 grid gap-2 text-xs font-semibold">Title<input className="h-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal" name="title" defaultValue={resource.title} required maxLength={150} /></label>
      <label className="mt-4 grid gap-2 text-xs font-semibold">URL<input className="h-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal" name="url" type="url" defaultValue={resource.url} required /></label>
      <label className="mt-4 grid gap-2 text-xs font-semibold">Description<textarea className="min-h-24 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal" name="description" defaultValue={resource.description ?? ""} maxLength={500} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="mt-4 grid gap-2 text-xs font-semibold">Type<select className="h-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal" name="type" defaultValue={resource.type}>{resourceTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="mt-4 grid gap-2 text-xs font-semibold">Category<select className="h-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal" name="categoryId" defaultValue={resource.category?.id ?? ""}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div>
      <div className="mt-6 flex justify-end gap-2"><button type="button" className="h-10 rounded-lg border border-[var(--line)] px-4 text-xs font-semibold" onClick={onClose}>Cancel</button><button className="h-10 rounded-lg bg-[var(--blue)] px-4 text-xs font-semibold text-white" disabled={isSaving}>{isSaving ? "Saving…" : "Save changes"}</button></div>
    </form>
  </div>;
}

function TaxonomyPanel<T extends BackendCategory | BackendTag>({ title, icon, items, name, setName, description, setDescription, editing, onEdit, onCancel, onSubmit, onDelete, isSaving }: { title: string; icon: React.ReactNode; items: T[]; name: string; setName: (value: string) => void; description?: string; setDescription?: (value: string) => void; editing: T | null; onEdit: (item: T) => void; onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onDelete: (id: string) => void; isSaving: boolean }) {
  return <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"><div className="flex items-center gap-2"><span className="text-[var(--blue)]">{icon}</span><h2 className="font-bold">{editing ? `Edit ${title.slice(0, -1).toLowerCase()}` : `Add ${title.slice(0, -1).toLowerCase()}`}</h2></div><form className="mt-4" onSubmit={onSubmit}><input className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm" value={name} onChange={(event) => setName(event.target.value)} placeholder={`${title.slice(0, -1)} name`} required maxLength={title === "Tags" ? 50 : 100} />{description !== undefined && setDescription && <textarea className="mt-3 min-h-20 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description (optional)" maxLength={300} />}{editing && <button type="button" className="mt-2 text-xs font-semibold text-[var(--muted)] underline" onClick={onCancel}>Cancel editing</button>}<button className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--blue)] px-3 text-xs font-semibold text-white" disabled={isSaving}><Plus size={14} />{editing ? "Save" : "Add"}</button></form><div className="mt-6 divide-y divide-[var(--line)]">{items.length === 0 ? <p className="py-5 text-sm text-[var(--muted)]">No {title.toLowerCase()} yet.</p> : items.map((item) => <div className="flex items-center justify-between gap-3 py-3" key={item.id}><div><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-[var(--muted)]">{item.slug}</p></div><div className="flex gap-1"><button aria-label={`Edit ${item.name}`} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-muted)]" onClick={() => onEdit(item)}><Pencil size={14} /></button><button aria-label={`Delete ${item.name}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => onDelete(item.id)}><Trash2 size={14} /></button></div></div>)}</div></div>;
}
