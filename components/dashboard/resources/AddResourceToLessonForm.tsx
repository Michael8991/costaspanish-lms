"use client";

import { MockUpcomingClass } from "@/lib/mocks/lessons.mock";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

interface AddResourceToLessonProps {
  resource: string | null;
  resourceName: string | null;
  lessons: MockUpcomingClass[];
  onSubmitForm: (resourceId: string | null, lessonId: string) => void;
  isSubmitting: boolean;
  onClose: () => void;
}

function extractDayKey(date: string): string {
  return date.split(",")[0].trim();
}

function extractTime(date: string): string {
  return date.split(",")[1]?.trim() ?? "";
}

function groupByDay(lessons: MockUpcomingClass[]) {
  const map = new Map<string, MockUpcomingClass[]>();
  for (const lesson of lessons) {
    const key = extractDayKey(lesson.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(lesson);
  }
  return Array.from(map.entries());
}

const levelColors: Record<string, string> = {
  A1: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  A2: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  B1: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  B2: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  C1: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  C2: "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

function LessonCard({
  lesson,
  isAdded,
  onToggle,
  index,
}: {
  lesson: MockUpcomingClass;
  isAdded: boolean;
  onToggle: () => void;
  index: number;
}) {
  const time = extractTime(lesson.date);
  const dayKey = extractDayKey(lesson.date);

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      layout
      className={`group flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-200 ${
        isAdded
          ? "border-[#9e2727]/40 bg-[#9e2727]/10"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
              isAdded
                ? "bg-[#9e2727]/20 text-red-300"
                : "bg-white/10 text-white/70"
            }`}
          >
            {lesson.studentName.charAt(0)}
          </div>
          <p className="truncate text-sm font-medium text-white">
            {lesson.studentName}
          </p>
        </div>
        {lesson.level && (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              levelColors[lesson.level] ??
              "bg-white/10 text-white/60 border-white/20"
            }`}
          >
            {lesson.level}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {time && (
          <div className="flex items-center gap-1.5 text-sm text-white/50">
            <Clock size={12} />
            <span>{time}</span>
          </div>
        )}
        {lesson.topic && (
          <div className="flex items-center gap-1.5 text-sm text-white/50">
            <GraduationCap size={12} />
            <span className="truncate">{lesson.topic}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`mt-auto flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150 ${
          isAdded
            ? "border-[#9e2727]/40 bg-[#9e2727] text-white hover:bg-[#8a2222]"
            : "border-white/15 bg-white/8 text-white/70 hover:border-[#9e2727]/40 hover:bg-[#9e2727] hover:text-white"
        }`}
      >
        {isAdded ? (
          <>
            <Check size={13} strokeWidth={2.5} />
            Agregado
          </>
        ) : (
          <>
            <Plus size={13} strokeWidth={2.5} />
            Agregar a esta clase
          </>
        )}
      </button>
    </motion.div>
  );
}

// ─── Componente principal — solo contenido, sin portal ni overlay ───
export default function AddResourceToLessonForm({
  resource,
  resourceName,
  lessons,
  onSubmitForm,
  isSubmitting,
  onClose,
}: AddResourceToLessonProps) {
  const grouped = useMemo(() => groupByDay(lessons), [lessons]);
  const [dayIndex, setDayIndex] = useState(0);
  const [addedLessons, setAddedLessons] = useState<Set<string>>(new Set());

  const canPrev = dayIndex > 0;
  const canNext = dayIndex < grouped.length - 1;
  const currentEntry = grouped[dayIndex];
  const currentDayLabel = currentEntry?.[0] ?? "";
  const currentLessons = currentEntry?.[1] ?? [];

  const handleToggle = (lessonId: string) => {
    const next = new Set(addedLessons);
    if (next.has(lessonId)) {
      next.delete(lessonId);
    } else {
      next.add(lessonId);
      onSubmitForm(resource, lessonId);
    }
    setAddedLessons(next);
  };

  const handleRemove = (lessonId: string) => {
    const next = new Set(addedLessons);
    next.delete(lessonId);
    setAddedLessons(next);
  };

  const addedList = useMemo(
    () => lessons.filter((l) => addedLessons.has(l.id)),
    [lessons, addedLessons],
  );

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Contexto del recurso */}
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#9e2727]/20">
          <BookOpen size={14} className="text-red-300" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-white/40">
            Material a agregar
          </p>
          <p className="text-sm font-medium text-white truncate">
            {resourceName ?? "Sin nombre"}
          </p>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 py-10 text-center">
          <CalendarDays size={24} className="text-white/20" />
          <p className="text-sm text-white/40">
            No hay clases próximas disponibles
          </p>
        </div>
      ) : (
        <>
          {/* Navegador de días */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setDayIndex((i) => i - 1)}
              disabled={!canPrev}
              className="flex h-9 w-9 cursor-pointer shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
            >
              <ChevronLeft size={15} />
            </button>

            <div className="flex flex-col items-center">
              <p className="text-base font-medium text-white">
                {currentDayLabel}
              </p>
              <p className="text-xs text-white/40">
                {currentLessons.length} clase
                {currentLessons.length !== 1 ? "s" : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDayIndex((i) => i + 1)}
              disabled={!canNext}
              className="flex h-9 w-9 cursor-pointer shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Dots */}
          {grouped.length > 1 && (
            <div className="flex items-center justify-center gap-1.5">
              {grouped.map(([key], i) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDayIndex(i)}
                  className={`cursor-pointer h-1 rounded-full transition-all ${
                    i === dayIndex
                      ? "w-5 bg-[#9e2727]"
                      : "w-1 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Grid con scroll */}
          <div className="max-h-[42vh] overflow-y-auto pr-1 -mr-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="wait">
                {currentLessons.map((lesson, i) => (
                  <LessonCard
                    key={`${dayIndex}-${lesson.id}`}
                    lesson={lesson}
                    isAdded={addedLessons.has(lesson.id)}
                    onToggle={() => handleToggle(lesson.id)}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

      {/* Leyenda */}
      <AnimatePresence>
        {addedList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="mb-2.5 text-xs uppercase tracking-widest text-white/40">
                Agregado a {addedList.length} clase
                {addedList.length > 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {addedList.map((l) => (
                    <motion.span
                      key={l.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm text-white/70"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#9e2727]" />
                      {l.studentName}
                      <span className="text-white/20">·</span>
                      {/* Fecha en vez de hora */}
                      {extractDayKey(l.date)}
                      <button
                        type="button"
                        onClick={() => handleRemove(l.id)}
                        className="ml-0.5 cursor-pointer text-white/25 transition-colors hover:text-[#9e2727]"
                      >
                        <Trash2 size={11} />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition-all hover:bg-white/10"
        >
          Cancelar
        </button>
        <motion.button
          type="button"
          onClick={onClose}
          disabled={addedList.length === 0 || isSubmitting}
          whileTap={{ scale: 0.97 }}
          className={`cursor-pointer rounded-xl px-5 py-2 text-sm font-medium text-white shadow-sm transition-all ${
            addedList.length > 0
              ? "bg-[#9e2727] hover:bg-[#8a2222]"
              : "cursor-not-allowed bg-white/10 text-white/30"
          }`}
        >
          {isSubmitting
            ? "Guardando..."
            : addedList.length > 0
              ? `Guardar (${addedList.length})`
              : "Guardar"}
        </motion.button>
      </div>
    </div>
  );
}
