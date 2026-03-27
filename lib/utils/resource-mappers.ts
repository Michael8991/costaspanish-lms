import { PedagogicalType } from "@/models/ResourceProfile";
import { CEFRLevel, DeliveryModes, FormatType, LessonStage, ResourceStatus, ResourceVisibility, SkillFocus } from "../constants/resource.constants";

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
