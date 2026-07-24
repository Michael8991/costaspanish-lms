import type {
  LessonBlockType,
  LessonClassType,
  LessonStatus,
} from "@/lib/types/lesson";

export interface UpcomingLessonResourceBlockDTO {
  id: string;
  lineageId?: string;
  order: number;
  title: string;
  type: LessonBlockType;
  resourceIds: string[];
}

export interface UpcomingLessonForResourceDTO {
  id: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  classType: LessonClassType;
  status: LessonStatus;
  attendeeNames: string[];
  blocks: UpcomingLessonResourceBlockDTO[];
  alreadyContainsResource: boolean;
  resourceBlockTitles: string[];
}

export interface UpcomingLessonsForResourceResponse {
  ok: true;
  items: UpcomingLessonForResourceDTO[];
}

export type AddLessonResourcesTarget =
  | {
      mode: "existing_block";
      blockId: string;
    }
  | {
      mode: "new_block";
      title: string;
      type: LessonBlockType;
      estimatedMinutes: number;
    };

export interface AddLessonResourcesResponse {
  ok: true;
  addedResourceIds: string[];
  skippedResourceIds: string[];
  lessonId: string;
}
