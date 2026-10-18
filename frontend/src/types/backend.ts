export const resourceTypes = [
  "TOOL",
  "DOCUMENTATION",
  "LIBRARY",
  "GUIDE",
  "COURSE",
  "ROADMAP",
  "ARTICLE",
  "COMMUNITY",
  "REPOSITORY",
  "OTHER",
] as const;

export type ResourceType = (typeof resourceTypes)[number];

export type BackendCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
};

export type BackendTag = {
  id: string;
  name: string;
  slug: string;
};

export type BackendResource = {
  id: string;
  title: string;
  slug: string;
  url: string;
  description: string | null;
  type: ResourceType;
  status: "PENDING" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
  logoUrl: string | null;
  faviconUrl: string | null;
  previewImageUrl: string | null;
  domain: string | null;
  notes: string | null;
  category: BackendCategory | null;
  tags: Array<{ tag: BackendTag }>;
  submittedBy?: { id: string; name: string; email?: string; role?: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type ResourceLibraryItem = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  type: ResourceType;
  logoUrl: string | null;
  previewImageUrl: string | null;
  category: Pick<BackendCategory, "id" | "name"> | null;
  tags: Array<{ tag: Pick<BackendTag, "name"> }>;
};

export type ResourceListResponse<
  TResource extends BackendResource | ResourceLibraryItem = BackendResource,
> = {
  data: TResource[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type AdminResourceSummary = {
  total: number;
  pending: number;
  published: number;
  rejected: number;
  archived: number;
};

export type AdminResourceListResponse = ResourceListResponse;

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  accessToken: string;
  user: UserProfile;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
};

export type BackendCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { resources: number };
};
