"use client";

import {
  ChevronDown,
  Filter,
  LayoutDashboard,
  Plus,
  Search,
  TextAlignJustify,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type FormEvent,
} from "react";
import useSWR from "swr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import ResourceTableView from "./ResourcesTableView";
import ResourcesGridView from "./ResourceGridView";
import {
  CEFR_LEVELS,
  FORMAT_TYPES,
  PEDAGOGICAL_TYPES,
  RESOURCE_STATUS,
  SKILL_FOCUS,
} from "@/lib/constants/resource.constants";

const SORT_OPTIONS = [
  { value: "", label: "Más recientes" },
  { value: "updatedAt_desc", label: "Actualizados recientemente" },
  { value: "createdAt_desc", label: "Creación más reciente" },
  { value: "title_asc", label: "Título A-Z" },
  { value: "title_desc", label: "Título Z-A" },
  { value: "timesUsed_desc", label: "Más usados" },
  { value: "difficulty_asc", label: "Dificultad ↑" },
  { value: "difficulty_desc", label: "Dificultad ↓" },
] as const;

const FILTER_KEYS = [
  "search",
  "format",
  "level",
  "skill",
  "pedagogicalType",
  "status",
  "visibility",
  "deliveryMode",
  "hasAnswerKey",
  "requiresTeacherReview",
  "sort",
  "page",
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];

type DraftFilters = {
  search: string;
  format: string;
  level: string;
  skill: string;
  pedagogicalType: string;
  status: string;
  visibility: string;
  deliveryMode: string;
  hasAnswerKey: string;
  requiresTeacherReview: string;
  sort: string;
};

const EMPTY_FILTERS: DraftFilters = {
  search: "",
  format: "",
  level: "",
  skill: "",
  pedagogicalType: "",
  status: "",
  visibility: "",
  deliveryMode: "",
  hasAnswerKey: "",
  requiresTeacherReview: "",
  sort: "",
};

type ResourceListItem = ComponentProps<
  typeof ResourceTableView
>["resources"][number];

type ResourcesResponse = {
  items: ResourceListItem[];
  page?: number;
  totalPages?: number;
  totalItems?: number;
};

const controlClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9e2727]/30";

