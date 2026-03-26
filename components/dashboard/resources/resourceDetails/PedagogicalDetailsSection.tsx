import { ResourceDetailDTO } from "@/lib/dto/resource.dto";
import { BarChart3, BookOpen, Clock3, ShieldCheck, Tag } from "lucide-react";

interface pedagogicalDetailsProps {
  resource: ResourceDetailDTO;
  locale: string;
}

const toDisplayLabel = (value: string) => {
  if (!value) return "";

  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

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
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </p>
      {items && items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={`${title}-${item}`}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
            >
              {toDisplayLabel(item)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-300">{emptyLabel}</p>
      )}
    </div>
  );
}

export const PedagogicalDetailsSection = ({
  resource,
}: pedagogicalDetailsProps) => {
  return (
    <section className="col-span-3 border rounded-lg border-slate-100 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-6 py-4">
        <BookOpen className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-medium text-slate-700">
          Información pedagógica
        </h2>
      </div>

      <div className="px-6 py-5 flex flex-col gap-6">
        {/* Grid de tags */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <TagGroup title="CEFR Levels" items={resource.levels} />
          <TagGroup title="Skills" items={resource.skills} />
          <TagGroup title="Lesson Stages" items={resource.lessonStages} />
          <TagGroup title="Delivery Modes" items={resource.deliveryModes} />
          <TagGroup title="Grammar Topics" items={resource.grammarTopics} />
          <TagGroup
            title="Vocabulary Topics"
            items={resource.vocabularyTopics}
          />
        </div>

        {/* Tags — ocupa todo el ancho */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="pt-1 border-t border-slate-100">
            <TagGroup title="Tags" items={resource.tags} />
          </div>
        )}

        {/* Indicadores — fila de pills */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              resource.hasAnswerKey
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-slate-50 text-slate-400 ring-1 ring-slate-200"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {resource.hasAnswerKey ? "Includes answer key" : "No answer key"}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              resource.requiresTeacherReview
                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                : "bg-slate-50 text-slate-400 ring-1 ring-slate-200"
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            {resource.requiresTeacherReview
              ? "Requires teacher review"
              : "No teacher review"}
          </span>

          {resource.estimatedDurationMinutes ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              <Clock3 className="h-3.5 w-3.5" />
              {resource.estimatedDurationMinutes} min estimated
            </span>
          ) : null}

          {typeof resource.difficulty === "number" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              <BarChart3 className="h-3.5 w-3.5" />
              Difficulty {resource.difficulty}/5
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
};
