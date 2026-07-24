"use client";

import { LESSON_BLOCK_TYPES } from "@/lib/constants/lesson.constants";
import type {
  AddLessonResourcesResponse,
  AddLessonResourcesTarget,
  UpcomingLessonForResourceDTO,
  UpcomingLessonsForResourceResponse,
} from "@/lib/dto/lesson-resource.dto";
import type { LessonBlockType } from "@/lib/types/lesson";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Layers3,
  Loader2,
  Plus,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

interface AddResourceToLessonProps {
  resource: string | null;
  resourceName: string | null;
  onClose: () => void;
  onAdded?: () => void;
}

interface LessonDayGroup {
  key: string;
  label: string;
  lessons: UpcomingLessonForResourceDTO[];
}

type TargetMode = AddLessonResourcesTarget["mode"];

const dateLabelFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Madrid",
});
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Madrid",
});
const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

function toDisplayLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function groupLessonsByDay(
  lessons: UpcomingLessonForResourceDTO[],
): LessonDayGroup[] {
  const groups = new Map<string, LessonDayGroup>();

  for (const lesson of lessons) {
    const date = new Date(lesson.scheduledStart);
    const key = dateKeyFormatter.format(date);
    const current = groups.get(key) ?? {
      key,
      label: dateLabelFormatter.format(date),
      lessons: [],
    };

    current.lessons.push(lesson);
    groups.set(key, current);
  }

  return [...groups.values()];
}

