"use client";

import { useState } from "react";
import { Bookmark, ExternalLink } from "lucide-react";
import type { Resource } from "@/types/resource";

type Props = { resource: Resource; onSave: (id: string) => void };

function getResourceUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function ResourcePreview({ resource }: { resource: Resource }) {
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(resource.url)}&sz=128`;
  const [source, setSource] = useState(resource.previewUrl ?? faviconUrl);
  const [isFavicon, setIsFavicon] = useState(!resource.previewUrl);
  const [showFallback, setShowFallback] = useState(false);

  return (
    <a className={`relative -mx-[18px] mb-4 grid h-[126px] place-items-center overflow-hidden text-white no-underline ${resource.color} ${isFavicon ? "bg-[var(--surface-muted)]" : ""}`} href={getResourceUrl(resource.url)} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${resource.name} website`}>
      {showFallback ? <span className="relative z-10 text-2xl font-bold">{resource.letter}</span> : <img className={isFavicon ? "relative z-10 h-13 w-13 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 object-contain" : "relative z-10 h-full w-full object-cover"} src={source} alt="" loading="lazy" decoding="async" onError={() => { if (source !== faviconUrl) { setSource(faviconUrl); setIsFavicon(true); return; } setShowFallback(true); }} />}
      <span className="absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-black/50 to-transparent" />
      <span className="absolute inset-x-3 bottom-2 z-20 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold">{resource.url}</span>
    </a>
  );
}

export function ResourceCard({ resource, onSave }: Props) {
  return (
    <article className="group flex min-h-[340px] flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] p-[18px] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-lg">
      <ResourcePreview resource={resource} />
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--blue)]">{resource.category} / {resource.sub}</p>
        <button className={`grid h-9 w-9 place-items-center rounded-lg border transition ${resource.saved ? "border-blue-200 bg-[var(--blue-soft)] text-[var(--blue)]" : "border-transparent text-[var(--text)] hover:border-[var(--line)] hover:bg-[var(--surface-muted)] hover:text-[var(--blue)]"}`} onClick={() => onSave(resource.id)} aria-label={`${resource.saved ? "Remove" : "Save"} ${resource.name}`} aria-pressed={resource.saved}>
          <Bookmark size={19} strokeWidth={1.8} fill={resource.saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-bold ${resource.color}`}>{resource.letter}</span>
        <div><h3 className="text-base font-semibold tracking-tight">{resource.name}</h3><span className="mt-1 inline-block text-[11px] text-[var(--muted)]">{resource.type}</span></div>
      </div>
      <p className="mt-4 line-clamp-3 text-[13px] leading-6 text-[var(--muted)]">{resource.description}</p>
      {resource.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Resource tags">{resource.tags.slice(0, 3).map((tag) => <span className="rounded-full border border-[var(--line)] px-2 py-1 text-[10px] text-[var(--muted)]" key={tag}>{tag}</span>)}</div>}
      <div className="mt-auto flex items-center border-t border-[var(--line)] pt-3 text-[11px] text-[var(--muted)]">
        <a className="flex min-w-0 items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap transition hover:text-[var(--blue)]" href={getResourceUrl(resource.url)} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${resource.name} website`}>
          <ExternalLink size={13} /> {resource.url}
        </a>
      </div>
    </article>
  );
}
