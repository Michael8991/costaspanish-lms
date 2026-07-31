"use client";

import CourseTemplateCommercialPanel from "@/components/dashboard/courses/templates/CourseTemplateCommercialPanel";
import CreateCourseFromTemplateModal from "@/components/dashboard/courses/templates/CreateCourseFromTemplateModal";
import CourseTemplateCurriculumPreview from "@/components/dashboard/courses/templates/CourseTemplateCurriculumPreview";
import CourseTemplatePedagogicalSummary from "@/components/dashboard/courses/templates/CourseTemplatePedagogicalSummary";
import CourseTemplateOperationalDefaultsSummary from "@/components/dashboard/courses/templates/CourseTemplateOperationalDefaultsSummary";
import CourseTemplateStatsGrid from "@/components/dashboard/courses/templates/CourseTemplateStatsGrid";
import CourseTemplateStatusBadge from "@/components/dashboard/courses/templates/CourseTemplateStatusBadge";
import type { CourseTemplateDetailDTO } from "@/lib/dto/course-template.dto";
import { getCourseTemplateLevelLabel } from "@/lib/utils/course-template-visuals";
import {
  Archive,
  ArrowLeft,
  GraduationCap,
  Pencil,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CourseTemplateDetailsProps {
  courseTemplate: CourseTemplateDetailDTO;
  locale: string;
}

export default function CourseTemplateDetailView({
  courseTemplate,
  locale,
}: CourseTemplateDetailsProps) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);

  const archiveTemplate = async () => {
    if (!window.confirm("¿Archivar esta plantilla de curso?")) return;

    try {
      setIsArchiving(true);
      setActionError(null);

      const response = await fetch(
        `/api/course-template/${courseTemplate.id}`,
        { method: "DELETE" },
      );
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo archivar la plantilla.");
      }

      router.push(`/${locale}/dashboard/courses`);
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo archivar la plantilla.",
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const restoreTemplate = async () => {
    if (
      !window.confirm("¿Restaurar esta plantilla? Volverá como borrador.")
    ) {
      return;
    }

    try {
      setIsRestoring(true);
      setActionError(null);
      const response = await fetch(
        `/api/course-template/${courseTemplate.id}/restore`,
        { method: "POST" },
      );
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo restaurar la plantilla.");
      }

      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo restaurar la plantilla.",
      );
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="mt-6 space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {getCourseTemplateLevelLabel(
                  courseTemplate.pedagogicalMeta.level,
                )}
              </span>
              <CourseTemplateStatusBadge status={courseTemplate.status} />
              <span className="text-xs text-slate-400">
                {courseTemplate.code}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">
              {courseTemplate.internalName}
            </h1>
            {courseTemplate.storefront.publicTitle &&
              courseTemplate.storefront.publicTitle !==
                courseTemplate.internalName && (
                <p className="mt-1 text-sm text-slate-500">
                  {courseTemplate.storefront.publicTitle}
                </p>
              )}
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Una plantilla es una guía reutilizable. No tiene alumnos ni
              fechas reales.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {courseTemplate.status !== "archived" && (
              <button
                type="button"
                onClick={() => setIsCreateCourseOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#8d2121]"
              >
                <GraduationCap className="h-4 w-4" />
                Crear curso desde plantilla
              </button>
            )}
            <Link
              href={`/${locale}/dashboard/courses`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
            {courseTemplate.status === "archived" ? (
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => void restoreTemplate()}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw
                  className={`h-4 w-4 ${
                    isRestoring ? "animate-spin" : ""
                  }`}
                />
                {isRestoring ? "Restaurando..." : "Restaurar plantilla"}
              </button>
            ) : (
              <>
                <Link
                  href={`/${locale}/dashboard/courses/templates/${courseTemplate.id}/edit`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
                <button
                  type="button"
                  disabled={isArchiving}
                  onClick={() => void archiveTemplate()}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Archive className="h-4 w-4" />
                  {isArchiving ? "Archivando..." : "Archivar"}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}

      {courseTemplate.status === "archived" && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Restaura la plantilla para editarla o crear nuevos cursos desde ella.
        </p>
      )}

      <CourseTemplateStatsGrid stats={courseTemplate.stats} />
      <CourseTemplatePedagogicalSummary template={courseTemplate} />
      <CourseTemplateOperationalDefaultsSummary template={courseTemplate} />
      <CourseTemplateCurriculumPreview template={courseTemplate} />

      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <span className="font-medium">Bloques modelo:</span> dividen una clase
        modelo en partes como warmup, gramática, speaking o deberes.
      </div>

      <CourseTemplateCommercialPanel template={courseTemplate} />

      {isCreateCourseOpen && (
        <CreateCourseFromTemplateModal
          isOpen
          onClose={() => setIsCreateCourseOpen(false)}
          template={courseTemplate}
          locale={locale}
        />
      )}
    </div>
  );
}
