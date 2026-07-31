"use client";

import CourseProfileSelect from "@/components/dashboard/courses/CourseProfileSelect";
import CustomModal from "@/components/ui/CustomModal";
import type { LessonDetailDTO } from "@/lib/dto/lesson.dto";
import { useState } from "react";

type AssignableRelationType =
  | "course_free_lesson"
  | "template_based"
  | "review"
  | "makeup"
  | "extra"
  | "imported_historical";

type PolicySnapshotMode =
  | "keep_existing"
  | "copy_from_course_if_missing"
  | "replace_from_course";

type AssignmentWarning = {
  code: string;
  message: string;
};

type AssignmentResponse = {
  item?: LessonDetailDTO;
  warnings?: AssignmentWarning[];
  error?: string;
};

type AssignLessonToCourseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lesson: LessonDetailDTO;
  locale: string;
  onAssigned: (lesson: LessonDetailDTO) => void;
};

export default function AssignLessonToCourseModal({
  isOpen,
  onClose,
  lesson,
  locale,
  onAssigned,
}: AssignLessonToCourseModalProps) {
  const [courseId, setCourseId] = useState(lesson.courseId ?? "");
  const [relationType, setRelationType] = useState<AssignableRelationType>(
    lesson.courseLink?.relationType === "legacy_free"
      ? "course_free_lesson"
      : (lesson.courseLink?.relationType ?? "course_free_lesson"),
  );
  const [notes, setNotes] = useState(lesson.courseLink?.notes ?? "");
  const [policySnapshotMode, setPolicySnapshotMode] =
    useState<PolicySnapshotMode>(
      lesson.status === "completed"
        ? "keep_existing"
        : "copy_from_course_if_missing",
    );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<AssignmentWarning[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  async function submitAssignment() {
    if (!courseId) {
      setError("Selecciona un curso.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setWarnings([]);
      setIsSuccess(false);

      const response = await fetch(`/api/lessons/${lesson.id}/course-link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          relationType,
          notes,
          policySnapshotMode,
          sourceTemplateLesson:
            relationType === "template_based"
              ? lesson.courseLink?.sourceTemplateLesson
              : undefined,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | AssignmentResponse
        | null;

      if (!response.ok || !data?.item) {
        throw new Error(data?.error || "No se pudo asignar el curso.");
      }

      setWarnings(data.warnings ?? []);
      setIsSuccess(true);
      onAssigned(data.item);
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "No se pudo asignar el curso.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={lesson.courseId ? "Cambiar curso asociado" : "Asignar a curso"}
      maxWidth="xl"
    >
      <div className="space-y-5 text-gray-900">
        <CourseProfileSelect
          value={courseId}
          onChange={(nextCourseId) => setCourseId(nextCourseId)}
          locale={locale}
          requireActiveMembers={false}
          disabled={isSubmitting || isSuccess}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tipo de relación
          </label>
          <select
            value={relationType}
            disabled={isSubmitting || isSuccess}
            onChange={(event) =>
              setRelationType(event.target.value as AssignableRelationType)
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10 disabled:bg-gray-50"
          >
            <option value="course_free_lesson">Clase libre del curso</option>
            <option value="review">Repaso</option>
            <option value="makeup">Recuperación</option>
            <option value="extra">Extra</option>
            <option value="imported_historical">Histórica importada</option>
            <option value="template_based" disabled>
              Basada en clase modelo · próxima fase
            </option>
          </select>
          {relationType === "template_based" && (
            <p className="mt-2 text-xs text-amber-700">
              La vinculación a una clase modelo se completará en la siguiente
              fase.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Snapshot de reglas
          </label>
          <select
            value={policySnapshotMode}
            disabled={isSubmitting || isSuccess}
            onChange={(event) =>
              setPolicySnapshotMode(event.target.value as PolicySnapshotMode)
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10 disabled:bg-gray-50"
          >
            <option value="copy_from_course_if_missing">
              Copiar del curso si falta
            </option>
            <option value="keep_existing">Mantener el actual</option>
            <option value="replace_from_course">
              Reemplazar por las reglas del curso
            </option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Notas
          </label>
          <textarea
            value={notes}
            maxLength={1000}
            rows={3}
            disabled={isSubmitting || isSuccess}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Contexto opcional sobre esta asociación"
            className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10 disabled:bg-gray-50"
          />
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Esta acción solo vincula la clase al curso. No consume créditos ni
          modifica bonos o asistencia.
        </div>

        {lesson.status === "completed" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta clase ya está completada. Al asignarla a un curso no se
            recalcularán créditos.
          </div>
        )}

        {lesson.courseId && !isSuccess && (
          <p className="text-xs text-gray-500">
            La asociación actual se reemplazará sin modificar créditos ni
            asistencia.
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {isSuccess && (
          <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            El curso se ha asociado correctamente.
          </p>
        )}

        {warnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">
              Asociación guardada con avisos:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {warnings.map((warning) => (
                <li key={warning.code}>• {warning.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {isSuccess ? "Cerrar" : "Cancelar"}
          </button>
          {!isSuccess && (
            <button
              type="button"
              onClick={() => void submitAssignment()}
              disabled={isSubmitting || !courseId}
              className="rounded-xl bg-[#9e2727] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8d2323] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Guardando..."
                : lesson.courseId
                  ? "Cambiar curso"
                  : "Asignar curso"}
            </button>
          )}
        </div>
      </div>
    </CustomModal>
  );
}
