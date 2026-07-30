"use client";

import {
  Archive,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Pencil,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import CourseProfileTemplatePlan from "@/components/dashboard/courses/CourseProfileTemplatePlan";
import type { CourseProfileDetailDTO } from "@/lib/dto/course-profile.dto";
import type { CourseTemplateDetailDTO } from "@/lib/dto/course-template.dto";
import type { LessonListDTO } from "@/lib/dto/lesson.dto";
import {
  COURSE_PROFILE_CLASS_TYPES,
} from "@/lib/validators/courseProfile.validator";
import type { ClassType } from "@/models/StudentProfile";

type CourseProfileDetailViewProps = {
  initialCourse: CourseProfileDetailDTO;
  template: CourseTemplateDetailDTO | null;
  locale: string;
  createdLessons: LessonListDTO[];
  initialEdit?: boolean;
};

const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  private: "Privada",
  pair: "Pareja",
  group_regular: "Grupo regular",
  semi_intensive: "Semi-intensiva",
  intensive: "Intensiva",
};

const STATUS_LABELS: Record<CourseProfileDetailDTO["status"], string> = {
  draft: "Borrador",
  active: "Activo",
  paused: "Pausado",
  completed: "Completado",
  archived: "Archivado",
};

function formatDate(value: string | null) {
  if (!value) return "Sin definir";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function CourseProfileDetailView({
  initialCourse,
  template,
  locale,
  createdLessons,
  initialEdit = false,
}: CourseProfileDetailViewProps) {
  const router = useRouter();
  const [course, setCourse] = useState(initialCourse);
  const [isEditing, setIsEditing] = useState(initialEdit);
  const [isArchiving, setIsArchiving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const archiveCourse = async () => {
    if (!window.confirm(`¿Archivar el curso “${course.name}”?`)) return;

    try {
      setIsArchiving(true);
      setActionError(null);
      const response = await fetch(`/api/course/${course.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo archivar el curso.");
      }

      router.push(`/${locale}/dashboard/courses`);
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo archivar el curso.",
      );
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="mt-6 space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {course.level && (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {course.level}
                </span>
              )}
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {STATUS_LABELS[course.status]}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                {CLASS_TYPE_LABELS[course.classType]}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">
              {course.name}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Basado en {course.templateName || course.internalName}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={course.status === "archived"}
              className="inline-flex items-center gap-2 rounded-xl bg-[#9e2727] px-3 py-2 text-sm font-medium text-white hover:bg-[#8d2121] disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => void archiveCourse()}
              disabled={isArchiving || course.status === "archived"}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              {isArchiving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {course.status === "archived" ? "Archivado" : "Archivar"}
            </button>
          </div>
        </div>
      </header>

      {actionError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Users}
          label="Alumnos"
          value={`${course.studentsCount}`}
          detail={course.studentNames.join(", ") || "Sin alumnos"}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Progreso"
          value={`${course.progress.completedLessonsCount}/${course.lessonsCount}`}
          detail="clases modelo utilizadas"
        />
        <SummaryCard
          icon={CalendarDays}
          label="Fecha de inicio"
          value={formatDate(course.startDate)}
          detail={
            course.targetEndDate
              ? `Objetivo: ${formatDate(course.targetEndDate)}`
              : "Sin fecha objetivo"
          }
        />
        <SummaryCard
          icon={BookOpenCheck}
          label="Plan base"
          value={`${course.modulesCount} módulos`}
          detail={`${course.lessonsCount} clases · ${course.blocksCount} bloques`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Plantilla base</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <DetailRow label="Plantilla" value={course.templateName || "—"} />
            <DetailRow label="Versión" value={`v${course.templateVersion}`} />
            <DetailRow label="Nivel" value={course.level || "—"} />
            <DetailRow label="Categoría" value={course.category || "—"} />
          </dl>
          {template && (
            <Link
              href={`/${locale}/dashboard/courses/templates/${course.templateId}`}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <BookOpenCheck className="h-4 w-4" />
              Ver plantilla
            </Link>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Organización</h2>
          <div className="mt-4">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Clock3 className="h-4 w-4 text-slate-400" />
              Notas de horario
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">
              {course.scheduleNotes || "Sin notas de horario."}
            </p>
          </div>
          {course.internalNotes && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-700">
                Notas internas
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                {course.internalNotes}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Este curso está basado en una plantilla. Crea clases reales desde el
        plan y ajusta después su preparación sin modificar la receta original.
      </div>

      {template ? (
        <CourseProfileTemplatePlan
          course={course}
          template={template}
          createdLessons={createdLessons}
          locale={locale}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
          La plantilla original ya no está disponible. El resumen guardado del
          curso se mantiene intacto.
        </div>
      )}

      {isEditing && (
        <EditCourseModal
          course={course}
          onClose={() => setIsEditing(false)}
          onSaved={(updatedCourse) => {
            setCourse(updatedCourse);
            setIsEditing(false);
            router.replace(`/${locale}/dashboard/courses/${course.id}`);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-3 font-semibold text-slate-900">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function EditCourseModal({
  course,
  onClose,
  onSaved,
}: {
  course: CourseProfileDetailDTO;
  onClose: () => void;
  onSaved: (course: CourseProfileDetailDTO) => void;
}) {
  const [name, setName] = useState(course.name);
  const [status, setStatus] =
    useState<CourseProfileDetailDTO["status"]>(course.status);
  const [classType, setClassType] = useState<ClassType>(course.classType);
  const [startDate, setStartDate] = useState(
    course.startDate?.slice(0, 10) ?? "",
  );
  const [targetEndDate, setTargetEndDate] = useState(
    course.targetEndDate?.slice(0, 10) ?? "",
  );
  const [scheduleNotes, setScheduleNotes] = useState(course.scheduleNotes);
  const [internalNotes, setInternalNotes] = useState(course.internalNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError(null);
      const response = await fetch(`/api/course/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          status,
          classType,
          startDate: startDate || null,
          targetEndDate: targetEndDate || null,
          scheduleNotes,
          internalNotes,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        item?: CourseProfileDetailDTO;
        error?: string;
      } | null;

      if (!response.ok || !data?.item) {
        throw new Error(data?.error ?? "No se pudo guardar el curso.");
      }

      onSaved(data.item);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el curso.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-4">
      <form
        onSubmit={saveCourse}
        className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-6"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Editar curso
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Actualiza la organización básica del curso activo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Nombre
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={140}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#9e2727]"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Estado
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as CourseProfileDetailDTO["status"],
                )
              }
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              {(["draft", "active", "paused", "completed"] as const).map(
                (value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Tipo de clase
            <select
              value={classType}
              onChange={(event) =>
                setClassType(event.target.value as ClassType)
              }
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              {COURSE_PROFILE_CLASS_TYPES.map((value) => (
                <option key={value} value={value}>
                  {CLASS_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Fecha de inicio
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Fecha objetivo
            <input
              type="date"
              value={targetEndDate}
              onChange={(event) => setTargetEndDate(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Notas de horario
            <textarea
              value={scheduleNotes}
              onChange={(event) => setScheduleNotes(event.target.value)}
              maxLength={1000}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Notas internas
            <textarea
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              maxLength={2000}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        </footer>
      </form>
    </div>
  );
}
