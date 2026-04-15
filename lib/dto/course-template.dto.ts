
import type {
  ICourseTemplate,
  IPriceCondition,
  IPriceOption,
  IPedagogicalMeta,
  ISubModule,
  IModuleData,
  ICurriculum,
  IStorefront,
} from "@/models/CourseTemplate";

export type PriceConditionDTO = IPriceCondition;

export type PedagogicalMetaDTO = IPedagogicalMeta;

export type SubModuleDTO = ISubModule;

export interface PriceOptionDTO extends Omit<IPriceOption, "condition"> {
  condition?: PriceConditionDTO;
}


export interface ModuleDataDTO extends Omit<IModuleData, "submodules"> {
  submodules: SubModuleDTO[];
}

export interface CurriculumDTO extends ICurriculum {
  modules: ModuleDataDTO[];
  units: string[];
}

export interface DefaultStorefrontDTO
  extends Omit<IStorefront, "priceOptions"> {
  priceOptions: PriceOptionDTO[];
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
  defaultStorefront: DefaultStorefrontDTO;
  curriculum: CurriculumDTO;

  createdAt: string;
  updatedAt: string;
}