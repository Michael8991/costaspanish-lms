import Breadcrumbs from "@/components/ui/Breadcrumbs";
import {
  toResourceDetailDTO,
  type ResourceDetailDTO,
} from "@/lib/dto/resource.dto";
import dbConnect from "@/lib/mongo";
import { Resource } from "@/models/ResourceProfile";
import { Types } from "mongoose";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock3,
  Eye,
  FileInput,
  FilePlus,
  FileText,
  Globe,
  Headphones,
  ImageIcon,
  Layers3,
  Link as LinkIcon,
  Pencil,
  ShieldCheck,
  Tag,
  Trash2,
  Video,
} from "lucide-react";

const toDisplayLabel = (value: string) => {
  if (!value) return "";
  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDate = (iso: string, locale: string) => {
  try {
    return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const formatBytes = (bytes?: number) => {
  if (typeof bytes !== "number") return "—";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "—";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
};

const getStatusClasses = (status: string) => {
  switch (status) {
    case "published":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "draft":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "archived":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
    case "deleted":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
};

const getVisibilityClasses = (visibility: string) => {
  switch (visibility) {
    case "shared":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
    case "private":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
};

const formatMetaMap = {
  pdf: {
    label: "PDF",
    icon: FileText,
    classes: "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
  image: {
    label: "Image",
    icon: ImageIcon,
    classes: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200",
  },
  audio: {
    label: "Audio",
    icon: Headphones,
    classes: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  },
  video: {
    label: "Video",
    icon: Video,
    classes: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  },
  external_link: {
    label: "External Link",
    icon: LinkIcon,
    classes: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  },
} as const;

function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs  ${className}`}
    >
      {children}
    </span>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-xl bg-slate-100 p-2">
          <Icon className="h-4 w-4 text-slate-700" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function TagGroup({
  title,
  items,
  emptyLabel = "—",
}: {
  title: string;
  items?: string[];
  emptyLabel?: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      {items && items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={`${title}-${item}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {toDisplayLabel(item)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      )}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">
        {value}
      </span>
    </div>
  );
}

function ResourcePreview({ resource }: { resource: ResourceDetailDTO }) {
  const openHref =
    resource.asset.format === "external_link"
      ? resource.asset.externalUrl
      : resource.storage.fileUrl;

  if (resource.asset.format === "external_link") {
    let host = "";
    try {
      host = resource.asset.externalUrl
        ? new URL(resource.asset.externalUrl).hostname
        : "";
    } catch {
      host = "";
    }

    return (
      <div className="overflow-hidden rounded-3xl border border-orange-200 bg-linear-to-br from-orange-50 to-white p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-200">
              <Globe className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-orange-700">
                External resource
              </p>
              <h3 className="text-xl font-semibold text-slate-900">
                {resource.title}
              </h3>
              <p className="mt-2 break-all text-sm text-slate-600">
                {resource.asset.externalUrl || "No external URL available"}
              </p>
              {host ? (
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                  {host}
                </p>
              ) : null}
            </div>
          </div>

          {openHref ? (
            <Link
              href={openHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Eye className="h-4 w-4" />
              Open link
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  if (resource.asset.format === "pdf" || resource.asset.format === "image") {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="relative aspect-[16/9] w-full bg-slate-100">
          {resource.asset.thumbnailUrl ? (
            <img
              src={resource.asset.thumbnailUrl}
              alt={resource.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              {resource.asset.format === "pdf" ? (
                <FileText className="h-16 w-16 text-slate-300" />
              ) : (
                <ImageIcon className="h-16 w-16 text-slate-300" />
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">
              {resource.asset.originalFilename || "Untitled file"}
            </p>
            <p className="text-sm text-slate-500">
              {resource.asset.format === "pdf"
                ? `${resource.asset.pageCount ?? "—"} pages`
                : resource.asset.mimeType || "Image file"}
            </p>
          </div>

          {resource.storage.fileUrl ? (
            <Link
              href={resource.storage.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Eye className="h-4 w-4" />
              {resource.asset.format === "pdf" ? "Open PDF" : "Open image"}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  if (resource.asset.format === "audio" || resource.asset.format === "video") {
    const MediaIcon = resource.asset.format === "audio" ? Headphones : Video;

    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-8">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <MediaIcon className="h-8 w-8 text-slate-700" />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-500">
                {resource.asset.format === "audio"
                  ? "Audio track"
                  : "Video clip"}
              </p>
              <h3 className="text-xl font-semibold text-slate-900">
                {resource.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Duration: {formatDuration(resource.asset.durationSeconds)}
              </p>
            </div>
          </div>

          {resource.storage.fileUrl ? (
            <Link
              href={resource.storage.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Eye className="h-4 w-4" />
              Open {resource.asset.format}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
      Preview not available for this resource.
    </div>
  );
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  await dbConnect();
  const rawResource = await Resource.findById(id).lean();

  if (!rawResource) {
    notFound();
  }

  const resource = toResourceDetailDTO(rawResource);

  const breadcrumbItems = [
    { label: "Resources", href: `/${locale}/dashboard/resources` },
    { label: resource.title },
  ];

  const formatMeta = formatMetaMap[resource.asset.format];
  const FormatIcon = formatMeta.icon;

  const primaryOpenHref =
    resource.asset.format === "external_link"
      ? resource.asset.externalUrl
      : resource.storage.fileUrl;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 text-slate-800 md:px-8">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />

      <div className="mt-6 space-y-6">
        <section className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl mb-4">
                {/* Lo suyo seria poner la primera letra en mayusculas? */}
                {resource.title}
              </h1>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge className={getStatusClasses(resource.status)}>
                  {toDisplayLabel(resource.status)}
                </Badge>

                <Badge className={getVisibilityClasses(resource.visibility)}>
                  {toDisplayLabel(resource.visibility)}
                </Badge>

                <Badge className={formatMeta.classes}>
                  <FormatIcon className="h-3.5 w-3.5" />
                  {formatMeta.label}
                </Badge>

                <Badge className="bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                  {toDisplayLabel(resource.pedagogicalType)}
                </Badge>
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                {resource.description ||
                  "This resource has no description yet."}
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto xl:flex-col">
              <Link
                href={`/${locale}/dashboard/resources/${resource.id}/edit`}
                className="group flex items-center justify-center cursor-pointer gap-1.5 px-3 py-1.5 border rounded-md text-sm font-medium shadow-sm transition-all duration-200 bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50"
              >
                <Pencil className="h-4 w-4" />
                Editar recurso
              </Link>

              {primaryOpenHref ? (
                <Link
                  href={primaryOpenHref}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-center cursor-pointer gap-1.5 px-3 py-1.5 border rounded-md text-sm font-medium shadow-sm transition-all duration-200 bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700 hover:bg-green-50"
                >
                  <Eye className="h-4 w-4" />
                  {resource.asset.format === "external_link"
                    ? "Open link"
                    : "Download / Open"}
                </Link>
              ) : null}

              <button className="group flex items-center justify-center cursor-pointer gap-1.5 px-3 py-1.5 border rounded-md text-sm font-medium shadow-sm transition-all duration-200 bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50">
                <Trash2 size={14} />
                Archivar
              </button>
              <button className="group flex items-center justify-center cursor-pointer gap-1.5 px-3 py-1.5 border rounded-md text-sm font-medium shadow-sm transition-all duration-200 bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-700 hover:bg-orange-50">
                <FileInput size={14} />
                Agregar a una clase
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <SectionCard title="Preview" icon={Layers3}>
              <ResourcePreview resource={resource} />
            </SectionCard>

            <SectionCard title="Pedagogical DNA" icon={BookOpen}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <TagGroup title="CEFR Levels" items={resource.levels} />
                <TagGroup title="Skills" items={resource.skills} />
                <TagGroup title="Lesson Stages" items={resource.lessonStages} />
                <TagGroup
                  title="Delivery Modes"
                  items={resource.deliveryModes}
                />
                <TagGroup
                  title="Grammar Topics"
                  items={resource.grammarTopics}
                />
                <TagGroup
                  title="Vocabulary Topics"
                  items={resource.vocabularyTopics}
                />
              </div>

              <div className="mt-6">
                <TagGroup title="Tags" items={resource.tags} />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium ${
                    resource.hasAnswerKey
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {resource.hasAnswerKey
                    ? "Includes answer key"
                    : "No answer key"}
                </span>

                <span
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium ${
                    resource.requiresTeacherReview
                      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                  }`}
                >
                  <Tag className="h-4 w-4" />
                  {resource.requiresTeacherReview
                    ? "Requires teacher review"
                    : "No teacher review required"}
                </span>

                {resource.estimatedDurationMinutes ? (
                  <span className="inline-flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 ring-1 ring-sky-200">
                    <Clock3 className="h-4 w-4" />
                    {resource.estimatedDurationMinutes} min estimated
                  </span>
                ) : null}

                {typeof resource.difficulty === "number" ? (
                  <span className="inline-flex items-center gap-2 rounded-2xl bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 ring-1 ring-violet-200">
                    <BarChart3 className="h-4 w-4" />
                    Difficulty {resource.difficulty}/5
                  </span>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <aside className="xl:col-span-1">
            <div className="xl:sticky xl:top-6">
              <SectionCard title="Technical metadata" icon={BarChart3}>
                <MetaRow
                  label="Created"
                  value={formatDate(resource.createdAt, locale)}
                />
                <MetaRow
                  label="Last update"
                  value={formatDate(resource.updatedAt, locale)}
                />
                <MetaRow
                  label="Times used"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-slate-400" />
                      {resource.timesUsed}
                    </span>
                  }
                />
                <MetaRow
                  label="File size"
                  value={formatBytes(resource.storage.fileSizeBytes)}
                />
                <MetaRow
                  label="Pages"
                  value={resource.asset.pageCount ?? "—"}
                />
                <MetaRow
                  label="Duration"
                  value={formatDuration(resource.asset.durationSeconds)}
                />
                <MetaRow
                  label="MIME type"
                  value={resource.asset.mimeType || "—"}
                />
                <MetaRow
                  label="Original filename"
                  value={resource.asset.originalFilename || "—"}
                />
                <MetaRow
                  label="Storage path"
                  value={
                    <span className="max-w-[220px] break-all text-xs text-slate-500">
                      {resource.storage.storagePath || "—"}
                    </span>
                  }
                />
              </SectionCard>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    Quick reading
                  </h3>
                </div>

                <p className="text-sm leading-6 text-slate-600">
                  This panel keeps the teaching value visible on the left and
                  the operational data on the right, so the teacher can decide
                  fast whether the resource fits a lesson without drowning in
                  technical details.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
