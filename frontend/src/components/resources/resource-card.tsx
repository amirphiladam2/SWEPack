"use client";

import { useState } from "react";
import { ArrowUpRight, ExternalLink, Globe2 } from "lucide-react";
import { AddToCollectionMenu } from "@/components/collections/add-to-collection-menu";
import type { Resource } from "@/types/resource";

type Props = { resource: Resource };

function getResourceUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function ResourcePreview({ resource }: { resource: Resource }) {
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(resource.url)}&sz=128`;
  const [source, setSource] = useState(resource.previewUrl ?? faviconUrl);
  const [isFavicon, setIsFavicon] = useState(!resource.previewUrl);
  const [showFallback, setShowFallback] = useState(false);

  return (
    <a className={`relative grid h-[138px] place-items-center overflow-hidden text-white no-underline ${resource.color} ${isFavicon ? "bg-[var(--surface-muted)]" : ""}`} href={getResourceUrl(resource.url)} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${resource.name} website`}>
      {showFallback ? <span className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] shadow-sm"><Globe2 size={23} /></span> : <img className={isFavicon ? "relative z-10 h-14 w-14 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5 object-contain shadow-sm" : "relative z-10 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"} src={source} alt="" loading="lazy" decoding="async" onError={() => { if (source !== faviconUrl) { setSource(faviconUrl); setIsFavicon(true); return; } setShowFallback(true); }} />}
      <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-lg bg-black/25 text-white backdrop-blur-sm"><ArrowUpRight size={14} /></span>
    </a>
  );
}

export function ResourceCard({ resource }: Props) {
  return (
    <article className="group flex min-h-[372px] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_16px_35px_-28px_color-mix(in_srgb,var(--text)_65%,transparent)] transition duration-300 hover:-translate-y-1 hover:border-[var(--line-strong)] hover:shadow-[0_24px_42px_-28px_color-mix(in_srgb,var(--text)_65%,transparent)]">
      <ResourcePreview resource={resource} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-md bg-[var(--blue-soft)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--blue)]">{resource.category}</span>
          <div className="flex items-center gap-1.5">
            <AddToCollectionMenu resourceId={resource.id} resourceName={resource.name} />
          </div>
        </div>
        <div className="mt-4 min-w-0">
          <h3 className="truncate text-[17px] font-bold tracking-tight text-[var(--text)]">{resource.name}</h3>
          <span className="mt-1 inline-block text-[11px] font-medium text-[var(--muted)]">{resource.type}</span>
        </div>
        <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-[var(--muted)]">{resource.description}</p>
        {resource.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Resource tags">{resource.tags.slice(0, 2).map((tag) => <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-medium text-[var(--muted)]" key={tag}>{tag}</span>)}{resource.tags.length > 2 && <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-medium text-[var(--muted)]">+{resource.tags.length - 2}</span>}</div>}
        <div className="mt-auto flex items-center border-t border-[var(--line)] pt-4 text-[11px]">
          <a className="flex min-w-0 items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[var(--muted)] transition hover:text-[var(--blue)]" href={getResourceUrl(resource.url)} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${resource.name} website`}>
            <ExternalLink size={13} /> <span className="truncate">Visit website</span><span className="ml-auto truncate font-normal">{resource.url}</span>
          </a>
        </div>
      </div>
    </article>
  );
}
