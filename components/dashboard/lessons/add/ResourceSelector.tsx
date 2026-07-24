"use client";

import { ResourceListItemDTO } from "@/lib/dto/resource.dto";
import { useResources } from "@/lib/hooks/useResources";
import { motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  ExternalLink,
  Loader2,
  Plus,
  Repeat2,
  Search,
} from "lucide-react";
import {
  formatDuration,
  getFileTypeBadge,
  getLevelBadge,
  getPedagogicalTypeLabel,
  getSkillLabel,
  listContainerVariants,
  listRowVariants,
} from "../../resources/ResourcesTableView";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface ResourceSelectorProps {
  onClose: () => void;
  locale: string;
  onConfirmResources: (resources: ResourceListItemDTO[]) => void;
  confirmAction: "create_blocks" | "add_to_block";
  currentBlockResourceIds?: string[];
  lessonResourceIds?: string[];
  studentIds?: string[];
  beforeDate?: string;
  currentLessonId?: string;
}

type ResourceUsageItem = {
  resourceId: string;
  timesSeen: number;
  lastSeenAt: string;
  lastSeenLessonTitle: string;
  seenByStudentIds: string[];
};

type ResourceUsageApiResponse = {
  items?: ResourceUsageItem[];
};

export default function ResourceSelector({
  onClose,
  locale,
  onConfirmResources,
  confirmAction,
  currentBlockResourceIds = [],
  lessonResourceIds = [],
  studentIds = [],
  beforeDate,
  currentLessonId,
}: ResourceSelectorProps) {
  const {
    resources,
    isLoading,
    error,
    search,
    setSearch,
    page,
    totalPages,
    total,
    hasNextPage,
    hasPrevPage,
    goToPage,
  } = useResources({
    limit: 8,
    ownership: "all",
    status: "published",
  });

  const canGoPrevious = hasPrevPage;
  const canGoNext = hasNextPage;

  const [selectedResources, setSelectedResources] = useState<
    ResourceListItemDTO[]
  >([]);

  const selectedResourceIdSet = useMemo(() => {
    return new Set(selectedResources.map((resource) => resource.id));
  }, [selectedResources]);
  const currentBlockResourceIdSet = useMemo(
    () => new Set(currentBlockResourceIds),
    [currentBlockResourceIds],
  );
  const lessonResourceIdSet = useMemo(
    () => new Set(lessonResourceIds),
    [lessonResourceIds],
  );
  const [usageByResourceId, setUsageByResourceId] = useState<
    Map<string, ResourceUsageItem>
  >(() => new Map());
  const visibleResourceIdsKey = resources
    .map((resource) => resource.id)
    .sort()
    .join(",");
  const studentIdsKey = Array.from(new Set(studentIds)).sort().join(",");
  const selectedStudentCount = studentIdsKey
    ? studentIdsKey.split(",").length
    : 0;

  useEffect(() => {
    const visibleResourceIds = visibleResourceIdsKey
      ? visibleResourceIdsKey.split(",")
      : [];
    const normalizedStudentIds = studentIdsKey ? studentIdsKey.split(",") : [];

    if (
      visibleResourceIds.length === 0 ||
      normalizedStudentIds.length === 0 ||
      !beforeDate
    ) {
      return;
    }

    const controller = new AbortController();

    const loadResourceUsage = async () => {
      try {
        const response = await fetch("/api/resources/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resourceIds: visibleResourceIds,
            studentIds: normalizedStudentIds,
            beforeDate,
            excludeLessonId: currentLessonId,
          }),
          signal: controller.signal,
        });
        const data = (await response
          .json()
          .catch(() => null)) as ResourceUsageApiResponse | null;

        if (!response.ok) return;

        setUsageByResourceId(
          new Map(
            (data?.items ?? []).map((usage) => [usage.resourceId, usage]),
          ),
        );
      } catch {
        if (!controller.signal.aborted) {
          setUsageByResourceId(new Map());
        }
      }
    };

    void loadResourceUsage();

    return () => controller.abort();
  }, [beforeDate, currentLessonId, studentIdsKey, visibleResourceIdsKey]);

  function toggleResource(resource: ResourceListItemDTO) {
    if (currentBlockResourceIdSet.has(resource.id)) return;

    setSelectedResources((currentResources) => {
      const alreadySelected = currentResources.some(
        (item) => item.id === resource.id,
      );

      if (alreadySelected) {
        return currentResources.filter((item) => item.id !== resource.id);
      }
      return [...currentResources, resource];
    });
  }

  return (
    <motion.div
      variants={listContainerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar recursos..."
          className="w-full rounded-xl border border-slate-600/70 bg-slate-800/70 py-2.5 pl-9 pr-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-slate-800"
        />
      </div>

      <div className="min-h-112 space-y-3">
        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-800/40 text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando recursos...
          </div>
        ) : error ? (
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-4 text-center text-sm text-red-300">
            {error}
          </div>
        ) : resources.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-600/60 bg-slate-800/40 text-sm text-slate-400">
            {search.trim()
              ? "No hay recursos que coincidan con la búsqueda."
              : "No hay recursos disponibles."}
          </div>
        ) : (
          resources.map((resource) => {
            const isSelected = selectedResourceIdSet.has(resource.id);
            const isInCurrentBlock = currentBlockResourceIdSet.has(resource.id);
            const isUsedInLesson =
              !isInCurrentBlock && lessonResourceIdSet.has(resource.id);
            const usage = usageByResourceId.get(resource.id);
            const isArchived = resource.status === "archived";
            const detailHref = `/${locale}/dashboard/resources/${resource.id}`;

            const { icon: FormatIcon, label: formatLabel } = getFileTypeBadge(
              resource.asset.format,
            );

            const mediaDuration =
              resource.asset.format === "audio" ||
              resource.asset.format === "video"
                ? formatDuration(resource.asset.durationSeconds)
                : null;

            return (
              <motion.article
                key={resource.id}
                variants={listRowVariants}
                className={`group flex items-center gap-4 rounded-2xl border px-4 py-3 transition ${
                  isInCurrentBlock
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : isSelected
                      ? "border-[#9e2727]/60 bg-[#9e2727]/10"
                      : isUsedInLesson
                        ? "border-amber-500/25 bg-amber-500/5 hover:border-amber-500/40"
                        : "border-slate-600/50 bg-slate-800/50 hover:border-slate-500/70 hover:bg-slate-800"
                } ${isArchived ? "pointer-events-none opacity-40" : ""}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300 ring-1 ring-white/10">
                  <FormatIcon size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm text-slate-100">
                      {resource.title}
                    </p>

                    {isInCurrentBlock && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                        <CheckCircle2 size={11} />
                        Ya añadido
                      </span>
                    )}

                    {isUsedInLesson && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                        <Repeat2 size={11} />
                        Usado en esta clase
                      </span>
                    )}

                    {usage && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-200">
                        <Eye size={11} />
                        Visto
                      </span>
                    )}

                    {resource.levels?.slice(0, 2).map((level) => (
                      <span
                        key={`${resource.id}-${level}`}
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${getLevelBadge(
                          level,
                        )}`}
                      >
                        {level}
                      </span>
                    ))}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{formatLabel}</span>
                    <span>·</span>
                    <span>
                      {getPedagogicalTypeLabel(resource.pedagogicalType)}
                    </span>

                    {mediaDuration && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={11} />
                          {mediaDuration}
                        </span>
                      </>
                    )}

                    {resource.skills?.slice(0, 2).map((skill) => (
                      <span key={`${resource.id}-${skill}`}>
                        · {getSkillLabel(skill)}
                      </span>
                    ))}
                  </div>

                  {usage && (
                    <p
                      className="mt-1.5 truncate text-[11px] text-red-200/65"
                      title={usage.lastSeenLessonTitle}
                    >
                      {usage.seenByStudentIds.length === selectedStudentCount
                        ? "Visto por todos"
                        : `Visto por ${usage.seenByStudentIds.length}/${selectedStudentCount} alumnos`}
                      {" · "}
                      Última vez{" "}
                      {new Intl.DateTimeFormat("es-ES", {
                        day: "numeric",
                        month: "short",
                      }).format(new Date(usage.lastSeenAt))}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={detailHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600/70 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:bg-slate-700/70 hover:text-white"
                  >
                    <ExternalLink size={13} />
                    Ver
                  </Link>

                  <button
                    type="button"
                    disabled={isInCurrentBlock}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleResource(resource);
                    }}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition ${
                      isInCurrentBlock
                        ? "cursor-not-allowed border-emerald-400/15 bg-emerald-500/10 text-emerald-200/60"
                        : isSelected
                          ? "border-[#9e2727] bg-[#9e2727] text-white hover:bg-[#8d2323]"
                          : "cursor-pointer border-slate-600 bg-slate-700/40 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {isInCurrentBlock ? (
                      <>
                        <CheckCircle2 size={13} />
                        Ya añadido
                      </>
                    ) : isSelected ? (
                      <>
                        <Check size={13} />
                        Quitar
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        Añadir
                      </>
                    )}
                  </button>
                </div>
              </motion.article>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-700/60 pt-4">
        <div className="text-xs text-slate-500">
          {total > 0 ? (
            <>
              Página {page} de {totalPages} · {total} recursos
            </>
          ) : (
            "Sin resultados"
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canGoPrevious || isLoading}
            onClick={() => goToPage(page - 1)}
            className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-600/70 bg-slate-800/60 text-slate-300 transition hover:border-slate-500 hover:bg-slate-700/70 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>

          <button
            type="button"
            disabled={!canGoNext || isLoading}
            onClick={() => goToPage(page + 1)}
            className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-600/70 bg-slate-800/60 text-slate-300 transition hover:border-slate-500 hover:bg-slate-700/70 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-slate-600/70 bg-slate-800/60 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:bg-slate-700/70 hover:text-white"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={selectedResources.length === 0}
            onClick={() => {
              onConfirmResources(selectedResources);
              setSelectedResources([]);
              onClose();
            }}
            className="cursor-pointer rounded-xl border border-[#9e2727]/70 bg-[#9e2727] px-4 py-2 text-sm text-white transition hover:bg-[#8d2323] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {confirmAction === "create_blocks"
              ? `Crear ${selectedResources.length} bloques`
              : `Añadir ${selectedResources.length} recursos`}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
