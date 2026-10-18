"use client";

import { useMemo } from "react";
import {
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";
import { ApiError, fetchResources } from "@/lib/api";
import { toResourceViewModel } from "@/types/resource";

export function useResources(
  query: string,
  categoryId: string,
  page: number,
  sort: "newest" | "title",
) {
  const resourcesQuery = useQuery({
    queryKey: ["resources", { search: query, categoryId, page, sort }],
    queryFn: ({ signal }) =>
      fetchResources({
        search: query,
        categoryId,
        page,
        sort,
        signal,
      }),
    placeholderData: keepPreviousData,
  });
  const response = resourcesQuery.data;
  const resources = useMemo(
    () =>
      (response?.data ?? []).map((resource) =>
        toResourceViewModel(resource),
      ),
    [response?.data],
  );

  const queryError = resourcesQuery.error;
  return {
    resources,
    isLoading: resourcesQuery.isPending && !resourcesQuery.data,
    isFetching: resourcesQuery.isFetching,
    error:
      queryError instanceof ApiError
        ? queryError.message
        : queryError
          ? "We couldn’t load resources. Please try again."
          : null,
    meta: response?.meta ?? null,
    retry: () => resourcesQuery.refetch(),
  };
}
