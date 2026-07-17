"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { LessonDetailDTO } from "@/lib/dto/lesson.dto";

interface DeleteLessonModalContentProps {
  lesson: LessonDetailDTO;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function DeleteLessonModalContent({
  lesson,
  onClose,
  onConfirm,
}: DeleteLessonModalContentProps) {
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canDelete = confirmation.trim().toLowerCase() === "borrar";

  const handleDelete = async () => {
    if (!canDelete) return;

    try {
      setIsSubmitting(true);
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 text-slate-200">
      <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
            <AlertTriangle size={19} />
          </div>

          <div>
            <p className="text-sm font-medium text-red-100">
              Esta acción todavía se conectará después al endpoint DELETE.
            </p>
            <p className="mt-1 text-xs leading-5 text-red-200/80">
              La idea será cancelar o borrar esta clase de forma segura. Si la
              clase ya estuviera completada, habría que proteger esta acción
              para no romper el historial de créditos.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-600/70 bg-slate-800/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Clase seleccionada
        </p>

        <p className="mt-2 text-sm font-medium text-white">{lesson.title}</p>

        <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-900/40 p-3">
            <p>Estado</p>
            <p className="mt-1 text-slate-200">{lesson.status}</p>
          </div>

          <div className="rounded-xl bg-slate-900/40 p-3">
            <p>Alumnos</p>
            <p className="mt-1 text-slate-200">{lesson.attendees.length}</p>
          </div>

          <div className="rounded-xl bg-slate-900/40 p-3">
            <p>Bloques</p>
            <p className="mt-1 text-slate-200">{lesson.blocks.length}</p>
          </div>
        </div>
      </div>

      <label className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Escribe “borrar” para confirmar
        </span>
        <input
          type="text"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="borrar"
          className="w-full rounded-xl border border-slate-600/70 bg-slate-800/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-red-400/60"
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
          onClick={handleDelete}
          disabled={!canDelete || isSubmitting}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-500/50 bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 size={15} />
          {isSubmitting ? "Borrando..." : "Borrar clase"}
        </button>
      </div>
    </div>
  );
}