async function getResponseError(response: Response): Promise<string> {
  const data: unknown = await response.json().catch(() => null);

  if (data && typeof data === "object" && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string") return error;
  }

  return "No se pudo completar la operación";
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: index * 0.04,
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

function LessonCard({
  lesson,
  selected,
  onSelect,
  index,
}: {
  lesson: UpcomingLessonForResourceDTO;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const attendeeLabel =
    lesson.attendeeNames.length > 0
      ? lesson.attendeeNames.join(", ")
      : "Sin alumnos asignados";

  return (
    <motion.button
      type="button"
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      onClick={onSelect}
      disabled={lesson.alreadyContainsResource}
      className={`flex min-h-44 flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
        lesson.alreadyContainsResource
          ? "cursor-not-allowed border-emerald-500/25 bg-emerald-500/10"
          : selected
            ? "border-[#9e2727]/70 bg-[#9e2727]/15 ring-1 ring-[#9e2727]/30"
            : "cursor-pointer border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
      }`}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
              selected
                ? "bg-[#9e2727]/30 text-red-200"
                : "bg-white/10 text-white/70"
            }`}
          >
            {attendeeLabel.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {attendeeLabel}
            </p>
            <p className="truncate text-xs text-white/40">{lesson.title}</p>
          </div>
        </div>
        {selected && <Check size={16} className="shrink-0 text-red-300" />}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-sm text-white/50">
          <Clock size={12} />
          <span>{timeFormatter.format(new Date(lesson.scheduledStart))}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-white/50">
          <GraduationCap size={12} />
          <span>{toDisplayLabel(lesson.classType)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-white/50">
          <Layers3 size={12} />
          <span>
            {lesson.blocks.length} bloque{lesson.blocks.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="mt-auto w-full">
        {lesson.alreadyContainsResource ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
            <CheckCircle2 size={13} />
            Ya está en {lesson.resourceBlockTitles.join(", ")}
          </div>
        ) : (
          <p className="text-xs font-medium text-white/50">
            {selected ? "Clase seleccionada" : "Seleccionar clase"}
          </p>
        )}
      </div>
    </motion.button>
  );
}

export default function AddResourceToLessonForm({
  resource,
  resourceName,
  onClose,
  onAdded,
}: AddResourceToLessonProps) {
  const [lessons, setLessons] = useState<UpcomingLessonForResourceDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [targetMode, setTargetMode] = useState<TargetMode>("new_block");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [newBlockTitle, setNewBlockTitle] = useState(
    resourceName?.trim() || "Material de clase",
  );
  const [newBlockType, setNewBlockType] =
    useState<LessonBlockType>("custom");
  const [estimatedMinutes, setEstimatedMinutes] = useState(10);
  const [dayIndex, setDayIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadLessons = useCallback(async () => {
    if (!resource) {
      setLessons([]);
      setLoadError("No se ha seleccionado ningún material");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(
        `/api/lessons/upcoming-for-resource?resourceId=${encodeURIComponent(resource)}&limit=50`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      const data = (await response.json()) as UpcomingLessonsForResourceResponse;
      setLessons(data.items);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las próximas clases",
      );
    } finally {
      setIsLoading(false);
    }
  }, [resource]);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  const grouped = useMemo(() => groupLessonsByDay(lessons), [lessons]);
  const currentGroup = grouped[dayIndex];
  const selectedLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;
  const canPrev = dayIndex > 0;
  const canNext = dayIndex < grouped.length - 1;
  const canSubmit =
    Boolean(resource && selectedLesson) &&
    !selectedLesson?.alreadyContainsResource &&
    (targetMode === "new_block"
      ? newBlockTitle.trim().length > 0
      : selectedBlockId.length > 0);

  useEffect(() => {
    if (dayIndex >= grouped.length) {
      setDayIndex(Math.max(0, grouped.length - 1));
    }
  }, [dayIndex, grouped.length]);

  const handleSelectLesson = (lesson: UpcomingLessonForResourceDTO) => {
    setSelectedLessonId(lesson.id);
    setSelectedBlockId(lesson.blocks[0]?.id ?? "");
    setTargetMode("new_block");
    setSubmitError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resource || !selectedLesson || !canSubmit) return;

    const target: AddLessonResourcesTarget =
      targetMode === "existing_block"
        ? { mode: "existing_block", blockId: selectedBlockId }
        : {
            mode: "new_block",
            title: newBlockTitle.trim(),
            type: newBlockType,
            estimatedMinutes,
          };

    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/lessons/${encodeURIComponent(selectedLesson.id)}/resources`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resourceIds: [resource], target }),
        },
      );

      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      const data = (await response.json()) as AddLessonResourcesResponse;
      setSuccessMessage(
        data.addedResourceIds.length > 0
          ? `Material agregado a “${selectedLesson.title}”.`
          : "El material ya estaba agregado a esta clase.",
      );
      onAdded?.();
      await loadLessons();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo agregar el material a la clase",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#9e2727]/20">
          <BookOpen size={14} className="text-red-300" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-white/40">
            Material a agregar
          </p>
          <p className="truncate text-sm font-medium text-white">
            {resourceName ?? "Sin nombre"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-12 text-sm text-white/50">
          <Loader2 size={17} className="animate-spin" />
          Cargando próximas clases...
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 py-8 text-center">
          <AlertCircle size={22} className="text-red-300" />
          <p className="text-sm text-red-200">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadLessons()}
            className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
          >
            Reintentar
          </button>
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 py-10 text-center">
          <CalendarDays size={24} className="text-white/20" />
          <p className="text-sm text-white/40">
            No hay clases próximas disponibles
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setDayIndex((index) => index - 1)}
              disabled={!canPrev}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
            >
              <ChevronLeft size={15} />
            </button>

            <div className="flex flex-col items-center">
              <p className="text-base font-medium capitalize text-white">
                {currentGroup?.label}
              </p>
              <p className="text-xs text-white/40">
                {currentGroup?.lessons.length ?? 0} clase
                {(currentGroup?.lessons.length ?? 0) === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDayIndex((index) => index + 1)}
              disabled={!canNext}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {grouped.length > 1 && (
            <div className="flex items-center justify-center gap-1.5">
              {grouped.map((group, index) => (
                <button
                  key={group.key}
                  type="button"
                  aria-label={`Ver clases del ${group.label}`}
                  onClick={() => setDayIndex(index)}
                  className={`h-1 cursor-pointer rounded-full transition-all ${
                    index === dayIndex
                      ? "w-5 bg-[#9e2727]"
                      : "w-1 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}

          <div className="max-h-[36vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="wait">
                {(currentGroup?.lessons ?? []).map((lesson, index) => (
                  <LessonCard
                    key={`${dayIndex}-${lesson.id}`}
                    lesson={lesson}
                    selected={selectedLessonId === lesson.id}
                    onSelect={() => handleSelectLesson(lesson)}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {selectedLesson && !selectedLesson.alreadyContainsResource && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Destino dentro de la clase
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {selectedLesson.title}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={selectedLesson.blocks.length === 0}
                  onClick={() => setTargetMode("existing_block")}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                    targetMode === "existing_block"
                      ? "border-[#9e2727]/60 bg-[#9e2727]/15 text-white"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  } disabled:cursor-not-allowed disabled:opacity-35`}
                >
                  Bloque existente
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode("new_block")}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                    targetMode === "new_block"
                      ? "border-[#9e2727]/60 bg-[#9e2727]/15 text-white"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Plus size={13} />
                    Crear bloque nuevo
                  </span>
                </button>
              </div>

              {targetMode === "existing_block" ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs text-white/50">
                    Bloque
                  </span>
                  <select
                    value={selectedBlockId}
                    onChange={(event) => setSelectedBlockId(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#171717] px-3 py-2.5 text-sm text-white outline-none focus:border-[#9e2727]/60"
                  >
                    {selectedLesson.blocks.map((block, index) => (
                      <option key={block.id} value={block.id}>
                        {String(index + 1).padStart(2, "0")} · {block.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="grid gap-3 sm:grid-cols-[1fr_180px_130px]">
                  <label>
                    <span className="mb-1.5 block text-xs text-white/50">
                      Título del bloque
                    </span>
                    <input
                      value={newBlockTitle}
                      onChange={(event) => setNewBlockTitle(event.target.value)}
                      maxLength={180}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#9e2727]/60"
                      placeholder="Material de clase"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs text-white/50">
                      Tipo
                    </span>
                    <select
                      value={newBlockType}
                      onChange={(event) =>
                        setNewBlockType(event.target.value as LessonBlockType)
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#171717] px-3 py-2.5 text-sm text-white outline-none focus:border-[#9e2727]/60"
                    >
                      {LESSON_BLOCK_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {toDisplayLabel(type)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs text-white/50">
                      Minutos
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={600}
                      value={estimatedMinutes}
                      onChange={(event) =>
                        setEstimatedMinutes(
                          Math.min(
                            600,
                            Math.max(0, Number(event.target.value) || 0),
                          ),
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#9e2727]/60"
                    />
                  </label>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {submitError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertCircle size={15} className="shrink-0" />
          {submitError}
        </div>
      )}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 size={15} className="shrink-0" />
          {successMessage}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition-all hover:bg-white/10"
        >
          Cerrar
        </button>
        <motion.button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          whileTap={{ scale: 0.97 }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#9e2727] px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#8a2222] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          {isSubmitting ? "Agregando..." : "Agregar material"}
        </motion.button>
      </div>
    </form>
  );
}
