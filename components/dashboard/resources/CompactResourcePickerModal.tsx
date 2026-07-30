"use client";

import { getFileTypeBadge } from "@/components/dashboard/resources/ResourcesTableView";
import {
  FORMAT_TYPES,
  type FormatType,
} from "@/lib/constants/resource.constants";
import { useResources } from "@/lib/hooks/useResources";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";

interface CompactResourcePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedResourceIds: string[];
  onConfirm: (resourceIds: string[]) => void;
  title?: string;
}

export default function CompactResourcePickerModal({
  isOpen,
  onClose,
  selectedResourceIds,
  onConfirm,
  title = "Añadir recursos sugeridos",
}: CompactResourcePickerModalProps) {
  const [format, setFormat] = useState<FormatType | "">("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(selectedResourceIds.map(String)),
  );
  const {
    resources,
    isLoading,
    error,
    search,
    setSearch,
    page,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
  } = useResources({
    enabled: isOpen,
    limit: 10,
    ownership: "all",
    status: "published",
    format: format || undefined,
  });

  if (!isOpen) return null;

  const toggleResource = (resourceId: string) => {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(resourceId)) {
        nextIds.delete(resourceId);
      } else {
        nextIds.add(resourceId);
      }
      return nextIds;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compact-resource-picker-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
            <h2
              id="compact-resource-picker-title"
              className="text-base font-semibold text-slate-900"
            >
              {title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Este recurso se usará como material recomendado cuando prepares
              una clase real desde esta plantilla.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label="Cerrar selector de recursos"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-[1fr_190px]">
          <label className="relative">
            <span className="sr-only">Buscar recursos</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar en la biblioteca..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-800 outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/15"
            />
          </label>

          <label>
            <span className="sr-only">Filtrar por formato</span>
            <select
              value={format}
              onChange={(event) =>
                setFormat(event.target.value as FormatType | "")
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/15"
            >
              <option value="">Todos los formatos</option>
              {FORMAT_TYPES.map((formatOption) => (
                <option key={formatOption} value={formatOption}>
                  {getFileTypeBadge(formatOption).label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando recursos...
            </div>
          ) : error ? (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-center text-sm text-red-700">
              {error}
            </div>
          ) : resources.length === 0 ? (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">
              {search.trim()
                ? "No hay recursos que coincidan con la búsqueda."
                : "No hay recursos disponibles."}
            </div>
          ) : (
            <div className="space-y-2">
              {resources.map((resource) => {
                const isSelected = selectedIds.has(resource.id);
                const visual = getFileTypeBadge(resource.asset.format);
                const FormatIcon = visual.icon;

                return (
                  <button
                    key={resource.id}
                    type="button"
                    onClick={() => toggleResource(resource.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      isSelected
                        ? "border-[#9e2727]/40 bg-[#9e2727]/5"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${visual.color}`}
                    >
                      <FormatIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {resource.title}
                      </span>
                      {isSelected && (
                        <span className="mt-0.5 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          Ya seleccionado
                        </span>
                      )}
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {visual.label}
                        {resource.asset.originalFilename
                          ? ` · ${resource.asset.originalFilename}`
                          : ""}
                      </span>
                    </span>
                    <span
                      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md border ${
                        isSelected
                          ? "border-[#9e2727] bg-[#9e2727] text-white"
                          : "border-slate-300 bg-white text-transparent"
                      }`}
                      aria-hidden="true"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="sr-only">
                      {isSelected ? "Ya seleccionado" : "Seleccionar"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 sm:justify-start">
            <span>
              {total > 0
                ? `Página ${page} de ${totalPages} · ${total} recursos`
                : "Sin resultados"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!hasPrevPage || isLoading}
                onClick={() => void goToPage(page - 1)}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={!hasNextPage || isLoading}
                onClick={() => void goToPage(page + 1)}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(Array.from(selectedIds));
                onClose();
              }}
              className="rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#8d2121]"
            >
              Añadir seleccionados ({selectedIds.size})
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
