"use client";

import {
  Eye,
  EyeOff,
  FileQuestion,
  FileText,
  Headphones,
  ImageIcon,
  Video,
  LucideIcon,
  Link as LucideLink,
  Clock3,
  MoreVertical,
  SquarePen,
  Archive,
  FileInput,
  File,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";

import { ResourceListItemDTO } from "../../../lib/dto/resource.dto";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";

type ResourceMenuAction = "ARCHIVE" | "ADD_TO_CLASS";

type QuickOptionsMenu = {
  label: string;
  href?: (id: string) => string;
  action?: ResourceMenuAction;
  icon: LucideIcon;
};
const quickOptionsMenu: QuickOptionsMenu[] = [
  {
    label: "Detalles del material",
    href: (id) => `/dashboard/resources/${id}`,
    icon: File,
  },
  {
    label: "Editar material",
    href: (id) => `/dashboard/resources/edit/${id}/`,
    icon: SquarePen,
  },
  {
    label: "Archivar",
    action: "ARCHIVE",
    icon: Archive,
  },
  {
    label: "Agregar a una clase",
    action: "ADD_TO_CLASS",
    icon: FileInput,
  },
];

interface ResourcesRowProps {
  resources: ResourceListItemDTO[];
  locale: string;
}

export const listContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.03,
      staggerChildren: 0.04,
    },
  },
};

export const listRowVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    filter: "blur(3px)",
  },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.22,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

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

export default function ResourceTableView({
  resources,
  locale,
}: ResourcesRowProps) {
  const withLocale = (path: string) =>
    `/${locale}${path.startsWith("/") ? path : `/${path}`}`;

  const [isOpenQO, setIsOpenQO] = useState<string | null>(null);
  const [archivingResource, setArchivingResource] = useState<string | null>(
    null,
  );

  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const toggleQuickOptionsMenu = (
    resourceId: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (isOpenQO === resourceId) {
      setIsOpenQO(null);
      setMenuPosition(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const menuHeight = 260;
      const menuWidth = 220;
      const spaceBelow = window.innerHeight - rect.bottom;

      setMenuPosition({
        top:
          spaceBelow > menuHeight ? rect.bottom + 4 : rect.top - menuHeight - 4,
        left: rect.right - menuWidth,
      });
      setIsOpenQO(resourceId);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        !target.closest(".menu-button") &&
        !target.closest(".menu-dropdown")
      ) {
        setIsOpenQO(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  if (!resources || resources.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No resources found.
      </div>
    );
  }

  const handleActionClick = (
    action: ResourceMenuAction,
    resourceId: string,
  ) => {
    if (action === "ARCHIVE") {
      setArchivingResource(resourceId);
    } else if (action === "ADD_TO_CLASS") {
      // setAddingToClassResource(resourceId); //TODO: Abre el modal de clases podemos ahcer el modal pero faltaria las conexiones reales para cuando esten las lessons
    }
  };

  return (
    <>
      <motion.div
        variants={listContainerVariants}
        initial="hidden"
        animate="show"
        className="overflow-x-auto"
      >
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
                resource.asset.format === "audio" ||
                resource.asset.format === "video"
                  ? formatDuration(resource.asset.durationSeconds)
                  : null;

              return (
                <motion.tr
                  key={resource.id}
                  variants={listRowVariants}
                  className="group transition-colors hover:bg-slate-50/70"
                >
                  <td className="min-w-90 px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <p
                        title="Resource title"
                        className="text-[15px] font-semibold leading-6 text-slate-900"
                      >
                        {resource.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          title="File format"
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${formatColor}`}
                        >
                          <FormatIcon size={13} />
                          {formatLabel}
                        </span>

                        {mediaDuration && (
                          <span
                            title="Media duration"
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                          >
                            <Clock3 size={13} />
                            {mediaDuration}
                          </span>
                        )}

                        <span
                          title="Pedagogical type"
                          className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                        >
                          {getPedagogicalTypeLabel(resource.pedagogicalType)}
                        </span>

                        <span
                          title="Visibility"
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${visibilityClassName}`}
                        >
                          <VisibilityIcon size={13} />
                          {visibilityLabel}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {(resource.levels ?? []).map((level, index) => (
                        <span
                          key={`${resource.id}-level-${index}`}
                          title="CEFR level"
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getLevelBadge(
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
                      {(resource.skills ?? []).map((skill, index) => (
                        <span
                          key={`${resource.id}-skill-${index}`}
                          title="Language skill"
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getSkillBadge()}`}
                        >
                          {getSkillLabel(skill)}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span
                      title="Publication status"
                      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-medium ${getStatusBadge(
                        resource.status,
                      )}`}
                    >
                      {toDisplayLabel(resource.status)}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      title="Open quick actions"
                      onClick={(e) => toggleQuickOptionsMenu(resource.id, e)}
                      className="cursor-pointer menu-button rounded-xl p-2 text-slate-400 transition-colors hover:cursor-pointer hover:bg-rose-50 hover:text-[#9e2727]"
                    >
                      <MoreVertical size={20} />
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>
      {isOpenQO &&
        menuPosition &&
        createPortal(
          <div
            className="menu-dropdown fixed z-9999 py-3 px-2 min-w-55 flex flex-col rounded-xl bg-[#9e2727] gap-1 shadow-2xl"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {quickOptionsMenu.map((option, index) => {
              const Icon = option.icon;

              if (option.href) {
                return (
                  <Link
                    key={index}
                    href={withLocale(option.href(isOpenQO))}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white transition-all hover:bg-white/10"
                  >
                    <Icon size={16} />
                    <span>{option.label}</span>
                  </Link>
                );
              }

              if (option.action) {
                return (
                  <button
                    key={index}
                    onClick={() => handleActionClick(option.action!, isOpenQO)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white transition-all hover:bg-white/10"
                  >
                    <Icon size={16} />
                    <span>{option.label}</span>
                  </button>
                );
              }

              return null;
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
