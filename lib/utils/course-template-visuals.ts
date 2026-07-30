import type {
  CourseTemplateListItemDTO,
  CourseTemplateStatsDTO,
} from "@/lib/dto/course-template.dto";
import type {
  ParticipantMode,
  StoreFrontPriceMode,
} from "@/lib/constants/courseTemplate.constants";

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
