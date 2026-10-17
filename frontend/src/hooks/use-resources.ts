"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  fetchResources,
  fetchSavedResources,
  getAccessToken,
  saveResource as saveResourceRequest,
  unsaveResource,
} from "@/lib/api";
import { toResourceViewModel, type Resource } from "@/types/resource";
import type { ResourceListResponse } from "@/types/backend";

export function useResources(query: string, categoryId: string, page: number) {
  const queryClient = useQueryClient();
  const resourcesQuery = useQuery({
    queryKey: ["resources", { query, categoryId, page }],
    queryFn: () => fetchResources(query, categoryId, page),
    select: (response) => response,
  });
  const savedQuery = useQuery({
    queryKey: ["saved-resources"],
    queryFn: fetchSavedResources,
    enabled: Boolean(getAccessToken()),
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, saved }: { id: string; saved: boolean }) => {
      if (saved) return unsaveResource(id);
      return saveResourceRequest(id);
    },
    onSuccess: (_, { id, saved }) => {
      queryClient.setQueryData(["saved-resources"], (current:
        Array<{ resource: { id: string } }> | undefined) => {
        const items = current ?? [];
        if (saved) return items.filter(({ resource }) => resource.id !== id);
        return items;
      });
      void queryClient.invalidateQueries({ queryKey: ["saved-resources"] });
    },
  });

  const savedIds = new Set(
    (savedQuery.data ?? []).map(({ resource }) => resource.id),
  );
  const response = resourcesQuery.data as ResourceListResponse | undefined;
  const resources: Resource[] = (response?.data ?? []).map((resource) =>
    toResourceViewModel(resource, savedIds),
  );

  async function saveResource(id: string) {
    const item = resources.find((resource) => resource.id === id);
    if (!item || saveMutation.isPending) return;
    await saveMutation.mutateAsync({ id, saved: item.saved });
  }

  const queryError =
    resourcesQuery.error ??
    (savedQuery.error instanceof ApiError && savedQuery.error.status === 401
      ? null
      : savedQuery.error);
  return {
    resources,
    isLoading: resourcesQuery.isPending,
    error:
      queryError instanceof ApiError
        ? queryError.message
        : queryError
          ? "We couldn’t load resources. Check that the API is running."
          : null,
    meta: response?.meta ?? null,
    saveResource,
  };
}
