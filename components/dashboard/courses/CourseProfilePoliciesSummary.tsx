"use client";

import {
  AlertTriangle,
  CalendarRange,
  ClipboardCheck,
  Clock3,
  Coins,
  Loader2,
  RefreshCw,
  Settings2,
  Users,
} from "lucide-react";
import { useState } from "react";

import type { CourseProfileDetailDTO } from "@/lib/dto/course-profile.dto";
import {
  getClassTypeLabel,
  getCreditConsumeOnLabel,
  getFrequencyLabel,
  getParticipantModeLabel,
  getPreparationStatusLabel,
  getWeekdayLabel,
} from "@/lib/utils/course-template-visuals";

interface CourseProfilePoliciesSummaryProps {
  course: CourseProfileDetailDTO;
  hasTemplate: boolean;
  onCopied: (course: CourseProfileDetailDTO) => void;
}

interface PolicyItemProps {
  icon: typeof Clock3;
  label: string;
  value: string;
  detail?: string;
}

function PolicyItem({
  icon: Icon,
  label,
  value,
  detail,
}: PolicyItemProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Icon className="h-3.5 w-3.5 text-[#9e2727]" />
        {label}
      </div>
      <p className="mt-1.5 text-sm font-semibold text-slate-900">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

export default function CourseProfilePoliciesSummary({
  course,
  hasTemplate,
  onCopied,
}: CourseProfilePoliciesSummaryProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    lessonDefaults,
    schedulingDefaults,
    creditPolicy,
    participantPolicy,
    preparationPolicy,
  } = course.policies;
  const participantCount =
    participantPolicy.minStudents === participantPolicy.maxStudents
      ? `${participantPolicy.minStudents} ${
          participantPolicy.minStudents === 1 ? "alumno" : "alumnos"
        }`
      : `${participantPolicy.minStudents}–${participantPolicy.maxStudents} alumnos`;
  const preparationCopies = [
    preparationPolicy.copyTemplateBlocksToLesson ? "bloques" : null,
    preparationPolicy.copyTemplateResourcesToLesson ? "recursos" : null,
  ].filter((value): value is string => Boolean(value));
  const preferredDays = schedulingDefaults.preferredWeekdays
    .map(getWeekdayLabel)
    .join(", ");

  const copyPolicies = async () => {
    if (
      !window.confirm(
        "Esto reemplazará las reglas actuales de este curso por las reglas actuales de la plantilla. ¿Continuar?",
      )
    ) {
      return;
    }

    try {
      setIsCopying(true);
      setError(null);
      const response = await fetch(
        `/api/course-profiles/${course.id}/copy-template-policies`,
        { method: "POST" },
      );
      const data = (await response.json().catch(() => null)) as
        | { item?: CourseProfileDetailDTO; error?: string }
        | null;

      if (!response.ok || !data?.item) {
        throw new Error(
          data?.error ?? "No se pudieron copiar las reglas de la plantilla.",
        );
      }

      onCopied(data.item);
    } catch (copyError) {
      setError(
        copyError instanceof Error
          ? copyError.message
          : "No se pudieron copiar las reglas de la plantilla.",
      );
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#9e2727]/10 text-[#9e2727]">
            <Settings2 className="h-4 w-4" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-slate-950">
                Reglas del curso
              </h2>
              {course.policiesSource === "course" && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  Guardadas en el curso
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Estas reglas vienen de la plantilla, pero pertenecen a este
              curso.
            </p>
          </div>
        </div>

        {hasTemplate && (
          <button
            type="button"
            disabled={isCopying}
            onClick={() => void copyPolicies()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCopying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isCopying ? "Copiando..." : "Copiar reglas desde plantilla"}
          </button>
        )}
      </div>

      {course.policiesSource !== "course" && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {hasTemplate
            ? "Este curso todavía no tiene reglas propias guardadas. Puedes copiar las reglas actuales de la plantilla para congelarlas en este curso."
            : "Este curso todavía no tiene reglas propias guardadas y su plantilla ya no está disponible. Se muestran valores seguros por defecto."}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PolicyItem
          icon={Clock3}
          label="Clase"
          value={`${lessonDefaults.durationMinutes} min · ${getClassTypeLabel(
            lessonDefaults.defaultClassType,
          )}`}
          detail={lessonDefaults.timezone}
        />
        <PolicyItem
          icon={CalendarRange}
          label="Frecuencia"
          value={getFrequencyLabel(schedulingDefaults.frequency)}
          detail={`${schedulingDefaults.sessionsPerWeek} ${
            schedulingDefaults.sessionsPerWeek === 1
              ? "sesión/semana"
              : "sesiones/semana"
          }${preferredDays ? ` · ${preferredDays}` : ""}`}
        />
        <PolicyItem
          icon={Coins}
          label="Créditos por clase"
          value={String(creditPolicy.creditsPerLesson)}
          detail={getCreditConsumeOnLabel(creditPolicy.consumeOn)}
        />
        <PolicyItem
          icon={Users}
          label="Participantes"
          value={getParticipantModeLabel(participantPolicy.participantMode)}
          detail={participantCount}
        />
        <PolicyItem
          icon={ClipboardCheck}
          label="Preparación"
          value={
            preparationCopies.length > 0
              ? `Copia ${preparationCopies.join(" y ")}`
              : "Sin copia automática"
          }
          detail={getPreparationStatusLabel(
            preparationPolicy.defaultPreparationStatus,
          )}
        />
        <PolicyItem
          icon={Coins}
          label="Trial"
          value={
            creditPolicy.trialConsumesCredit
              ? "Consume crédito"
              : "No consume crédito"
          }
        />
        <PolicyItem
          icon={RefreshCw}
          label="Cancelación"
          value={
            creditPolicy.cancellationConsumesCredit
              ? "Consume crédito"
              : "No consume crédito"
          }
        />
        <PolicyItem
          icon={Users}
          label="No-show"
          value={
            creditPolicy.noShowConsumesCredit
              ? "Consume crédito"
              : "No consume crédito"
          }
        />
      </div>
    </section>
  );
}
