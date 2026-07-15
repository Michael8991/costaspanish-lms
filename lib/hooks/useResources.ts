"use client";

import { useCallback, useEffect, useState } from "react";
import { ResourceListItemDTO } from "@/lib/dto/resource.dto";

type ResourceOwnership = "mine" | "shared" | "all";

type ResourceFilters = {
  search?: string;
  level?: string;
  pedagogicalType?: string;
  format?: string;
  status?: string;
  visibility?: string;
  ownership?: ResourceOwnership;
};

type UseResourcesOptions = ResourceFilters & {
  initialPage?: number;
  limit?: number;
  enabled?: boolean;
};

type ResourcesApiResponse = {
  items?: ResourceListItemDTO[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
  error?: string;
};

type UseResourcesResult = {
  resources: ResourceListItemDTO[];

  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  hasMore: boolean;

  search: string;
  setSearch: (value: string) => void;

  refetch: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  loadMore: () => Promise<void>;
};

export function useResources({
  initialPage = 1,
  limit = 8,
  enabled = true,

  search: initialSearch = "",
  level,
  pedagogicalType,
  format,
  status = "published",
  visibility,
  ownership = "all",
}: UseResourcesOptions = {}): UseResourcesResult {
  const [resources, setResources] = useState<ResourceListItemDTO[]>([]);

  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const buildUrl = useCallback(
    (targetPage: number) => {
      const params = new URLSearchParams();

      params.set("page", String(targetPage));
      params.set("limit", String(limit));

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      if (level) {
        params.set("level", level);
      }

      if (pedagogicalType) {
        params.set("pedagogicalType", pedagogicalType);
      }

      if (format) {
        params.set("format", format);
      }

      if (status) {
        params.set("status", status);
      }

      if (visibility) {
        params.set("visibility", visibility);
      }

      if (ownership) {
        params.set("ownership", ownership);
      }

      return `/api/resources?${params.toString()}`;
    },
    [
      limit,
      debouncedSearch,
      level,
      pedagogicalType,
      format,
      status,
      visibility,
      ownership,
    ],
  );

  const fetchResources = useCallback(
    async (
      targetPage = 1,
      mode: "replace" | "append" = "replace",
    ): Promise<void> => {
      if (!enabled) return;

      try {
        if (mode === "append") {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }

        setError(null);

        const response = await fetch(buildUrl(targetPage), {
          cache: "no-store",
        });

        const data = (await response.json()) as ResourcesApiResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Error al cargar los recursos.");
        }

        const incomingItems = data.items ?? [];
        const meta = data.meta ?? {};

        const responsePage = meta.page ?? targetPage;
        const responseLimit = meta.limit ?? limit;
        const responseTotal = meta.total ?? incomingItems.length;
        const responseTotalPages =
          meta.totalPages ??
          Math.max(1, Math.ceil(responseTotal / responseLimit));

        const responseHasNextPage =
          meta.hasNextPage ?? responsePage < responseTotalPages;

        const responseHasPrevPage =
          meta.hasPrevPage ?? responsePage > 1;

        setResources((currentResources) => {
          if (mode === "append") {
            return [...currentResources, ...incomingItems];
          }

          return incomingItems;
        });

        setPage(responsePage);
        setTotal(responseTotal);
        setTotalPages(responseTotalPages);
        setHasNextPage(responseHasNextPage);
        setHasPrevPage(responseHasPrevPage);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error desconocido";

        setError(message);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [buildUrl, enabled, limit],
  );

  useEffect(() => {
    if (!enabled) return;

    fetchResources(1, "replace");
  }, [enabled, fetchResources]);

  const refetch = useCallback(async () => {
    await fetchResources(page, "replace");
  }, [fetchResources, page]);

  const goToPage = useCallback(
    async (targetPage: number) => {
      const safePage = Math.max(1, targetPage);

      await fetchResources(safePage, "replace");
    },
    [fetchResources],
  );

  const loadMore = useCallback(async () => {
    if (!hasNextPage || isLoadingMore) return;

    await fetchResources(page + 1, "append");
  }, [fetchResources, page, hasNextPage, isLoadingMore]);

  return {
    resources,

    isLoading,
    isLoadingMore,
    error,

    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    hasMore: hasNextPage,

    search,
    setSearch,

    refetch,
    goToPage,
    loadMore,
  };
}