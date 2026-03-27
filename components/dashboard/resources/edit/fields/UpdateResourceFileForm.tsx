import { FormatType } from "@/lib/constants/resource.constants";
import { cn } from "@/lib/utils/form-helpers";
import {
  ExternalLink,
  FileAudio,
  FileImage,
  FileText,
  Film,
} from "lucide-react";

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}

const FORMAT_CARDS: Array<{
  value: FormatType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: "pdf",
    title: "PDF",
    description: "Worksheets, readings, grammar sheets o fichas imprimibles.",
    icon: FileText,
  },
  {
    value: "image",
    title: "Imagen",
    description: "Flashcards, infografías, pósters visuales o capturas.",
    icon: FileImage,
  },
  {
    value: "audio",
    title: "Audio",
    description: "Listening tracks, dictados o pronunciación.",
    icon: FileAudio,
  },
  {
    value: "video",
    title: "Vídeo",
    description: "Video clips, explicaciones o tareas audiovisuales.",
    icon: Film,
  },
  {
    value: "external_link",
    title: "Enlace externo",
    description: "YouTube, Drive, article, app o recurso alojado fuera.",
    icon: ExternalLink,
  },
];

export default function UpdateResourceFileForm() {
  const handleFormatSelection = (format: FormatType) => {
    setValue("format", format, { shouldValidate: true, shouldDirty: true });
    if (step === 1) setStep(2);
  };
  return (
    <>
      <section className="space-y-6">
        <SectionHeader
          title="¿Qué tipo de material quieres añadir?"
          description="Selecciona el formato principal. El siguiente paso cambia automáticamente según la elección."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {FORMAT_CARDS.map((card) => {
            const Icon = card.icon;
            const selected = values.format === card.value;

            return (
              <button
                key={card.value}
                type="button"
                onClick={() => handleFormatSelection(card.value)}
                className={cn(
                  "group rounded-3xl border p-5 text-left transition-all",
                  "hover:-translate-y-0.5 hover:shadow-lg",
                  selected
                    ? "border-[#9e2727] bg-red-50 ring-2 ring-red-100"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div
                    className={cn(
                      "inline-flex rounded-2xl p-3",
                      selected
                        ? "bg-[#9e2727] text-white"
                        : "bg-slate-100 text-slate-700",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {selected && (
                    <span className="rounded-full bg-[#9e2727] px-2.5 py-1 text-xs font-medium text-white">
                      Seleccionado
                    </span>
                  )}
                </div>

                <div className="mb-1 text-base font-semibold text-slate-900">
                  {card.title}
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {card.description}
                </p>
              </button>
            );
          })}
        </div>

        <FieldError error={errors.format?.message} />
      </section>
    </>
  );
}
