import type { CourseTemplateDetailDTO } from "@/lib/dto/course-template.dto";

interface CourseTemplatePedagogicalSummaryProps {
  template: CourseTemplateDetailDTO;
}

export default function CourseTemplatePedagogicalSummary({
  template,
}: CourseTemplatePedagogicalSummaryProps) {
  const meta = template.pedagogicalMeta;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Datos pedagógicos
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          La orientación académica que mantiene coherente esta guía
          reutilizable.
        </p>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Nivel
          </dt>
          <dd className="mt-1 text-sm text-slate-700">{meta.level}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Categoría
          </dt>
          <dd className="mt-1 text-sm text-slate-700">{meta.category}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Duración estimada
          </dt>
          <dd className="mt-1 text-sm text-slate-700">
            {meta.estimatedDurationLabel || "Sin estimación"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Metodología
          </dt>
          <dd className="mt-1 text-sm text-slate-700">
            {meta.methodology || "Sin metodología indicada"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Público objetivo
          </dt>
          <dd className="mt-1 text-sm text-slate-700">
            {meta.targetAudience || "Sin público objetivo indicado"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Objetivos
        </h3>
        {meta.objectives.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {meta.objectives.map((objective, index) => (
              <li
                key={`${objective}-${index}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
              >
                {objective}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Todavía no hay objetivos pedagógicos.
          </p>
        )}
      </div>
    </section>
  );
}
