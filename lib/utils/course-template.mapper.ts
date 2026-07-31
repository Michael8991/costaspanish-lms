import type {
  CourseTemplateDetailDTO,
  CourseTemplateListItemDTO,
  CourseTemplateStatsDTO,
  CourseOperationalDefaultsDTO,
  CurriculumDTO,
  DefaultStorefrontDTO,
  ModuleDataDTO,
  PedagogicalMetaDTO,
  PriceOptionDTO,
  SubModuleDTO,
  TemplateBlockDTO,
  TemplateLessonDTO,
} from "../dto/course-template.dto";
import type {
  ICourseTemplate,
  CourseTemplateDocument,
  IModuleData,
  ITemplateBlock,
  ITemplateLesson,
} from "@/models/CourseTemplate";
import type { CourseOperationalPolicies } from "@/lib/types/course-policies";
import {
  getDefaultCourseOperationalPolicies,
  normalizeCourseOperationalPolicies,
} from "@/lib/utils/course-policies";

type CourseTemplateSource =
  | ICourseTemplate
  | CourseTemplateDocument
  | (ICourseTemplate & {
      _id: unknown;
    });

function toIdString(value: unknown): string {
  if (!value) return "";
  return String(value);
}

function toIsoDate(value: Date | string | undefined): string {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function getDefaultOperationalDefaults(): CourseOperationalDefaultsDTO {
  return getDefaultCourseOperationalPolicies();
}

export function normalizeOperationalDefaults(
  source?: Partial<CourseOperationalPolicies>,
): CourseOperationalDefaultsDTO {
  return normalizeCourseOperationalPolicies(source);
}

function toSubModuleDTO(submodule: {
  title: string;
  type?: string;
  durationLabel?: string;
}): SubModuleDTO {
  return {
    title: submodule.title,
    type: submodule.type,
    durationLabel: submodule.durationLabel,
  };
}

function toTemplateBlockDTO(block: ITemplateBlock): TemplateBlockDTO {
  return {
    title: block.title,
    type: block.type,
    categories: block.categories ?? [],
    plannedContent: block.plannedContent,
    plannedObjectives: block.plannedObjectives ?? [],
    estimatedMinutes: block.estimatedMinutes,
    cefrLevels: block.cefrLevels ?? [],
    skills: block.skills ?? [],
    tags: block.tags ?? [],
    resources: (block.resources ?? []).map(toIdString),
    order: block.order ?? 0,
  };
}

function toTemplateLessonDTO(
  lesson: ITemplateLesson,
): TemplateLessonDTO {
  return {
    title: lesson.title,
    description: lesson.description,
    order: lesson.order ?? 0,
    estimatedMinutes: lesson.estimatedMinutes,
    objectives: lesson.objectives ?? [],
    blocks: (lesson.blocks ?? []).map(toTemplateBlockDTO),
    teacherNotes: lesson.teacherNotes,
  };
}

function toModuleDataDTO(module: IModuleData): ModuleDataDTO {
  return {
    title: module.title,
    description: module.description,
    durationLabel: module.durationLabel,
    type: module.type,
    order: module.order ?? 0,
    objectives: module.objectives ?? [],
    lessons: (module.lessons ?? []).map(toTemplateLessonDTO),
    submodules: (module.submodules ?? []).map(toSubModuleDTO),
  };
}

function toCurriculumDTO(curriculum?: ICourseTemplate["curriculum"]): CurriculumDTO {
  return {
    modules: (curriculum?.modules ?? []).map(toModuleDataDTO),
    units: curriculum?.units ?? [],
  };
}

function getCourseTemplateStats(
  curriculum: CurriculumDTO,
): CourseTemplateStatsDTO {
  const lessons = curriculum.modules.flatMap((module) => module.lessons);
  const blocks = lessons.flatMap((lesson) => lesson.blocks);
  const resourceIds = new Set(
    blocks.flatMap((block) => block.resources).filter(Boolean),
  );

  return {
    modulesCount: curriculum.modules.length,
    lessonsCount: lessons.length,
    blocksCount: blocks.length,
    resourcesCount: resourceIds.size,
  };
}

function toPriceOptionDTO(option: {
  label: string;
  amount?: number;
  condition?: {
    participantMode?: "solo" | "pair" | "trio" | "group";
    participantCount?: number;
    packageClasses?: number;
    monthlyClasses?: number;
  };
  isFeatured?: boolean;
  isActive: boolean;
  sortOrder?: number;
}): PriceOptionDTO {
  return {
    label: option.label,
    amount: option.amount,
    condition: option.condition
      ? {
          participantMode: option.condition.participantMode,
          participantCount: option.condition.participantCount,
          packageClasses: option.condition.packageClasses,
          monthlyClasses: option.condition.monthlyClasses,
        }
      : undefined,
    isFeatured: option.isFeatured,
    isActive: option.isActive,
    sortOrder: option.sortOrder,
  };
}

function toDefaultStorefrontDTO(
  storefront: ICourseTemplate["storefront"]
): DefaultStorefrontDTO {
  return {
    isPublished: storefront.isPublished,
    publicTitle: storefront.publicTitle,
    shortDescription: storefront.shortDescription,
    longDescription: storefront.longDescription,
    seoTitle: storefront.seoTitle,
    seoDescription: storefront.seoDescription,
    promoVideoUrl: storefront.promoVideoUrl,
    benefits: storefront.benefits ?? [],
    priceMode: storefront.priceMode,
    priceOptions: (storefront.priceOptions ?? []).map(toPriceOptionDTO),
    currency: storefront.currency,
    heroImageUrl: storefront.heroImageUrl,
    thumbnailUrl: storefront.thumbnailUrl,
    ctaText: storefront.ctaText,
  };
}

function toPedagogicalMetaDTO(
  pedagogicalMeta: ICourseTemplate["pedagogicalMeta"]
): PedagogicalMetaDTO {
  return {
    level: pedagogicalMeta.level,
    category: pedagogicalMeta.category,
    objectives: pedagogicalMeta.objectives ?? [],
    methodology: pedagogicalMeta.methodology,
    estimatedDurationLabel: pedagogicalMeta.estimatedDurationLabel,
    targetAudience: pedagogicalMeta.targetAudience,
  };
}

export function toCourseTemplateListItemDTO(
  source: CourseTemplateSource
): CourseTemplateListItemDTO {
  const stats = getCourseTemplateStats(toCurriculumDTO(source.curriculum));

  return {
    id: toIdString((source as { _id?: unknown })._id),
    ownerTeacherId: toIdString(source.ownerTeacherId),
    code: source.code,
    internalName: source.internalName,
    status: source.status,
    version: source.version,

    level: source.pedagogicalMeta.level,
    category: source.pedagogicalMeta.category,

    publicTitle: source.storefront.publicTitle,
    priceMode: source.storefront.priceMode,
    currency: source.storefront.currency,
    priceOptionsCount: source.storefront.priceOptions?.length ?? 0,
    modulesCount: stats.modulesCount,
    lessonsCount: stats.lessonsCount,
    blocksCount: stats.blocksCount,
    resourcesCount: stats.resourcesCount,

    createdAt: toIsoDate(source.createdAt),
    updatedAt: toIsoDate(source.updatedAt),
  };
}

export function toCourseTemplateDetailDTO(
  source: CourseTemplateSource
): CourseTemplateDetailDTO {
  const curriculum = toCurriculumDTO(source.curriculum);

  return {
    id: toIdString((source as { _id?: unknown })._id),
    ownerTeacherId: toIdString(source.ownerTeacherId),
    code: source.code,
    internalName: source.internalName,
    status: source.status,
    version: source.version,

    pedagogicalMeta: toPedagogicalMetaDTO(source.pedagogicalMeta),
    storefront: toDefaultStorefrontDTO(source.storefront),
    curriculum,
    operationalDefaults: normalizeOperationalDefaults(
      source.operationalDefaults,
    ),
    stats: getCourseTemplateStats(curriculum),

    createdAt: toIsoDate(source.createdAt),
    updatedAt: toIsoDate(source.updatedAt),
  };
}

export function toCourseTemplateListDTO(
  sources: CourseTemplateSource[]
): CourseTemplateListItemDTO[] {
  return sources.map(toCourseTemplateListItemDTO);
}
