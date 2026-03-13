import { Types } from "mongoose";
import { IResource } from "@/models/ResourceProfile";

export type ResourceListSource = Pick<
  IResource,
  | "title"
  | "description"
  | "status"
  | "visibility"
  | "pedagogicalType"
  | "levels"
  | "skills"
  | "deliveryModes"
  | "lessonStages"
  | "grammarTopics"
  | "vocabularyTopics"
  | "tags"
  | "estimatedDurationMinutes"
  | "difficulty"
  | "hasAnswerKey"
  | "requiresTeacherReview"
  | "format"
  | "originalFilename"
  | "mimeType"
  | "pageCount"
  | "durationSeconds"
  | "thumbnailUrl"
  | "externalUrl"
  | "timesUsed"
  | "ownerTeacherId"
  | "createdAt"
  | "updatedAt"
> & {
  _id: Types.ObjectId;
};

type ResourceDetailSource = Pick<
  IResource,
  | "title"
  | "description"
  | "status"
  | "visibility"
  | "pedagogicalType"
  | "levels"
  | "skills"
  | "deliveryModes"
  | "lessonStages"
  | "grammarTopics"
  | "vocabularyTopics"
  | "tags"
  | "estimatedDurationMinutes"
  | "difficulty"
  | "hasAnswerKey"
  | "requiresTeacherReview"
  | "format"
  | "storagePath"
  | "fileUrl"
  | "originalFilename"
  | "mimeType"
  | "fileSizeBytes"
  | "pageCount"
  | "durationSeconds"
  | "thumbnailUrl"
  | "externalUrl"
  | "timesUsed"
  | "ownerTeacherId"
  | "createdAt"
  | "updatedAt"
> & {
  _id: Types.ObjectId;
};

export interface ResourceListItemDTO {
  id: string;
  title: string;
  description: string;
  status: IResource["status"];
  visibility: IResource["visibility"];
  pedagogicalType: IResource["pedagogicalType"];

  levels: IResource["levels"];
  skills: IResource["skills"];
  deliveryModes: IResource["deliveryModes"];
  lessonStages: IResource["lessonStages"];

  grammarTopics: string[];
  vocabularyTopics: string[];
  tags: string[];

  estimatedDurationMinutes?: number;
  difficulty?: number;

  hasAnswerKey: boolean;
  requiresTeacherReview: boolean;
  timesUsed: number;

  asset: {
    format: IResource["format"];
    thumbnailUrl?: string;
    externalUrl?: string;
    originalFilename?: string;
    mimeType?: string;
    pageCount?: number;
    durationSeconds?: number;
  };

  owner: {
    teacherId: string | null;
    isMine: boolean;
  };

  createdAt: string;
  updatedAt: string;
}

export interface ResourceDetailDTO extends ResourceListItemDTO {
  storage: {
    storagePath?: string;
    fileUrl?: string;
    fileSizeBytes?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function toResourceListItemDTO(
  resource: ResourceListSource,
  currentUserId?: string,
): ResourceListItemDTO {
  const ownerId = resource.ownerTeacherId
    ? String(resource.ownerTeacherId)
    : null;

  return {
    id: String(resource._id),
    title: resource.title,
    description: resource.description,
    status: resource.status,
    visibility: resource.visibility,
    pedagogicalType: resource.pedagogicalType,

    levels: resource.levels,
    skills: resource.skills,
    deliveryModes: resource.deliveryModes,
    lessonStages: resource.lessonStages,

    grammarTopics: resource.grammarTopics,
    vocabularyTopics: resource.vocabularyTopics,
    tags: resource.tags,

    estimatedDurationMinutes: resource.estimatedDurationMinutes,
    difficulty: resource.difficulty,

    hasAnswerKey: resource.hasAnswerKey,
    requiresTeacherReview: resource.requiresTeacherReview,
    timesUsed: resource.timesUsed,

    asset: {
      format: resource.format,
      thumbnailUrl: resource.thumbnailUrl,
      externalUrl: resource.externalUrl,
      originalFilename: resource.originalFilename,
      mimeType: resource.mimeType,
      pageCount: resource.pageCount,
      durationSeconds: resource.durationSeconds,
    },

    owner: {
      teacherId: ownerId,
      isMine: !!ownerId && !!currentUserId && ownerId === currentUserId,
    },

    createdAt: new Date(resource.createdAt).toISOString(),
    updatedAt: new Date(resource.updatedAt).toISOString(),
  };
}

export function toResourceDetailDTO(
  resource: ResourceDetailSource,
  currentUserId?: string,
): ResourceDetailDTO {
  const base = toResourceListItemDTO(resource, currentUserId);

  return {
    ...base,
    storage: {
      storagePath: resource.storagePath,
      fileUrl: resource.fileUrl,
      fileSizeBytes: resource.fileSizeBytes,
    },
  };
}

export function toPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<T> {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
