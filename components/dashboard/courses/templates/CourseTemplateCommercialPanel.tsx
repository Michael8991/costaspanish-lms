import { ChevronDown, Store } from "lucide-react";

import type { CourseTemplateDetailDTO } from "@/lib/dto/course-template.dto";
import { getCourseTemplatePriceModeLabel } from "@/lib/utils/course-template-visuals";

interface CourseTemplateCommercialPanelProps {
  template: CourseTemplateDetailDTO;
}

export default function CourseTemplateCommercialPanel({
  template,
}: CourseTemplateCommercialPanelProps) {
  const storefront = template.storefront;

  return (
    <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
            <Store className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Publicación comercial
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Campos opcionales para mostrar este curso en la web pública.
            </p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>

      <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Título público
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {storefront.publicTitle || "Sin título público"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Publicada
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {storefront.isPublished ? "Sí" : "No"}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Descripción
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {storefront.shortDescription || "Sin descripción comercial"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Modalidad de precio
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {getCourseTemplatePriceModeLabel(storefront.priceMode)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Opciones de precio
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {storefront.priceOptions.length}
          </p>
        </div>
        {(storefront.seoTitle || storefront.seoDescription) && (
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              SEO
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {storefront.seoTitle || "Sin título SEO"}
            </p>
            {storefront.seoDescription && (
              <p className="mt-1 text-xs text-slate-500">
                {storefront.seoDescription}
              </p>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
