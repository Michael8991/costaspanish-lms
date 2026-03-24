// TODO: Se puede agregar dentro de las quickoptions el cambio de estado al normal y tmb un boton para eliminar definitivamente de la base de datos de firebase para que no ocupe lugar?
"use client";

import {
  Archive,
  ArchiveRestore,
  Clock3,
  Eye,
  EyeOff,
  File,
  FileInput,
  FileQuestion,
  FileText,
  Headphones,
  ImageIcon,
  Link as LucideLink,
  MoreVertical,
  SquarePen,
  Trash2,
  Video,
  type LucideIcon,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import Image from "next/image";

import { ResourceDetailDTO, ResourceListItemDTO } from "@/lib/dto/resource.dto";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import CustomModal from "@/components/ui/CustomModal";
import ArchiveResourceForm, {
  ArchiveResourceFormData,
} from "./ArchiveResourceForm";
import { toast } from "sonner";
import { CircleAlert } from "lucide-react";
import { MOCK_UPCOMING_CLASSES } from "@/lib/mocks/lessons.mock"; //!Mock de clases
import AddResourceToLessonForm from "./AddResourceToLessonForm";
import {
  FormatType,
  ResourceVisibility,
} from "@/lib/constants/resource.constants";
import { deleteObject, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { mutate } from "swr";
import DeleteResourceForm from "./DeleteResourceForm";

interface ResourcesGridViewProps {
  resources: ResourceListItemDTO[];
  locale: string;
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

const getFileTypeBadge = (format: FormatType | string) => {
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

export default function ResourcesGridView({
  resources,
  locale,
}: ResourcesGridViewProps) {
  const withLocale = (path: string) =>
    `/${locale}${path.startsWith("/") ? path : `/${path}`}`;

  const [isOpenQO, setIsOpenQO] = useState<string | null>(null);
  const [archivingResource, setArchivingResource] = useState<string | null>(
    null,
  );

  const [resourceToArchive, setResourceToArchive] = useState<string | null>(
    null,
  );
  const [resourceToArchiveName, setResourceToArchiveName] = useState<
    string | null
  >(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isSubmittingArchiveResource, setIsSubmittingArchiveResource] =
    useState(false);
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [isSubmittingAddResource, setIsSubmittingAddResource] = useState(false);
  const [isDeleteResourceModalOpen, setIsDeleteResourceModalOpen] =
    useState(false);
  const [isDelettingResource, setIsDelettingResource] = useState(false);

  const [isSubmittingReactivateResource, setIsSubmittingReactivateResource] =
    useState(false);

  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const toggleQuickOptionsMenu = (
    resourceId: string,
    event: React.MouseEvent<HTMLButtonElement>,
    resourceTitle: string,
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
      setResourceToArchive(resourceId);
      setResourceToArchiveName(resourceTitle);
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

  if (!resources || resources.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No resources found.
      </div>
    );
  }

  const handleActionClick = (
    action: ResourceMenuAction,
    resourceId: string | null,
  ) => {
    if (action === "ARCHIVE") {
      setArchivingResource(resourceId);
      setIsArchiveModalOpen(true);
      setMenuPosition(null);
    } else if (action === "ADD_TO_CLASS") {
      setArchivingResource(resourceId);
      setIsAddResourceModalOpen(true);
      setMenuPosition(null);
    }
  };

  const handleAddResource = async (
    resourceId: string | null,
    lessonId: string,
  ) => {
    console.log("Hola!"); //!Subida
  };

  const handleArchiveResource = async (
    resourceId: string | null,
    formData: ArchiveResourceFormData,
  ) => {
    setIsSubmittingArchiveResource(true);
    try {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "archived",
          visibility: "private",
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData || "Error al archivar el recurso.");
      }
      toast.success("Recurso archivado con exito.");
      mutate("/api/resources");
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
      else toast.error("Ocurrió un error inesperado al archivar el recurso.");
    } finally {
      setIsSubmittingArchiveResource(false);
      setIsArchiveModalOpen(false);
    }
  };

  const handleReactivateResource = async (resourceId: string | null) => {
    setIsSubmittingReactivateResource(true);
    try {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "draft",
          visibility: "private",
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al reactivar el recurso.");
      }
      toast.success("Recurso reactivado con éxito.");
      mutate("/api/resources");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || "Ocurrió un error inesperado.");
      } else {
        toast.error("Error al reactivar el recurso.");
      }
    } finally {
      setIsSubmittingReactivateResource(false);
    }
  };

  const handlePermanentDelete = async (resourceId: string | null) => {
    if (!resourceId) return;

    const resource = resources.find((r) => r.id === resourceId);

    if (!resource) {
      toast.error("No se encontró el recurso en la memoria.");
      return;
    }
    setIsDelettingResource(true);
    try {
      if (resource.asset.storagePath) {
        const fileRef = ref(storage, resource.asset.storagePath);
        await deleteObject(fileRef).catch((err) =>
          console.warn("El archivo ya no existía en Firebase o falló:", err),
        );
      }

      if (resource.asset.thumbnailStoragePath) {
        const thumbRef = ref(storage, resource.asset.thumbnailStoragePath);
        await deleteObject(thumbRef).catch((err) =>
          console.warn("La miniatura ya no existía en Firebase o falló:", err),
        );
      }

      const res = await fetch(`/api/resources/${resource.id}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));

        console.error("ERROR:", errorData);

        toast.error(
          `Error BD: ${JSON.stringify(errorData.error || errorData)}`,
        );

        throw new Error("Abortando operación por error del servidor");
      }

      toast.success("Recurso y archivos eliminados definitivamente.");
      mutate("/api/resources");
    } catch (error) {
      toast.error("Ocurrió un error al eliminar el recurso.");
      console.error(error);
    } finally {
      setIsDelettingResource(false);
    }
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 p-5"
      >
        {resources.map((resource) => {
          const isArchived = resource.status === "archived";
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
            <motion.article
              key={resource.id}
              variants={itemVariants}
              className={`group overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 ${
                isArchived
                  ? "bg-slate-50/80 opacity-70 grayscale-20 border-slate-200"
                  : "bg-white border-slate-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70"
              }`}
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
                    {!isArchived ? (
                      <button
                        type="button"
                        title="Open quick actions"
                        onClick={(e) =>
                          toggleQuickOptionsMenu(resource.id, e, resource.title)
                        }
                        className="cursor-pointer shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#9e2727]"
                      >
                        <MoreVertical size={18} />
                      </button>
                    ) : (
                      ""
                    )}
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
                {isArchived && (
                  <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                    <p className="text-xs text-red-500 flex items-center gap-1.5">
                      <CircleAlert size={12} />
                      Este recurso se eliminará pronto
                    </p>
                    <div className="flex gap-2">
                      {/* Reactivar — recupera si el archivo aún existe en storage */}
                      <button
                        type="button"
                        onClick={() => {
                          handleReactivateResource(resource.id);
                        }}
                        className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-all hover:bg-emerald-100"
                      >
                        <ArchiveRestore size={12} />
                        Reactivar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setResourceToArchive(resource.id);
                          setResourceToArchiveName(resource.title);
                          setIsDeleteResourceModalOpen(true);
                        }}
                        className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-100"
                      >
                        <Trash2 size={12} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.article>
          );
        })}
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
                    onClick={() =>
                      handleActionClick(option.action!, resourceToArchive)
                    }
                    className="cursor-pointer flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white transition-all hover:bg-white/10"
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
      <CustomModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Archivar material"
      >
        <div className="p-4">
          <ArchiveResourceForm
            resource={resourceToArchive}
            resourceName={resourceToArchiveName}
            onSubmitForm={handleArchiveResource}
            isSubmitting={isSubmittingArchiveResource}
            onClose={() => setIsArchiveModalOpen(false)}
          />
        </div>
      </CustomModal>
      <CustomModal
        isOpen={isAddResourceModalOpen}
        onClose={() => setIsAddResourceModalOpen(false)}
        title="Proximas clases"
        maxWidth="5xl"
      >
        <div className="p-4">
          <AddResourceToLessonForm
            resource={resourceToArchive}
            resourceName={resourceToArchiveName}
            lessons={MOCK_UPCOMING_CLASSES}
            onSubmitForm={handleAddResource}
            isSubmitting={isSubmittingAddResource}
            onClose={() => setIsAddResourceModalOpen(false)}
          />
        </div>
      </CustomModal>
      <CustomModal
        isOpen={isDeleteResourceModalOpen}
        onClose={() => setIsDeleteResourceModalOpen(false)}
        title="Eliminar recurso"
      >
        <div className="p-4">
          <DeleteResourceForm
            resource={resourceToArchive}
            resourceName={resourceToArchiveName}
            onSubmitForm={handlePermanentDelete}
            isSubmitting={isDelettingResource}
            onClose={() => setIsDeleteResourceModalOpen(false)}
          />
        </div>
      </CustomModal>
    </>
  );
}
