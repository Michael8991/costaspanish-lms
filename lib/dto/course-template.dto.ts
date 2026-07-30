
import type {
  ICourseTemplate,
  IPriceCondition,
  IPriceOption,
  IPedagogicalMeta,
  ISubModule,
  IModuleData,
  ITemplateBlock,
  ITemplateLesson,
  IStorefront,
} from "@/models/CourseTemplate";

export type PriceConditionDTO = IPriceCondition;

export type PedagogicalMetaDTO = IPedagogicalMeta;

export type SubModuleDTO = ISubModule;

export interface PriceOptionDTO extends Omit<IPriceOption, "condition"> {
  condition?: PriceConditionDTO;
}

export interface TemplateBlockDTO
  extends Omit<
    ITemplateBlock,
    | "categories"
    | "plannedObjectives"
    | "cefrLevels"
    | "skills"
    | "tags"
    | "resources"
    | "order"
  > {
  categories: string[];
  plannedObjectives: string[];
  cefrLevels: NonNullable<ITemplateBlock["cefrLevels"]>;
  skills: string[];
  tags: string[];
  resources: string[];
  order: number;
}

export interface TemplateLessonDTO
  extends Omit<ITemplateLesson, "objectives" | "blocks"> {
  objectives: string[];
  blocks: TemplateBlockDTO[];
}

export interface ModuleDataDTO
  extends Omit<IModuleData, "submodules" | "objectives" | "lessons" | "order"> {
  order: number;
  objectives: string[];
  lessons: TemplateLessonDTO[];
  submodules: SubModuleDTO[];
}

export interface CurriculumDTO {
  modules: ModuleDataDTO[];
  units: string[];
}

export interface DefaultStorefrontDTO
  extends Omit<IStorefront, "priceOptions"> {
  priceOptions: PriceOptionDTO[];
}

export interface CourseTemplateStatsDTO {
  modulesCount: number;
  lessonsCount: number;
  blocksCount: number;
  resourcesCount: number;
}

/**
 * DTO reducido para listados en dashboard/admin
 */
export interface CourseTemplateListItemDTO {
  id: string;
  ownerTeacherId: string;
  code: string;
  internalName: string;
  status: ICourseTemplate["status"];
  version: number;

  level: IPedagogicalMeta["level"];
  category: string;

  publicTitle: string;
  priceMode: IStorefront["priceMode"];
  currency: IStorefront["currency"];
  priceOptionsCount: number;
  modulesCount: number;
  lessonsCount: number;
  blocksCount: number;
  resourcesCount: number;

  createdAt: string;
  updatedAt: string;
}

/**
 * DTO completo para detalle/edición
 */
export interface CourseTemplateDetailDTO {
  id: string;
  ownerTeacherId: string;
  code: string;
  internalName: string;
  status: ICourseTemplate["status"];
  version: number;

  pedagogicalMeta: PedagogicalMetaDTO;
  storefront: DefaultStorefrontDTO;
  curriculum: CurriculumDTO;
  stats: CourseTemplateStatsDTO;

  createdAt: string;
  updatedAt: string;
}
