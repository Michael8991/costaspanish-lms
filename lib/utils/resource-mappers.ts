import { PedagogicalType } from "@/models/ResourceProfile";
import { CEFRLevel, DeliveryModes, FormatType, LessonStage, PEDAGOGICAL_TYPES, RESOURCE_STATUS, RESOURCE_VISIBILITY, ResourceStatus, ResourceVisibility, SkillFocus } from "../constants/resource.constants";

export type AddResourcePayload = {
  title: string;
  description: string;
  status: ResourceStatus;
  visibility: ResourceVisibility;

  pedagogicalType: PedagogicalType;
  transcriptText?: string;
  levels: CEFRLevel[];
  skills: SkillFocus[];
  deliveryModes: DeliveryModes[];
  lessonStage: LessonStage[];

  grammarTopics: string[];
  vocabularyTopics: string[];
  tags: string[];

  estimatedDurationMinutes?: number;
  difficulty?: number;

  hasAnswerKey: boolean;
  requiresTeacherReview: boolean;

  format: FormatType;

  storagePath?: string;
  fileUrl?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  pageCount?: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  thumbnailStoragePath?: string;

  externalUrl?: string;
};


export type EditFormValues = {
  title?: string;
  description?: string;
  status?: (typeof RESOURCE_STATUS)[number];
  visibility?: (typeof RESOURCE_VISIBILITY)[number];
  pedagogicalType?: (typeof PEDAGOGICAL_TYPES)[number];
  levels?: CEFRLevel[];
  skills?: SkillFocus[];
  deliveryModes?: DeliveryModes[];
  lessonStages?: LessonStage[];
  grammarTopics?: string[];
  vocabularyTopics?: string[];
  tags?: string[];
  estimatedDurationMinutes?: number;
  difficulty?: number;
  hasAnswerKey?: boolean;
  requiresTeacherReview?: boolean;
  transcriptText?: string;
  format: FormatType;
  // inputs de texto para los array de strings
  grammarTopicsInput: string;
  vocabularyTopicsInput: string;
  tagsInput: string;
  storagePath?: string;
  fileUrl?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  pageCount?: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  thumbnailStoragePath?: string;

  externalUrl?: string;
};
