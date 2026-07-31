import {
  CalendarRange,
  ClipboardCheck,
  Clock3,
  Coins,
  Settings2,
  Users,
} from "lucide-react";

import type { CourseTemplateDetailDTO } from "@/lib/dto/course-template.dto";
import {
  getClassTypeLabel,
  getCreditConsumeOnLabel,
  getFrequencyLabel,
  getParticipantModeLabel,
  getPreparationStatusLabel,
  getWeekdayLabel,
} from "@/lib/utils/course-template-visuals";

interface CourseTemplateOperationalDefaultsSummaryProps {
  template: CourseTemplateDetailDTO;
}

interface SummaryItemProps {
  icon: typeof Clock3;
  label: string;
  value: string;
  detail?: string;
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  detail,
}: SummaryItemProps) {
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

export default function CourseTemplateOperationalDefaultsSummary({
  template,
}: CourseTemplateOperationalDefaultsSummaryProps) {
  const {
    lessonDefaults,
    schedulingDefaults,
    creditPolicy,
    participantPolicy,
    preparationPolicy,
  } = template.operationalDefaults;
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

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#9e2727]/10 text-[#9e2727]">
          <Settings2 className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-semibold text-slate-950">Reglas por defecto</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            Se copiarán al crear un curso real y después podrán modificarse.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryItem
          icon={Clock3}
          label="Clase"
          value={`${lessonDefaults.durationMinutes} min · ${getClassTypeLabel(
            lessonDefaults.defaultClassType,
          )}`}
          detail={lessonDefaults.timezone}
        />
        <SummaryItem
          icon={CalendarRange}
          label="Frecuencia"
          value={`${getFrequencyLabel(schedulingDefaults.frequency)} · ${
            schedulingDefaults.sessionsPerWeek
          } ${
            schedulingDefaults.sessionsPerWeek === 1
              ? "sesión/semana"
              : "sesiones/semana"
          }`}
          detail={preferredDays || "Sin días preferidos"}
        />
        <SummaryItem
          icon={Coins}
          label="Créditos"
          value={`${creditPolicy.creditsPerLesson} por clase`}
          detail={getCreditConsumeOnLabel(creditPolicy.consumeOn)}
        />
        <SummaryItem
          icon={Users}
          label="Participantes"
          value={getParticipantModeLabel(participantPolicy.participantMode)}
          detail={participantCount}
        />
        <SummaryItem
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
        <SummaryItem
          icon={Coins}
          label="Casos especiales"
          value={`Trial: ${
            creditPolicy.trialConsumesCredit ? "consume" : "no consume"
          }`}
          detail={`Cancelación: ${
            creditPolicy.cancellationConsumesCredit ? "consume" : "no consume"
          } · No-show: ${
            creditPolicy.noShowConsumesCredit ? "consume" : "no consume"
          }`}
        />
      </div>
    </section>
  );
}
