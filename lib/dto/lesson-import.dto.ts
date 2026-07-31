import type {
  LessonClassType,
  LessonStatus,
} from "@/lib/types/lesson";

export interface LessonImportCandidateDTO {
  id: string;
  title: string;
  scheduledStart: string | null;
  status: LessonStatus;
  classType: LessonClassType;
  attendeesSummary: string;
  blocksCount: number;
  resourcesCount: number;
  estimatedMinutes: number;
  actualMinutes?: number;
}
