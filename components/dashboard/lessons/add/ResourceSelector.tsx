"use client";

import { ResourceListItemDTO } from "@/lib/dto/resource.dto";
import { useResources } from "@/lib/hooks/useResources";
import { motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Loader2,
  Plus,
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
  onCreateBlocks: (resources: ResourceListItemDTO[]) => void;
}

export default function ResourceSelector({
  onClose,
  locale,
  onCreateBlocks,
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
    goToPage,
  } = useResources({
    limit: 8,
    ownership: "all",
    status: "published",
  });

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const [selectedResources, setSelectedResources] = useState<
    ResourceListItemDTO[]
  >([]);

  const selectedResourceIdSet = useMemo(() => {
    return new Set(selectedResources.map((resource) => resource.id));
  }, [selectedResources]);

  function toggleResource(resource: ResourceListItemDTO) {
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

  useEffect(() => {
    console.log("Selected resources:", selectedResources);
  }, [selectedResources]);
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
            No hay recursos disponibles.
          </div>
        ) : (
          resources.map((resource) => {
            const isSelected = selectedResourceIdSet.has(resource.id);
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
                  isSelected
                    ? "border-[#9e2727]/60 bg-[#9e2727]/10"
                    : "border-slate-600/50 bg-slate-800/50 hover:border-slate-500/70 hover:bg-slate-800"
                } ${isArchived ? "pointer-events-none opacity-40" : ""}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-700/70 text-slate-300">
                  <FormatIcon size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm text-slate-100">
                      {resource.title}
                    </p>

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
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleResource(resource);
                    }}
                    className={`cursor-pointer flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition ${
                      isSelected
                        ? "border-[#9e2727] bg-[#9e2727] text-white hover:bg-[#8d2323]"
                        : "border-slate-600 bg-slate-700/40 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {isSelected ? (
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
              onCreateBlocks(selectedResources);
              setSelectedResources([]);
              onClose();
            }}
            className="cursor-pointer rounded-xl border border-[#9e2727]/70 bg-[#9e2727] px-4 py-2 text-sm text-white transition hover:bg-[#8d2323] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Crear {selectedResources.length} bloques
          </button>
        </div>
      </div>
    </motion.div>
  );
}
