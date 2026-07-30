"use client";

import {
  CalendarPlus,
  Clock3,
  Copy,
  LoaderCircle,
  Paperclip,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { CourseProfileDetailDTO } from "@/lib/dto/course-profile.dto";
import type {
  ModuleDataDTO,
  TemplateLessonDTO,
} from "@/lib/dto/course-template.dto";
import type { LessonDetailDTO } from "@/lib/dto/lesson.dto";
import {
  isoToDatetimeLocalValue,
  zonedDateTimeToISOString,
} from "@/lib/utils/time-zone";

type CreateLessonFromCourseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  courseProfile: CourseProfileDetailDTO;
  templateModule: ModuleDataDTO;
  templateLesson: TemplateLessonDTO;
  locale: string;
};

const DEFAULT_TIMEZONE = "Europe/Madrid";

function getDefaultDuration(templateLesson: TemplateLessonDTO) {
  if (
    templateLesson.estimatedMinutes !== undefined &&
    templateLesson.estimatedMinutes > 0
  ) {
    return templateLesson.estimatedMinutes;
  }

  const blocksDuration = templateLesson.blocks.reduce(
    (total, block) => total + (block.estimatedMinutes ?? 0),
    0,
  );
  return blocksDuration > 0 ? blocksDuration : 60;
}

function getInitialLocalDateTime() {
  return isoToDatetimeLocalValue(
    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    DEFAULT_TIMEZONE,
  );
}

export default function CreateLessonFromCourseModal({
  isOpen,
  onClose,
  courseProfile,
  templateModule,
  templateLesson,
  locale,
}: CreateLessonFromCourseModalProps) {
  const router = useRouter();
  const initialDateTime = getInitialLocalDateTime();
  const [title, setTitle] = useState(
    `${courseProfile.name} · ${templateLesson.title}`,
  );
  const [date, setDate] = useState(initialDateTime.slice(0, 10));
  const [startTime, setStartTime] = useState(initialDateTime.slice(11, 16));
  const [duration, setDuration] = useState(
    getDefaultDuration(templateLesson),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resourcesCount = new Set(
    templateLesson.blocks.flatMap((block) => block.resources),
  ).size;

  const createLesson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);
      const scheduledStart = zonedDateTimeToISOString(
        `${date}T${startTime}`,
        DEFAULT_TIMEZONE,
      );
      const scheduledEnd = new Date(
        new Date(scheduledStart).getTime() + duration * 60 * 1000,
      ).toISOString();
      const response = await fetch(
        `/api/course-profiles/${courseProfile.id}/lessons`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleOrder: templateModule.order,
            lessonOrder: templateLesson.order,
            scheduledStart,
            scheduledEnd,
            timezone: DEFAULT_TIMEZONE,
            titleOverride: title.trim(),
          }),
        },
      );
      const data = (await response.json().catch(() => null)) as {
        item?: LessonDetailDTO;
        error?: string;
      } | null;

      if (!response.ok || !data?.item) {
        throw new Error(data?.error ?? "No se pudo crear la clase.");
      }

      onClose();
      router.push(`/${locale}/dashboard/lessons/${data.item.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear la clase.",
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
      aria-labelledby="create-real-lesson-title"
    >
      <form
        onSubmit={createLesson}
        className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-6"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="create-real-lesson-title"
              className="text-lg font-semibold text-slate-950"
            >
              Crear clase desde clase modelo
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {templateModule.title} · {templateLesson.title}
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

        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">
            Se creará una clase real programada.
          </p>
          <p className="mt-1 text-sm leading-5 text-blue-700">
            Podrás ajustar los bloques y recursos antes de completarla.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-slate-50 px-2 py-3 text-slate-600">
            <Users className="mx-auto mb-1 h-4 w-4 text-slate-400" />
            {courseProfile.studentsCount} alumnos
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-3 text-slate-600">
            <Copy className="mx-auto mb-1 h-4 w-4 text-slate-400" />
            {templateLesson.blocks.length} bloques
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-3 text-slate-600">
            <Paperclip className="mx-auto mb-1 h-4 w-4 text-slate-400" />
            {resourcesCount} recursos
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Título
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={180}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-red-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium text-slate-700">
              Fecha
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Hora de inicio
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Duración
              <span className="relative mt-1.5 block">
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={duration}
                  onChange={(event) =>
                    setDuration(Number(event.target.value))
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  min
                </span>
              </span>
            </label>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            Zona horaria: Europe/Madrid
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              !title.trim() ||
              !date ||
              !startTime ||
              duration < 5
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8d2121] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            {isSubmitting ? "Creando clase..." : "Crear clase"}
          </button>
        </footer>
      </form>
    </div>
  );
}
