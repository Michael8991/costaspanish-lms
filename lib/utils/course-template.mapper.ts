import type {
  CourseTemplateDetailDTO,
  CourseTemplateListItemDTO,
  CurriculumDTO,
  DefaultStorefrontDTO,
  ModuleDataDTO,
  PedagogicalMetaDTO,
  PriceOptionDTO,
  SubModuleDTO,
} from "../dto/course-template.dto";
import type { ICourseTemplate, CourseTemplateDocument } from "@/models/CourseTemplate";

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

function toModuleDataDTO(module: {
  title: string;
  durationLabel?: string;
  type?: string;
  submodules?: {
    title: string;
    type?: string;
    durationLabel?: string;
  }[];
}): ModuleDataDTO {
  return {
    title: module.title,
    durationLabel: module.durationLabel,
    type: module.type,
    submodules: (module.submodules ?? []).map(toSubModuleDTO),
  };
}

function toCurriculumDTO(curriculum?: ICourseTemplate["curriculum"]): CurriculumDTO {
  return {
    modules: (curriculum?.modules ?? []).map(toModuleDataDTO),
    units: curriculum?.units ?? [],
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

    createdAt: toIsoDate(source.createdAt),
    updatedAt: toIsoDate(source.updatedAt),
  };
}

export function toCourseTemplateDetailDTO(
  source: CourseTemplateSource
): CourseTemplateDetailDTO {
  return {
    id: toIdString((source as { _id?: unknown })._id),
    ownerTeacherId: toIdString(source.ownerTeacherId),
    code: source.code,
    internalName: source.internalName,
    status: source.status,
    version: source.version,

    pedagogicalMeta: toPedagogicalMetaDTO(source.pedagogicalMeta),
    storefront: toDefaultStorefrontDTO(source.storefront),
    curriculum: toCurriculumDTO(source.curriculum),

    createdAt: toIsoDate(source.createdAt),
    updatedAt: toIsoDate(source.updatedAt),
  };
}

export function toCourseTemplateListDTO(
  sources: CourseTemplateSource[]
): CourseTemplateListItemDTO[] {
  return sources.map(toCourseTemplateListItemDTO);
}