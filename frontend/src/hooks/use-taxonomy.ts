"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCategories, fetchTags } from "@/lib/api";

export function useTaxonomy() {
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });

  return {
    categories: categories.data ?? [],
    tags: tags.data ?? [],
    isLoading: categories.isPending || tags.isPending,
    error: categories.error ?? tags.error,
  };
}
