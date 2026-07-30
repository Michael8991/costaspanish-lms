"use client";

import CourseTemplateStatusBadge from "@/components/dashboard/courses/templates/CourseTemplateStatusBadge";
import type { CourseTemplateListItemDTO } from "@/lib/dto/course-template.dto";
import {
  getCourseTemplateLevelLabel,
  getCourseTemplateStatsLabel,
} from "@/lib/utils/course-template-visuals";
import {
  Archive,
  BookOpenCheck,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface CourseTemplateTableProps {
  courseTemplates: CourseTemplateListItemDTO[];
  locale: string;
  isLoading?: boolean;
  error?: string | null;
  onClose: () => void;
  onTemplateStatusChange?: (
    templateId: string,
    status: CourseTemplateListItemDTO["status"],
  ) => void;
}

export default function CourseTemplateTable({
  courseTemplates,
  locale,
  isLoading = false,
  error = null,
  onClose,
  onTemplateStatusChange,
}: CourseTemplateTableProps) {
  const [templates, setTemplates] = useState(courseTemplates);
  const [view, setView] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setTemplates(courseTemplates);
  }, [courseTemplates]);

  const activeCount = templates.filter(
    (template) => template.status !== "archived",
  ).length;
  const archivedCount = templates.length - activeCount;

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es");
    const templatesForView = templates.filter((template) =>
      view === "archived"
        ? template.status === "archived"
        : template.status !== "archived",
    );

    if (!normalizedSearch) return templatesForView;

    return templatesForView.filter((template) =>
      [
        template.internalName,
        template.publicTitle,
        template.code,
        template.level,
        template.category,
      ].some((value) =>
        value.toLocaleLowerCase("es").includes(normalizedSearch),
      ),
    );
  }, [search, templates, view]);

  const archiveTemplate = async (templateId: string) => {
    if (!window.confirm("¿Archivar esta plantilla de curso?")) return;

    try {
      setArchivingId(templateId);
      setActionError(null);
      setFeedback(null);
      const response = await fetch(`/api/course-template/${templateId}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo archivar la plantilla.");
      }

      setTemplates((currentTemplates) =>
        currentTemplates.map((template) =>
          template.id === templateId
            ? { ...template, status: "archived" }
            : template,
        ),
      );
      onTemplateStatusChange?.(templateId, "archived");
    } catch (archiveError) {
      setActionError(
        archiveError instanceof Error
          ? archiveError.message
          : "No se pudo archivar la plantilla.",
      );
    } finally {
      setArchivingId(null);
    }
  };

  const restoreTemplate = async (templateId: string) => {
    if (
      !window.confirm("¿Restaurar esta plantilla? Volverá como borrador.")
    ) {
      return;
    }

    try {
      setRestoringId(templateId);
      setActionError(null);
      setFeedback(null);
      const response = await fetch(
        `/api/course-template/${templateId}/restore`,
        { method: "POST" },
      );
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo restaurar la plantilla.");
      }

      setTemplates((currentTemplates) =>
        currentTemplates.map((template) =>
          template.id === templateId
            ? { ...template, status: "draft" }
            : template,
        ),
      );
      onTemplateStatusChange?.(templateId, "draft");
      setFeedback("Plantilla restaurada como borrador.");
    } catch (restoreError) {
      setActionError(
        restoreError instanceof Error
          ? restoreError.message
          : "No se pudo restaurar la plantilla.",
      );
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Biblioteca de cursos
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Guías reutilizables sin alumnos ni fechas reales. Úsalas para
            mantener una estructura pedagógica consistente.
          </p>
        </div>
        <Link
          href={`/${locale}/dashboard/courses/addTemplate`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#8d2121] sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nueva plantilla
        </Link>
      </div>

      <div className="mt-5 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => {
            setView("active");
            setFeedback(null);
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            view === "active"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Plantillas activas ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => {
            setView("archived");
            setFeedback(null);
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            view === "archived"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Archivadas ({archivedCount})
        </button>
      </div>

      <div className="relative mt-4">
        <label htmlFor="course-template-search" className="sr-only">
          Buscar plantillas de curso
        </label>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="course-template-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, nivel o categoría..."
          className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
        />
      </div>

      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}
      {feedback && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {feedback}
        </p>
      )}

      {isLoading && (
        <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
          Cargando plantillas...
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
        >
          No se pudieron cargar las plantillas. {error}
        </p>
      )}

      {!isLoading && !error && filteredTemplates.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <BookOpenCheck className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            {search
              ? "No hay plantillas que coincidan con la búsqueda."
              : view === "archived"
                ? "No hay plantillas archivadas."
                : "No hay plantillas de curso todavía."}
          </p>
          {!search && view === "active" && (
            <Link
              href={`/${locale}/dashboard/courses/addTemplate`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Crear primera plantilla
            </Link>
          )}
        </div>
      )}

      {!isLoading && !error && filteredTemplates.length > 0 && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {filteredTemplates.map((template) => {
            const isArchived = template.status === "archived";
            const isArchiving = archivingId === template.id;
            const isRestoring = restoringId === template.id;
            const statsLabel = getCourseTemplateStatsLabel({
              modulesCount: template.modulesCount,
              lessonsCount: template.lessonsCount,
              blocksCount: template.blocksCount,
              resourcesCount: template.resourcesCount,
            });

            return (
              <article
                key={template.id}
                className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isArchived ? "opacity-80" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-slate-950">
                      {template.internalName}
                    </h3>
                    {template.publicTitle &&
                      template.publicTitle !== template.internalName && (
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {template.publicTitle}
                        </p>
                      )}
                  </div>
                  <CourseTemplateStatusBadge status={template.status} />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                    {getCourseTemplateLevelLabel(template.level)}
                  </span>
                  <span className="text-slate-500">{template.category}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-400">{template.code}</span>
                </div>

                <p className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
                  {statsLabel}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Link
                    href={`/${locale}/dashboard/courses/templates/${template.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver
                  </Link>

                  {isArchived ? (
                    <>
                      <button
                        type="button"
                        disabled={isRestoring}
                        onClick={() => void restoreTemplate(template.id)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw
                          className={`h-3.5 w-3.5 ${
                            isRestoring ? "animate-spin" : ""
                          }`}
                        />
                        {isRestoring ? "Restaurando..." : "Restaurar"}
                      </button>
                      <span className="self-center text-xs text-slate-400">
                        Restaura la plantilla para editarla.
                      </span>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/${locale}/dashboard/courses/templates/${template.id}/edit`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Link>
                      <button
                        type="button"
                        disabled={isArchiving}
                        onClick={() => void archiveTemplate(template.id)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        {isArchiving ? "Archivando..." : "Archivar"}
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
