import { FORMAT_CARDS } from "@/components/ui/addResourcesForm/FormatSelectorCards";
import { SectionHeader } from "@/components/ui/addResourcesForm/FormSectionWrappers";
import { cn } from "@/lib/utils/form-helpers";

export default function AddResourceFirstStep() {
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
