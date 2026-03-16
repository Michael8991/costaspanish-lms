"use client";

import {
  Clock3,
  Eye,
  EyeOff,
  FileQuestion,
  FileText,
  Headphones,
  ImageIcon,
  Link as LucideLink,
  MoreVertical,
  Video,
  type LucideIcon,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import Image from "next/image";

import { ResourceListItemDTO } from "@/lib/dto/resource.dto";

type ResourceFormat = "pdf" | "image" | "audio" | "video" | "external_link";
type ResourceVisibility = "private" | "shared";

interface ResourcesGridViewProps {
  resources: ResourceListItemDTO[];
}

const toDisplayLabel = (value: string) => {
  if (!value) return "";
  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getFileTypeBadge = (format: ResourceFormat | string) => {
  const formatConfig: Record<
    string,
    { icon: LucideIcon; color: string; label: string }
  > = {
    pdf: {
      icon: FileText,
      color: "text-rose-700 bg-rose-50 border border-rose-200/80",
      label: "PDF",
    },
    image: {
      icon: ImageIcon,
      color: "text-emerald-700 bg-emerald-50 border border-emerald-200/80",
      label: "Image",
    },
    audio: {
      icon: Headphones,
      color: "text-amber-700 bg-amber-50 border border-amber-200/80",
      label: "Audio",
    },
    video: {
      icon: Video,
      color: "text-violet-700 bg-violet-50 border border-violet-200/80",
      label: "Video",
    },
    external_link: {
      icon: LucideLink,
      color: "text-slate-700 bg-slate-100 border border-slate-200/80",
      label: "Link",
    },
  };

  return (
    formatConfig[format] || {
      icon: FileQuestion,
      color: "text-slate-600 bg-slate-100 border border-slate-200/80",
      label: "Unknown",
    }
  );
};

const getPedagogicalTypeLabel = (value: string) => {
  const pedagogicalTypeMap: Record<string, string> = {
    worksheet: "Worksheet",
    audio: "Audio Activity",
    audio_track: "Audio Track",
    video: "Video Activity",
    video_clip: "Video Clip",
    presentation: "Presentation",
    flashcards: "Flashcards",
    reading: "Reading",
    reading_text: "Reading Text",
    grammar_reference: "Grammar Reference",
    speaking_prompt: "Speaking Prompt",
    writing_prompt: "Writing Prompt",
    quiz: "Quiz",
    game: "Game",
    other: "Other",
  };

  return pedagogicalTypeMap[value] || toDisplayLabel(value);
};

const getSkillLabel = (skill: string) => {
  const skillMap: Record<string, string> = {
    speaking: "Speaking",
    listening: "Listening",
    reading: "Reading",
    writing: "Writing",
    grammar: "Grammar",
    vocabulary: "Vocabulary",
    pronunciation: "Pronunciation",
    culture: "Culture",
  };

  return skillMap[skill] || toDisplayLabel(skill);
};

const getVisibilityMeta = (visibility: ResourceVisibility | string) => {
  const isShared = visibility === "shared";

  return {
    icon: isShared ? Eye : EyeOff,
    label: isShared ? "Shared" : "Private",
    className: isShared
      ? "text-sky-700 bg-sky-50 border border-sky-200/80"
      : "text-slate-700 bg-slate-100 border border-slate-200/80",
  };
};

const getStatusBadge = (rawStatus: string) => {
  const status = (rawStatus || "").trim().toLowerCase();

  if (status === "draft") {
    return "bg-amber-50 border border-amber-200/90 text-amber-700";
  }

  if (status === "published") {
    return "bg-emerald-50 border border-emerald-200/90 text-emerald-700";
  }

  if (status === "archived") {
    return "bg-slate-100 border border-slate-200/90 text-slate-700";
  }

  return "bg-slate-50 border border-dashed border-slate-200 text-slate-500";
};

const getLevelBadge = (level: string) => {
  if (["A1", "A2"].includes(level)) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200/90";
  }

  if (["B1", "B2"].includes(level)) {
    return "bg-blue-50 text-blue-700 border border-blue-200/90";
  }

  return "bg-violet-50 text-violet-700 border border-violet-200/90";
};

const getSkillBadge = () => {
  return "bg-slate-50 text-slate-700 border border-slate-200/80";
};

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: "easeOut",
      staggerChildren: 0.06,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: "easeOut" },
  },
};

