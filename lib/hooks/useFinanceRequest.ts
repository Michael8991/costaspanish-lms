"use client";

import { useEffect, useState } from "react";

type FinanceApiError = {
  error?: unknown;
};

function getErrorMessage(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as FinanceApiError).error === "string"
  ) {
    return (payload as { error: string }).error;
  }
  return fallback;
}

export function useFinanceRequest<T>(
  url: string | null,
  fallbackError: string,
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        setData(null);

        const response = await fetch(url as string, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error("No tienes permisos para ver esta información.");
          }
          throw new Error(getErrorMessage(payload, fallbackError));
        }

        setData(payload as T);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error ? requestError.message : fallbackError,
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [fallbackError, url]);

  return { data, isLoading, error };
}
