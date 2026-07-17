"use client";

import { useState } from "react";
import { CalendarClock, Clock3 } from "lucide-react";
import { LessonDetailDTO } from "@/lib/dto/lesson.dto";
import { RescheduleLessonPayload } from "./LessonDetailHeader";

interface RescheduleLessonModalContentProps {
  lesson: LessonDetailDTO;
  onClose: () => void;
  onConfirm: (payload: RescheduleLessonPayload) => Promise<void> | void;
}

function toDatetimeLocalValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

export default function RescheduleLessonModalContent({
  lesson,
  onClose,
  onConfirm,
}: RescheduleLessonModalContentProps) {
  const [scheduledStart, setScheduledStart] = useState(
    toDatetimeLocalValue(lesson.scheduledStart),
  );
  const [scheduledEnd, setScheduledEnd] = useState(
    toDatetimeLocalValue(lesson.scheduledEnd),
  );
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    scheduledStart.trim().length > 0 &&
    scheduledEnd.trim().length > 0 &&
    new Date(scheduledEnd) > new Date(scheduledStart);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);

      await onConfirm({
        scheduledStart,
        scheduledEnd,
        reason: reason.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 text-slate-200">
      <div className="rounded-2xl border border-slate-600/70 bg-slate-800/60 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#9e2727]/20 text-[#ffb4b4]">
            <CalendarClock size={18} />
          </div>

          <div>
            <p className="text-sm font-medium text-white">{lesson.title}</p>
            <p className="mt-1 text-xs text-slate-400">
              Cambia la fecha o la hora de esta clase. La actualización real se
              conectará después al endpoint PATCH.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Nueva fecha de inicio
          </span>
          <input
            type="datetime-local"
            value={scheduledStart}
            onChange={(event) => setScheduledStart(event.target.value)}
            className="w-full rounded-xl border border-slate-600/70 bg-slate-800/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-slate-500"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Nueva fecha de fin
          </span>
          <input
            type="datetime-local"
            value={scheduledEnd}
            onChange={(event) => setScheduledEnd(event.target.value)}
            className="w-full rounded-xl border border-slate-600/70 bg-slate-800/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-slate-500"
          />
        </label>
      </div>

      {!canSubmit && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          <Clock3 size={14} />
          La fecha de fin debe ser posterior a la fecha de inicio.
        </div>
      )}

      <label className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Motivo interno opcional
        </span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder="Ej: el alumno ha pedido mover la clase al viernes..."
          className="w-full resize-none rounded-xl border border-slate-600/70 bg-slate-800/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-slate-500"
        />
      </label>

      <div className="flex items-center justify-end gap-2 border-t border-slate-700/60 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="cursor-pointer rounded-xl border border-slate-600/70 bg-slate-800/60 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:bg-slate-700/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="cursor-pointer rounded-xl border border-[#9e2727]/70 bg-[#9e2727] px-4 py-2 text-sm text-white transition hover:bg-[#8d2323] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? "Guardando..." : "Guardar cambio"}
        </button>
      </div>
    </div>
  );
}