function ResourcePreview({ resource }: { resource: ResourceListItemDTO }) {
  const {
    icon: FormatIcon,
    color: formatColor,
    label: formatLabel,
  } = getFileTypeBadge(resource.asset.format);

  const previewSrc =
    resource.asset.format === "image"
      ? resource.asset.thumbnailUrl
      : resource.asset.format === "pdf"
        ? resource.asset.thumbnailUrl || null
        : null;

  const shouldShowThumbnail =
    (resource.asset.format === "image" || resource.asset.format === "pdf") &&
    !!previewSrc;

  if (shouldShowThumbnail) {
    return (
      <div className="relative h-44 w-full overflow-hidden rounded-t-2xl bg-slate-100 sm:h-48">
        <Image
          src={previewSrc}
          alt={resource.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover"
          loading="lazy"
        />

        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-900/18 to-transparent p-3">
          <span
            title="File format"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur-sm ${formatColor}`}
          >
            <FormatIcon size={12} />
            {formatLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-44 w-full items-center justify-center rounded-t-2xl bg-linear-to-br from-slate-50 via-white to-slate-100 sm:h-48">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(158,39,39,0.08),transparent_42%)]" />
      <div className="relative flex flex-col items-center gap-3 px-4 text-center">
        <div className={`rounded-2xl p-4 shadow-sm ${formatColor}`}>
          <FormatIcon size={28} />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">{formatLabel}</p>
          <p className="text-xs text-slate-500">
            {getPedagogicalTypeLabel(resource.pedagogicalType)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResourcesGridView({
  resources,
}: ResourcesGridViewProps) {
  if (!resources || resources.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No resources found.
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 p-5"
    >
      {resources.map((resource) => {
        const {
          icon: FormatIcon,
          color: formatColor,
          label: formatLabel,
        } = getFileTypeBadge(resource.asset.format);

        const {
          icon: VisibilityIcon,
          label: visibilityLabel,
          className: visibilityClassName,
        } = getVisibilityMeta(resource.visibility);

        const mediaDuration =
          resource.asset.format === "audio" || resource.asset.format === "video"
            ? formatDuration(resource.asset.durationSeconds)
            : null;

        return (
          <motion.article
            key={resource.id}
            variants={itemVariants}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70"
          >
            <ResourcePreview resource={resource} />

            <div className="space-y-4 p-4 sm:p-5">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3
                    title="Resource title"
                    className="line-clamp-2 text-[15px] font-semibold leading-6 text-slate-900"
                  >
                    {resource.title}
                  </h3>

                  <button
                    type="button"
                    title="Open quick actions"
                    className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#9e2727]"
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    title="File format"
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${formatColor}`}
                  >
                    <FormatIcon size={12} />
                    {formatLabel}
                  </span>

                  {mediaDuration && (
                    <span
                      title="Media duration"
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                    >
                      <Clock3 size={12} />
                      {mediaDuration}
                    </span>
                  )}

                  <span
                    title="Pedagogical type"
                    className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700"
                  >
                    {getPedagogicalTypeLabel(resource.pedagogicalType)}
                  </span>

                  <span
                    title="Visibility"
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${visibilityClassName}`}
                  >
                    <VisibilityIcon size={12} />
                    {visibilityLabel}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Levels
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {(resource.levels ?? []).map((level, index) => (
                      <span
                        key={`${resource.id}-level-${index}`}
                        title="CEFR level"
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${getLevelBadge(
                          level,
                        )}`}
                      >
                        {level}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Language Skills
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {(resource.skills ?? []).map((skill, index) => (
                      <span
                        key={`${resource.id}-skill-${index}`}
                        title="Language skill"
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${getSkillBadge()}`}
                      >
                        {getSkillLabel(skill)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <span
                  title="Publication status"
                  className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(
                    resource.status,
                  )}`}
                >
                  {toDisplayLabel(resource.status)}
                </span>

                <span
                  title="Estimated activity duration"
                  className="text-xs font-medium text-slate-500"
                >
                  {resource.estimatedDurationMinutes
                    ? `${resource.estimatedDurationMinutes} min`
                    : "—"}
                </span>
              </div>
            </div>
          </motion.article>
        );
      })}
    </motion.div>
  );
}
