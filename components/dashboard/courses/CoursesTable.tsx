"use client";

import {
  AlertCircle,
  Archive,
  BookOpen,
  GraduationCap,
  LibraryBig,
  LoaderCircle,
  Pencil,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import CourseTemplateTable from "@/components/dashboard/courseTemplate/CourseTemplateTable";
import type { CourseProfileListItemDTO } from "@/lib/dto/course-profile.dto";
import type { CourseTemplateListItemDTO } from "@/lib/dto/course-template.dto";

type CoursesResponse = {
  items?: CourseProfileListItemDTO[];
  error?: string;
};

type TemplatesResponse = {
  data?: CourseTemplateListItemDTO[];
  error?: string;
};

const STATUS_LABELS: Record<CourseProfileListItemDTO["status"], string> = {
  draft: "Borrador",
  active: "Activo",
  paused: "Pausado",
  completed: "Completado",
  archived: "Archivado",
};

const CLASS_TYPE_LABELS: Record<
  CourseProfileListItemDTO["classType"],
  string
> = {
  private: "Privada",
  pair: "Pareja",
  group_regular: "Grupo regular",
  semi_intensive: "Semi-intensiva",
  intensive: "Intensiva",
};

function getStatusClass(status: CourseProfileListItemDTO["status"]) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "completed") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "draft") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-red-200 bg-red-50 text-red-700";
}

export default function CoursesTable({ locale }: { locale: string }) {
  const [activeTab, setActiveTab] = useState<"courses" | "templates">("courses");
  const [courses, setCourses] = useState<CourseProfileListItemDTO[]>([]);
  const [templates, setTemplates] = useState<CourseTemplateListItemDTO[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [coursesResponse, templatesResponse] = await Promise.all([
          fetch("/api/course?limit=100", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/course-template?limit=100&status=all", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);
        const coursesData = (await coursesResponse
          .json()
          .catch(() => null)) as CoursesResponse | null;
        const templatesData = (await templatesResponse
          .json()
          .catch(() => null)) as TemplatesResponse | null;

        if (!coursesResponse.ok) {
          throw new Error(coursesData?.error ?? "No se pudieron cargar los cursos.");
        }
        if (!templatesResponse.ok) {
          throw new Error(
            templatesData?.error ?? "No se pudieron cargar las plantillas.",
          );
        }

        setCourses(coursesData?.items ?? []);
        setTemplates(templatesData?.data ?? []);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la sección de cursos.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadData();
    return () => controller.abort();
  }, []);

  const filteredCourses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return courses;

    return courses.filter((course) =>
      [
        course.name,
        course.templateName,
        course.studentNames.join(" "),
        course.level,
        course.category,
      ]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase().includes(term)),
    );
  }, [courses, search]);

  const archiveCourse = async (course: CourseProfileListItemDTO) => {
    if (!window.confirm(`¿Archivar el curso “${course.name}”?`)) return;

    try {
      setArchivingId(course.id);
      setError(null);
      const response = await fetch(`/api/course/${course.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo archivar el curso.");
      }

      setCourses((current) =>
        current.filter((item) => item.id !== course.id),
      );
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "No se pudo archivar el curso.",
      );
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Cursos y plantillas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Gestiona cursos activos o reutiliza tu biblioteca pedagógica.
            </p>
          </div>
          {activeTab === "courses" && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar curso o alumno..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#9e2727]"
              />
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("courses")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === "courses"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Cursos activos ({courses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === "templates"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LibraryBig className="h-4 w-4" />
            Biblioteca ({templates.length})
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Cargando cursos...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-red-600">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      ) : activeTab === "templates" ? (
        <div className="p-4 sm:p-6">
          <CourseTemplateTable
            courseTemplates={templates}
            locale={locale}
            onClose={() => setActiveTab("courses")}
            onTemplateStatusChange={(templateId, status) =>
              setTemplates((current) =>
                current.map((template) =>
                  template.id === templateId
                    ? { ...template, status }
                    : template,
                ),
              )
            }
          />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-medium text-slate-700">
            {courses.length === 0
              ? "Todavía no hay cursos activos"
              : "No hay resultados para esta búsqueda"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Abre una plantilla de la biblioteca para crear el primer curso.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className="mt-4 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#8d2121]"
          >
            Ver biblioteca
          </button>
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
          {filteredCourses.map((course) => (
            <article
              key={course.id}
              className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">
                    {course.name}
                  </h3>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    Basado en:{" "}
                    {course.templateName || course.internalName}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(course.status)}`}
                >
                  {STATUS_LABELS[course.status]}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                {course.level && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                    {course.level}
                  </span>
                )}
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  {CLASS_TYPE_LABELS[course.classType]}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                  <Users className="h-3 w-3" />
                  {course.studentsCount}{" "}
                  {course.studentsCount === 1 ? "alumno" : "alumnos"}
                </span>
              </div>

              {course.studentNames.length > 0 && (
                <p className="mt-3 truncate text-sm text-slate-600">
                  {course.studentNames.join(", ")}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                0/{course.lessonsCount} clases modelo usadas
              </p>

              <footer className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/${locale}/dashboard/courses/${course.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Ver
                </Link>
                <Link
                  href={`/${locale}/dashboard/courses/${course.id}?edit=1`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => void archiveCourse(course)}
                  disabled={archivingId === course.id}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  {archivingId === course.id ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Archive className="h-3.5 w-3.5" />
                  )}
                  Archivar
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
