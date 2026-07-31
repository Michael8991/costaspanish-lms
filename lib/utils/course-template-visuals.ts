import type {
  CourseTemplateListItemDTO,
  CourseTemplateStatsDTO,
} from "@/lib/dto/course-template.dto";
import type {
  ParticipantMode,
} from "@/lib/constants/courseTemplate.constants";
import type { StoreFrontPriceMode } from "@/lib/constants/courseTemplate.constants";
import type {
  CourseTemplateFrequency,
  CreditConsumeOn,
  TemplateClassType,
} from "@/lib/types/course-policies";

export function getCourseTemplateStatusVisual(
  status: CourseTemplateListItemDTO["status"],
) {
  switch (status) {
    case "ready":
      return {
        label: "Lista",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "archived":
      return {
        label: "Archivada",
        className: "bg-gray-100 text-gray-500 border-gray-200",
      };
    case "draft":
    default:
      return {
        label: "Borrador",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
}

export function getCourseTemplateLevelLabel(level: string) {
  return `Nivel ${level}`;
}

export function getCourseTemplateStatsLabel(
  stats: CourseTemplateStatsDTO,
) {
  return `${stats.modulesCount} módulos · ${stats.lessonsCount} clases modelo · ${stats.blocksCount} bloques · ${stats.resourcesCount} recursos`;
}

export function getCourseTemplatePriceModeLabel(mode: StoreFrontPriceMode) {
  const labels: Record<StoreFrontPriceMode, string> = {
    monthly: "Mensual",
    package: "Paquete de clases",
    free: "Gratuita",
    custom_label: "Texto personalizado",
  };

  return labels[mode];
}

export function getParticipantModeLabel(mode: ParticipantMode) {
  const labels: Record<ParticipantMode, string> = {
    solo: "Individual",
    pair: "Pareja",
    trio: "Trío",
    group: "Grupo",
  };

  return labels[mode];
}

export function getClassTypeLabel(value: TemplateClassType) {
  const labels: Record<TemplateClassType, string> = {
    private: "Privada",
    pair: "Pareja",
    group_regular: "Grupo regular",
    semi_intensive: "Semi-intensivo",
    intensive: "Intensivo",
  };

  return labels[value];
}

export function getFrequencyLabel(value: CourseTemplateFrequency) {
  const labels: Record<CourseTemplateFrequency, string> = {
    once: "Una vez",
    weekly: "Semanal",
    twice_weekly: "Dos veces por semana",
    custom: "Personalizada",
  };

  return labels[value];
}

export function getCreditConsumeOnLabel(value: CreditConsumeOn) {
  return value === "completion" ? "Al completar" : "Al programar";
}

export function getPreparationStatusLabel(
  value: "needs_preparation" | "prepared",
) {
  return value === "prepared" ? "Preparada" : "Necesita preparación";
}

/**
 * Weekdays follow the JavaScript convention: Sunday is 0 and Monday is 1.
 * The UI presents them from Monday to Sunday.
 */
export function getWeekdayLabel(value: number) {
  const labels: Record<number, string> = {
    0: "Domingo",
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
  };

  return labels[value] ?? `Día ${value}`;
}
