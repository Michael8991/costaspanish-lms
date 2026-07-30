"use client";

import type { ResourceListItemDTO } from "@/lib/dto/resource.dto";
import { OBJECT_ID_REGEX } from "@/lib/utils/course-helpers";
import { useEffect, useMemo, useState } from "react";

type ResolveResourcesResponse = {
  items?: ResourceListItemDTO[];
  error?: string;
};

export type ResourceMap = Record<string, ResourceListItemDTO>;

export function useResourcesByIds(resourceIds: string[]) {
  const resourceIdsKey = useMemo(
    () =>
      Array.from(
        new Set(resourceIds.map((id) => String(id).trim()).filter(Boolean)),
      )
        .filter((id) => OBJECT_ID_REGEX.test(id))
        .sort()
        .join(","),
    [resourceIds],
  );
  const [resourceMap, setResourceMap] = useState<ResourceMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ids = resourceIdsKey ? resourceIdsKey.split(",") : [];
    if (ids.length === 0) {
      setResourceMap({});
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const resolveResources = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/resources/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
          signal: controller.signal,
        });
        const data = (await response
          .json()
          .catch(() => null)) as ResolveResourcesResponse | null;

        if (!response.ok) {
          throw new Error(
            data?.error ?? "No se pudieron cargar los recursos sugeridos.",
          );
        }

        setResourceMap(
          Object.fromEntries(
            (data?.items ?? []).map((resource) => [resource.id, resource]),
          ),
        );
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar los recursos sugeridos.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void resolveResources();
    return () => controller.abort();
  }, [resourceIdsKey]);

  return { resourceMap, isLoading, error };
}
