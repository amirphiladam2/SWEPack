"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchResources,
  fetchSavedResources,
  saveResource as saveResourceRequest,
  unsaveResource,
} from "@/lib/api";
import { toResourceViewModel, type Resource } from "@/types/resource";
import type { ResourceListResponse } from "@/types/backend";

export function useResources(query: string, categoryId: string, page: number) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ResourceListResponse["meta"] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      setMeta(null);
      try {
        const response = await fetchResources(query, categoryId, page);
        let savedIds = new Set<string>();
        try {
          const saved = await fetchSavedResources();
          savedIds = new Set(saved.map(({ resource }) => resource.id));
        } catch (savedError) {
          if (!(savedError instanceof ApiError) || savedError.status !== 401) {
            throw savedError;
          }
        }
        if (!controller.signal.aborted) {
          setResources(
            response.data.map((resource) =>
              toResourceViewModel(resource, savedIds),
            ),
          );
          setMeta(response.meta);
        }
      } catch (requestError) {
        if (!controller.signal.aborted)
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : "We couldn’t load resources. Check that the API is running.",
          );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query, categoryId, page]);

  const saveResource = useCallback(
    async (id: string) => {
      const snapshot = resources;
      setResources((current) =>
        current.map((item) =>
          item.id === id ? { ...item, saved: !item.saved } : item,
        ),
      );
      const item = snapshot.find((resource) => resource.id === id);
      if (!item) return;
      try {
        if (item.saved) await unsaveResource(id);
        else await saveResourceRequest(id);
      } catch (requestError) {
        setResources(snapshot);
        setError(
          requestError instanceof ApiError && requestError.status === 401
            ? "Please sign in to save resources."
            : "That resource could not be saved. Please try again.",
        );
      }
    },
    [resources],
  );

  return { resources, isLoading, error, meta, saveResource };
}
