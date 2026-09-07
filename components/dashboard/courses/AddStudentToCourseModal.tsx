"use client";

import { Check, LoaderCircle, Search, UserRoundPlus, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import type { CourseEnrollmentListItemDTO } from "@/lib/dto/course-enrollment.dto";
import type {
  StudentListDTO,
  StudentListResponse,
} from "@/lib/dto/student.dto";

type AddStudentToCourseModalProps = {
  isOpen: boolean;
  courseId: string;
  enrollments: CourseEnrollmentListItemDTO[];
  onClose: () => void;
  onEnrolled: (enrollment: CourseEnrollmentListItemDTO) => void;
};

export default function AddStudentToCourseModal({
  isOpen,
  courseId,
  enrollments,
  onClose,
  onEnrolled,
}: AddStudentToCourseModalProps) {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentListDTO[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enrolledStudentIds = useMemo(
    () => new Set(enrollments.map((enrollment) => enrollment.studentId)),
    [enrollments],
  );

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);
        const params = new URLSearchParams({
          page: "1",
          limit: "20",
          status: "active",
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

        if (!response.ok || !data || !("items" in data)) {
          throw new Error(
            data && "error" in data && data.error
              ? data.error
              : "No se pudieron cargar los alumnos.",
          );
        }
        setStudents(data.items);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar los alumnos.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, search]);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setStudents([]);
      setSelectedStudentId(null);
      setError(null);
    }
  }, [isOpen]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStudentId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await fetch(`/api/courses/${courseId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudentId }),
      });
      const result = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            data?: CourseEnrollmentListItemDTO;
            error?: string;
          }
        | null;

      if (!response.ok || !result?.data) {
        throw new Error(result?.error ?? "No se pudo matricular al alumno.");
      }

      onEnrolled(result.data);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo matricular al alumno.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-title"
    >
      <form
        onSubmit={submit}
        className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2
              id="add-student-title"
              className="text-lg font-semibold text-slate-950"
            >
              Añadir alumno
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Busca un alumno existente y matricúlalo en el curso.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-4 p-5 sm:p-6">
          <label className="block text-sm font-medium text-slate-700">
            Buscar alumno
            <span className="relative mt-1.5 block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSelectedStudentId(null);
                }}
                placeholder="Nombre o email..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-red-100"
              />
            </span>
          </label>

          <div className="min-h-48 overflow-hidden rounded-2xl border border-slate-200">
            {isLoading ? (
              <div className="grid min-h-48 place-items-center text-sm text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Buscando alumnos...
                </span>
              </div>
            ) : students.length === 0 ? (
              <div className="grid min-h-48 place-items-center px-5 text-center text-sm text-slate-500">
                No se encontraron alumnos activos.
              </div>
            ) : (
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                {students.map((student) => {
                  const alreadyEnrolled = enrolledStudentIds.has(student.id);
                  const selected = selectedStudentId === student.id;
                  return (
                    <button
                      key={student.id}
                      type="button"
                      disabled={alreadyEnrolled}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                        selected
                          ? "bg-red-50"
                          : "hover:bg-slate-50 disabled:bg-slate-50 disabled:opacity-60"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {student.fullName}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {student.contactEmail}
                        </span>
                      </span>
                      {alreadyEnrolled ? (
                        <span className="shrink-0 text-xs font-medium text-slate-500">
                          Ya matriculado
                        </span>
                      ) : selected ? (
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#9e2727] text-white">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : (
                        <UserRoundPlus className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!selectedStudentId || isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Matriculando..." : "Matricular alumno"}
          </button>
        </footer>
      </form>
    </div>
  );
}

