import type {
  BackendCategory,
  BackendResource,
  ResourceLibraryItem,
} from "@/types/backend";

export type Resource = {
  id: string;
  name: string;
  category: string;
  sub: string;
  letter: string;
  color: string;
  description: string;
  url: string;
  type: string;
  saved: boolean;
  tags: string[];
  previewUrl?: string;
};

export type Category = {
  id: string;
  name: string;
  count?: number;
};

const colors = ["purple", "mint", "yellow", "violet", "pink", "blue"];
const noSavedResources: ReadonlySet<string> = new Set();

export function toResourceViewModel(
  resource: BackendResource | ResourceLibraryItem,
  savedIds: ReadonlySet<string> = noSavedResources,
): Resource {
  const name = resource.title;
  return {
    id: resource.id,
    name,
    category: resource.category?.name ?? "Uncategorized",
    sub: resource.type,
    letter: name.charAt(0).toUpperCase(),
    color: colors[name.charCodeAt(0) % colors.length],
    description: resource.description ?? "",
    url: resource.url,
    type: resource.type,
    saved: savedIds.has(resource.id),
    tags: resource.tags.map(({ tag }) => tag.name),
    previewUrl: resource.previewImageUrl ?? resource.logoUrl ?? undefined,
  };
}

export function toCategoryViewModel(
  category: BackendCategory,
  resourceCounts: ReadonlyMap<string, number>,
): Category {
  return {
    id: category.id,
    name: category.name,
    count: resourceCounts.get(category.id),
  };
}