const fetcher = async (url: string): Promise<ResourcesResponse> => {
  const res = await fetch(url);

  if (!res.ok) {
    let message = "Error fetching resources";
    try {
      const errorData = await res.json();
      message = errorData?.error || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
};

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function countActiveFilters(filters: DraftFilters) {
  return Object.entries(filters).reduce((count, [key, value]) => {
    if (key === "sort") return count;
    return value ? count + 1 : count;
  }, 0);
}

export default function ResourcesTable({ locale }: { locale: string }) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryString = searchParams.toString();

  const appliedFilters = useMemo<DraftFilters>(
    () => ({
      search: searchParams.get("search") || "",
      format: searchParams.get("format") || "",
      level: searchParams.get("level") || "",
      skill: searchParams.get("skill") || "",
      pedagogicalType: searchParams.get("pedagogicalType") || "",
      status: searchParams.get("status") || "",
      visibility: searchParams.get("visibility") || "",
      deliveryMode: searchParams.get("deliveryMode") || "",
      hasAnswerKey: searchParams.get("hasAnswerKey") || "",
      requiresTeacherReview: searchParams.get("requiresTeacherReview") || "",
      sort: searchParams.get("sort") || "",
    }),
    [searchParams, queryString],
  );

  const [draftFilters, setDraftFilters] =
    useState<DraftFilters>(appliedFilters);

  useEffect(() => {
    setDraftFilters(appliedFilters);
  }, [appliedFilters]);

  const apiUrl = useMemo(() => {
    return queryString ? `/api/resources?${queryString}` : "/api/resources";
  }, [queryString]);

  const { data, error, isLoading, isValidating } = useSWR<ResourcesResponse>(
    apiUrl,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    },
  );

  const items = data?.items ?? [];

  const activeFilterCount = useMemo(
    () => countActiveFilters(appliedFilters),
    [appliedFilters],
  );

  const hasPendingChanges = useMemo(() => {
    return (
      draftFilters.search !== appliedFilters.search ||
      draftFilters.format !== appliedFilters.format ||
      draftFilters.level !== appliedFilters.level ||
      draftFilters.skill !== appliedFilters.skill ||
      draftFilters.pedagogicalType !== appliedFilters.pedagogicalType ||
      draftFilters.status !== appliedFilters.status ||
      draftFilters.visibility !== appliedFilters.visibility ||
      draftFilters.deliveryMode !== appliedFilters.deliveryMode ||
      draftFilters.hasAnswerKey !== appliedFilters.hasAnswerKey ||
      draftFilters.requiresTeacherReview !==
        appliedFilters.requiresTeacherReview ||
      draftFilters.sort !== appliedFilters.sort
    );
  }, [draftFilters, appliedFilters]);

  const updateDraftFilter = useCallback(
    (key: keyof DraftFilters, value: string) => {
      setDraftFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  const buildUrlFromFilters = useCallback(
    (filters: DraftFilters) => {
      const nextParams = new URLSearchParams(
        Array.from(searchParams.entries()),
      );

      FILTER_KEYS.forEach((key) => {
        nextParams.delete(key);
      });

      const normalizedFilters: DraftFilters = {
        ...filters,
        search: filters.search.trim(),
      };

      Object.entries(normalizedFilters).forEach(([key, value]) => {
        if (value) {
          nextParams.set(key, value);
        }
      });

      const nextQuery = nextParams.toString();
      return nextQuery ? `${pathname}?${nextQuery}` : pathname;
    },
    [pathname, searchParams],
  );

  const applyDraftFilters = useCallback(() => {
    router.replace(buildUrlFromFilters(draftFilters));
  }, [buildUrlFromFilters, draftFilters, router]);

  const resetDraftFilters = useCallback(() => {
    setDraftFilters(EMPTY_FILTERS);
  }, []);

  const clearAppliedFilters = useCallback(() => {
    setDraftFilters(EMPTY_FILTERS);
    router.replace(buildUrlFromFilters(EMPTY_FILTERS));
  }, [buildUrlFromFilters, router]);

  const handleSearchSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      applyDraftFilters();
    },
    [applyDraftFilters],
  );

  if (error) {
    return (
      <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Error cargando recursos.
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-8 text-center text-gray-500 shadow-sm">
        <p className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#9e2727]"></p>
        Cargando recursos...
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Recursos</h2>
            {typeof data?.totalItems === "number" && (
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500">
                {data.totalItems} resultados
              </span>
            )}
            {isValidating && data && (
              <span className="text-xs text-slate-400 italic">
                Actualizando...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                title="Vista lista"
                onClick={() => setViewMode("list")}
                className={`cursor-pointer flex items-center justify-center px-3 py-2 text-sm transition-all ${
                  viewMode === "list"
                    ? "bg-[#9e2727] text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <TextAlignJustify size={16} />
              </button>
              <div className="w-px bg-slate-200" />
              <button
                type="button"
                title="Vista cuadrícula"
                onClick={() => setViewMode("grid")}
                className={`cursor-pointer flex items-center justify-center px-3 py-2 text-sm transition-all ${
                  viewMode === "grid"
                    ? "bg-[#9e2727] text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <LayoutDashboard size={16} />
              </button>
            </div>

            <Link
              href={`/${locale}/dashboard/resources/addResource`}
              className="flex items-center gap-1.5 rounded-xl bg-[#9e2727] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#8d2323]"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nuevo recurso</span>
              <span className="sm:hidden">Nuevo</span>
            </Link>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex flex-1 gap-2"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título, descripción o etiquetas..."
              value={draftFilters.search}
              onChange={(e) => updateDraftFilter("search", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9e2727]/30"
            />
            <button
              type="submit"
              className="cursor-pointer shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hidden sm:block"
            >
              Buscar
            </button>
          </form>

          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className={`cursor-pointer flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
              isFilterOpen || activeFilterCount > 0
                ? "border-[#9e2727]/30 bg-[#9e2727]/5 text-[#9e2727]"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-[#9e2727] px-1.5 py-0.5 text-xs font-semibold text-white leading-none">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <div
          className={`grid transition-all duration-200 ease-in-out ${
            isFilterOpen
              ? "mt-4 grid-rows-[1fr] opacity-100"
              : "mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Ordenar
              </p>
              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <select
                  value={draftFilters.sort}
                  onChange={(e) => updateDraftFilter("sort", e.target.value)}
                  className="cursor-pointer w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-[#9e2727]/40 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/20"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option
                      key={option.value || "default"}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Contenido
              </p>
              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <select
                  value={draftFilters.format}
                  onChange={(e) => updateDraftFilter("format", e.target.value)}
                  className="cursor-pointer w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-[#9e2727]/40 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/20"
                >
                  <option value="">Todos los formatos</option>
                  {FORMAT_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {formatLabel(o)}
                    </option>
                  ))}
                </select>

                <select
                  value={draftFilters.level}
                  onChange={(e) => updateDraftFilter("level", e.target.value)}
                  className="cursor-pointer w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-[#9e2727]/40 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/20"
                >
                  <option value="">Todos los niveles</option>
                  {CEFR_LEVELS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>

                <select
                  value={draftFilters.skill}
                  onChange={(e) => updateDraftFilter("skill", e.target.value)}
                  className="cursor-pointer w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-[#9e2727]/40 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/20"
                >
                  <option value="">Todas las habilidades</option>
                  {SKILL_FOCUS.map((o) => (
                    <option key={o} value={o}>
                      {formatLabel(o)}
                    </option>
                  ))}
                </select>

                <select
                  value={draftFilters.pedagogicalType}
                  onChange={(e) =>
                    updateDraftFilter("pedagogicalType", e.target.value)
                  }
                  className="cursor-pointer w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-[#9e2727]/40 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/20"
                >
                  <option value="">Todos los tipos pedagógicos</option>
                  {PEDAGOGICAL_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {formatLabel(o)}
                    </option>
                  ))}
                </select>
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Acceso y uso
              </p>
              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <select
                  value={draftFilters.status}
                  onChange={(e) => updateDraftFilter("status", e.target.value)}
                  className="cursor-pointer w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-[#9e2727]/40 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/20"
                >
                  <option value="">Cualquier estado</option>
                  {RESOURCE_STATUS.map((o) => (
                    <option key={o} value={o}>
                      {formatLabel(o)}
                    </option>
                  ))}
                </select>

                <select
                  value={draftFilters.visibility}
                  onChange={(e) =>
                    updateDraftFilter("visibility", e.target.value)
                  }
                  className="cursor-pointer w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-[#9e2727]/40 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/20"
                >
                  <option value="">Cualquier visibilidad</option>
                  <option value="private">Solo yo (privado)</option>
                  <option value="shared">Compartido con el equipo</option>
                </select>

                <select
                  value={draftFilters.deliveryMode}
                  onChange={(e) =>
                    updateDraftFilter("deliveryMode", e.target.value)
                  }
                  className="cursor-pointer w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-[#9e2727]/40 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/20"
                >
                  <option value="">Cualquier modalidad</option>
                  <option value="classwork">En clase</option>
                  <option value="homework">Para casa</option>
                </select>
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Opciones adicionales
              </p>
              <div className="flex flex-wrap gap-2">
                {(["", "true", "false"] as const).map((val) => (
                  <button
                    key={`ak-${val}`}
                    type="button"
                    onClick={() => updateDraftFilter("hasAnswerKey", val)}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      draftFilters.hasAnswerKey === val
                        ? "border-[#9e2727] bg-[#9e2727] text-white"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {val === ""
                      ? "Solución: cualquiera"
                      : val === "true"
                        ? "✓ Con solución"
                        : "✗ Sin solución"}
                  </button>
                ))}

                <div className="w-px bg-slate-200 mx-1 self-stretch hidden sm:block" />

                {(["", "true", "false"] as const).map((val) => (
                  <button
                    key={`tr-${val}`}
                    type="button"
                    onClick={() =>
                      updateDraftFilter("requiresTeacherReview", val)
                    }
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      draftFilters.requiresTeacherReview === val
                        ? "border-[#9e2727] bg-[#9e2727] text-white"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {val === ""
                      ? "Revisión: cualquiera"
                      : val === "true"
                        ? "⚑ Requiere revisión"
                        : "✓ Sin revisión"}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetDraftFilters}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
                >
                  Restablecer borrador
                </button>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAppliedFilters}
                    className="cursor-pointer rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-100"
                  >
                    Limpiar {activeFilterCount} filtro
                    {activeFilterCount > 1 ? "s" : ""} activo
                    {activeFilterCount > 1 ? "s" : ""}
                  </button>
                )}

                <button
                  type="button"
                  onClick={applyDraftFilters}
                  disabled={!hasPendingChanges}
                  className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition-all ${
                    hasPendingChanges
                      ? "bg-[#9e2727] hover:bg-[#8d2323]"
                      : "cursor-not-allowed bg-slate-300"
                  }`}
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!items.length ? (
        <div className="p-10 text-center text-slate-500">
          No se han encontrado recursos con los filtros actuales.
        </div>
      ) : viewMode === "grid" ? (
        <ResourcesGridView resources={items} />
      ) : (
        <ResourceTableView resources={items} />
      )}
    </div>
  );
}
