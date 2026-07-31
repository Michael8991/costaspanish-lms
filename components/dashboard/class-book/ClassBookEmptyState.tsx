import { CalendarX2 } from "lucide-react";

export default function ClassBookEmptyState({
  hasCourseFilter,
}: {
  hasCourseFilter: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500">
        <CalendarX2 size={23} />
      </span>
      <h2 className="mt-4 text-base font-semibold text-slate-900">
        {hasCourseFilter
          ? "No hay clases para este curso en el mes seleccionado."
          : "No hay clases en este mes"}
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Cuando haya clases planificadas o completadas, aparecerán aquí.
      </p>
    </div>
  );
}
