import {
  ChevronDown,
  Clock3,
  Eye,
  EyeOff,
  FileQuestion,
  FileText,
  Filter,
  Headphones,
  ImageIcon,
  LayoutDashboard,
  MoreVertical,
  Plus,
  Search,
  TextAlignJustify,
  Video,
  LucideIcon,
  Link as LucideLink,
} from "lucide-react";
import Link from "next/link";

import { mockResources } from "@/lib/mocks/resources.mock";

type ResourceFormat = "pdf" | "image" | "audio" | "video" | "external_link";
type ResourceVisibility = "private" | "shared";

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

export const getFileTypeBadge = (format: ResourceFormat | string) => {
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

export default function ResourcesTable() {
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
      return "bg-emerald-50 text-emerald-700 border-emerald-200/90";
    }

    if (["B1", "B2"].includes(level)) {
      return "bg-blue-50 text-blue-700 border-blue-200/90";
    }

    return "bg-violet-50 text-violet-700 border-violet-200/90";
  };

  const getSkillBadge = () => {
    return "bg-slate-50 text-slate-700 border border-slate-200/80";
  };

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/70 p-5 sm:flex-row">
        <h2 className="text-lg font-semibold text-slate-800">Resources</h2>

        <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <div className="relative w-full sm:w-80">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search resource..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9e2727]/30"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              title="List view"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#8d2323] sm:w-auto"
            >
              <TextAlignJustify size={18} />
            </button>

            <button
              title="Grid view"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 sm:w-auto"
            >
              <LayoutDashboard size={18} />
            </button>
          </div>

          <Link
            href="#"
            title="Create a new resource"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#8d2323] sm:w-auto"
          >
            <Plus size={18} />
            <span>New Resource</span>
          </Link>

          <button
            title="Open filters"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 sm:w-auto"
          >
            <Filter size={18} />
            Filters
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] uppercase tracking-[0.12em] text-slate-500">
              <th className="px-6 py-4 font-medium">Title</th>
              <th className="px-6 py-4 font-medium">Level</th>
              <th className="px-6 py-4 font-medium">Language Skills</th>
              <th className="px-6 py-4 text-center font-medium">Status</th>
              <th className="px-6 py-4 text-right font-medium">Quick Menu</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {mockResources.map((resource) => {
              const {
                icon: FormatIcon,
                color: formatColor,
                label: formatLabel,
              } = getFileTypeBadge(resource.format);

              const {
                icon: VisibilityIcon,
                label: visibilityLabel,
                className: visibilityClassName,
              } = getVisibilityMeta(resource.visibility);

              const mediaDuration =
                resource.format === "audio" || resource.format === "video"
                  ? formatDuration(resource.durationSeconds)
                  : null;

              return (
                <tr
                  key={resource.id}
                  className="group transition-colors hover:bg-slate-50/70"
                >
                  <td className="min-w-[360px] px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <p
                        title="Resource title"
                        className="cursor-help text-[15px] font-semibold leading-6 text-slate-900"
                      >
                        {resource.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          title="File format"
                          className={`inline-flex cursor-help items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${formatColor}`}
                        >
                          <FormatIcon size={13} />
                          {formatLabel}
                        </span>

                        <span
                          title="Pedagogical type"
                          className="inline-flex cursor-help items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                        >
                          {getPedagogicalTypeLabel(resource.pedagogicalType)}
                        </span>

                        <span
                          title="Visibility"
                          className={`inline-flex cursor-help items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${visibilityClassName}`}
                        >
                          <VisibilityIcon size={13} />
                          {visibilityLabel}
                        </span>

                        {mediaDuration && (
                          <span
                            title="Media duration"
                            className="inline-flex cursor-help items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                          >
                            <Clock3 size={13} />
                            {mediaDuration}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {resource.levels.map((level, index) => (
                        <span
                          key={`${resource.id}-level-${index}`}
                          title="CEFR level"
                          className={`inline-flex cursor-help items-center rounded-full border px-3 py-1 text-xs font-semibold ${getLevelBadge(
                            level,
                          )}`}
                        >
                          {level}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {resource.skills.map((skill, index) => (
                        <span
                          key={`${resource.id}-skill-${index}`}
                          title="Language skill"
                          className={`inline-flex cursor-help items-center rounded-full px-2.5 py-1 text-xs font-medium ${getSkillBadge()}`}
                        >
                          {getSkillLabel(skill)}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span
                      title="Publication status"
                      className={`inline-flex cursor-help items-center justify-center rounded-full px-3 py-1 text-sm font-medium ${getStatusBadge(
                        resource.status,
                      )}`}
                    >
                      {toDisplayLabel(resource.status)}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      title="Open quick actions"
                      className="menu-button rounded-xl p-2 text-slate-400 transition-colors hover:cursor-pointer hover:bg-rose-50 hover:text-[#9e2727]"
                    >
                      <MoreVertical size={20} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
