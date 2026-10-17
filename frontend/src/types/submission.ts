import type { ResourceType } from "@/types/backend";

export type ResourceSubmission = {
  title: string;
  url: string;
  description?: string;
  logoUrl?: string;
  previewImageUrl?: string;
  type: ResourceType;
  categoryId?: string;
  tagIds?: string[];
};
