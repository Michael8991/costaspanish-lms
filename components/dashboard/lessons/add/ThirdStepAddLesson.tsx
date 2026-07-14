"use client";

import { AddLessonFormValues } from "@/app/[locale]/dashboard/lessons/add/AddLessonWizard";
import { useFormContext } from "react-hook-form";
import { CalendarDays, Clock, Layers, UserCheck } from "lucide-react";

export default function ThirdStepAddLesson() {
  const { watch } = useFormContext<AddLessonFormValues>();

  const values = watch();

  const blocks = values.blocks ?? [];

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          Revisión rápida
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Comprueba los datos principales antes de guardar la lección.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ReviewCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Título"
          value={values.title || "Sin título"}
        />

        <ReviewCard
          icon={<UserCheck className="h-4 w-4" />}
          label="Tipo de clase"
          value={formatLabel(values.classType)}
        />

        <ReviewCard
          icon={<Clock className="h-4 w-4" />}
          label="Inicio"
          value={formatDateTime(values.scheduledStart)}
        />

        <ReviewCard
          icon={<Clock className="h-4 w-4" />}
          label="Fin"
          value={formatDateTime(values.scheduledEnd)}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#9e2727]/10 text-[#9e2727]">
            <Layers className="h-4 w-4" />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              Bloques de la lección
            </h4>
            <p className="text-xs text-gray-500">
              {blocks.length} bloque{blocks.length === 1 ? "" : "s"} preparado
              {blocks.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>

        {blocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
            No has añadido bloques todavía. Puedes guardar la lección
            igualmente, pero lo ideal es preparar al menos un bloque.
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((block, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Bloque #{index + 1}: {block.title || "Sin título"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatLabel(block.type)}
                      {block.estimatedMinutes
                        ? ` · ${block.estimatedMinutes} min`
                        : ""}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                    {block.resources?.length ?? 0} recurso
                    {(block.resources?.length ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>

                <p className="line-clamp-3 text-sm text-gray-600">
                  {block.plannedContent || "Sin contenido planificado"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <h4 className="text-sm font-semibold text-gray-900">
          Detalles adicionales
        </h4>

        <div className="mt-3 space-y-2 text-sm">
          <ReviewTextRow
            label="Clase de prueba"
            value={values.isTrial ? "Sí" : "No"}
          />

          <ReviewTextRow
            label="Zona horaria"
            value={values.timezone || "Europe/Madrid"}
          />

          <ReviewTextRow
            label="Notas de preparación"
            value={values.preparationNotes || "Sin notas"}
          />

          <ReviewTextRow
            label="Deberes"
            value={values.homeworkAssigned || "Sin deberes asignados"}
          />

          <ReviewTextRow
            label="Próximo enfoque"
            value={values.nextLessonFocus || "Sin próximo enfoque"}
          />
        </div>
      </div>
    </section>
  );
}

function ReviewCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-[#9e2727]">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function ReviewTextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-200 pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Fecha inválida";

  return date.toLocaleString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLabel(value?: string) {
  if (!value) return "Sin definir";

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
