import { ResourceDetailDTO } from "@/lib/dto/resource.dto";
import { BarChart3 } from "lucide-react";

interface TechnicalMetadataProps {
  locale: string;
  resource: ResourceDetailDTO;
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
    <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm col-span-4">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-lg bg-slate-100 p-2 shadow-xs">
          <Icon className="h-4 w-4 text-slate-700" />
        </div>
        <h2 className="text-lg font-medium text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
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

export const TechnicalMetadataSection = ({
  resource,
  locale,
}: TechnicalMetadataProps) => {
  return (
    <>
      <SectionCard title="Metadatos" icon={BarChart3}>
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
        {/* //TODO: agregar diferencias entre formatos para ver duracion paginas etc */}
        {/* {resource.format === "pdf" ? (
        ) : () } */}
        <MetaRow label="Pages" value={resource.asset.pageCount ?? "—"} />
      </SectionCard>
    </>
  );
};
