"use client";

import {
  AlertTriangle,
  BookOpenCheck,
  Check,
  LoaderCircle,
  Search,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import type { CourseProfileDetailDTO } from "@/lib/dto/course-profile.dto";
import type { CourseTemplateDetailDTO } from "@/lib/dto/course-template.dto";
import type { StudentListDTO, StudentListResponse } from "@/lib/dto/student.dto";
import {
  COURSE_PROFILE_CLASS_TYPES,
} from "@/lib/validators/courseProfile.validator";
import type { ClassType } from "@/models/StudentProfile";

type CreateCourseFromTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  template: CourseTemplateDetailDTO;
  locale: string;
};

const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  private: "Privada",
  pair: "Pareja",
  group_regular: "Grupo regular",
  semi_intensive: "Semi-intensiva",
  intensive: "Intensiva",
};

function getSelectionLimit(classType: ClassType): number | null {
  if (classType === "private") return 1;
  if (classType === "pair") return 2;
  return null;
}

export default function CreateCourseFromTemplateModal({
  isOpen,
  onClose,
  template,
  locale,
}: CreateCourseFromTemplateModalProps) {
  const router = useRouter();
  const [name, setName] = useState(template.internalName);
  const [nameWasEdited, setNameWasEdited] = useState(false);
  const [classType, setClassType] = useState<ClassType>("private");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentListDTO[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIsLoadingStudents(true);
        setStudentsError(null);
        const params = new URLSearchParams({
          limit: "20",
          page: "1",
        });
        if (search.trim()) params.set("search", search.trim());

        const response = await fetch(`/api/students?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as
          | StudentListResponse
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            data && "error" in data && data.error
              ? data.error
              : "No se pudieron cargar los alumnos.",
          );
        }

        setStudents(data && "items" in data ? data.items : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setStudentsError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los alumnos.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoadingStudents(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, search]);

  const selectedStudents = useMemo(
    () =>
      selectedStudentIds.flatMap((studentId) => {
        const student = students.find((item) => item.id === studentId);
        return student ? [student] : [];
      }),
    [selectedStudentIds, students],
  );
  const selectionLimit = getSelectionLimit(classType);
  const hasTooManyStudents =
    selectionLimit !== null && selectedStudentIds.length > selectionLimit;
  const canSubmit =
    name.trim().length > 0 &&
    selectedStudentIds.length > 0 &&
    !hasTooManyStudents &&
    !isSubmitting;

  const toggleStudent = (student: StudentListDTO) => {
    setSubmitError(null);
    setSelectedStudentIds((current) => {
      const isSelected = current.includes(student.id);
      const next = isSelected
        ? current.filter((studentId) => studentId !== student.id)
        : [...current, student.id];

      if (!nameWasEdited) {
        setName(
          next.length === 1 && !isSelected
            ? `${student.fullName} · ${template.internalName}`
            : template.internalName,
        );
      }

      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const response = await fetch(
        `/api/course-template/${template.id}/create-course`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: template.id,
            name: name.trim(),
            classType,
            studentIds: selectedStudentIds,
            status: "active",
            startDate: startDate || undefined,
            scheduleNotes,
            internalNotes,
          }),
        },
      );
      const data = (await response.json().catch(() => null)) as
        | { item?: CourseProfileDetailDTO; error?: string }
        | null;

      if (!response.ok || !data?.item) {
        throw new Error(data?.error ?? "No se pudo crear el curso.");
      }

      router.push(`/${locale}/dashboard/courses/${data.item.id}`);
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "No se pudo crear el curso.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-course-title"
    >
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2
              id="create-course-title"
              className="text-lg font-semibold text-slate-950"
            >
              Crear curso desde plantilla
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Asigna esta receta pedagógica a alumnos reales.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
          <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="flex items-start gap-3">
              <BookOpenCheck className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold text-slate-900">
                  {template.internalName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {template.pedagogicalMeta.level} ·{" "}
                  {template.pedagogicalMeta.category}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {template.stats.modulesCount} módulos ·{" "}
                  {template.stats.lessonsCount} clases modelo ·{" "}
                  {template.stats.blocksCount} bloques ·{" "}
                  {template.stats.resourcesCount} recursos
                </p>
              </div>
            </div>
          </section>

          {template.status === "draft" && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Esta plantilla está en borrador. Puedes crear el curso igualmente.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Nombre del curso
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameWasEdited(true);
                }}
                maxLength={140}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-red-100"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Tipo de clase
              <select
                value={classType}
                onChange={(event) =>
                  setClassType(event.target.value as ClassType)
                }
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-red-100"
              >
                {COURSE_PROFILE_CLASS_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {CLASS_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium text-slate-700">Alumnos</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedStudentIds.length} seleccionados
                  {selectionLimit !== null
                    ? ` · máximo ${selectionLimit}`
                    : ""}
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar alumno..."
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#9e2727]"
                />
              </div>
            </div>

            {hasTooManyStudents && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                El tipo {CLASS_TYPE_LABELS[classType].toLowerCase()} admite como
                máximo {selectionLimit} alumnos. Quita alguno para continuar.
              </p>
            )}

            <div className="mt-3 max-h-56 overflow-y-auto rounded-2xl border border-slate-200">
              {isLoadingStudents ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Cargando alumnos...
                </div>
              ) : studentsError ? (
                <p className="px-4 py-6 text-center text-sm text-red-600">
                  {studentsError}
                </p>
              ) : students.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">
                  No se encontraron alumnos.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {students.map((student) => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    return (
                      <li key={student.id}>
                        <button
                          type="button"
                          onClick={() => toggleStudent(student)}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                            isSelected ? "bg-red-50/70" : "hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                              isSelected
                                ? "border-[#9e2727] bg-[#9e2727] text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-800">
                              {student.fullName}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {student.contactEmail || "Sin email"} ·{" "}
                              {student.level} ·{" "}
                              {student.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {selectedStudents.length > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Users className="h-3.5 w-3.5" />
                {selectedStudents.map((student) => student.fullName).join(", ")}
              </p>
            )}
          </section>

          <label className="block text-sm font-medium text-slate-700">
            Fecha de inicio
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#9e2727] sm:w-64"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Notas de horario
            <textarea
              value={scheduleNotes}
              onChange={(event) => setScheduleNotes(event.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Ej. Lunes 10:00, una clase por semana."
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#9e2727]"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Notas internas
            <textarea
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              maxLength={2000}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#9e2727]"
            />
          </label>

          {submitError && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {submitError}
            </p>
          )}

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8d2121] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Creando curso..." : "Crear curso"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
