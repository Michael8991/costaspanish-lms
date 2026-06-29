import { CourseTemplateDetailDTO } from "@/lib/dto/course-template.dto";
import { Archive, CopyPlus, Pencil } from "lucide-react";
import Link from "next/link";

interface courseTemplateDetailsProps {
  courseTemplate: CourseTemplateDetailDTO;
  locale: string;
}

export default function CourseTemplateDetailView({
  courseTemplate,
  locale,
}: courseTemplateDetailsProps) {
  return (
    <div className="mt-6 grid gap-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
        <span>Acciones</span>
        <div className="flex items-center justify-center gap-2">
          <Link
            className="flex items-center justify-center gap-2 border border-gray-200 rounded-lg px-4 py-2 hover:bg-green-100 hover:border-green-100 transition-colors duration-150 ease-in-out"
            href={`/${locale}/dashboard/courses/templates/${courseTemplate.id}/edit`}
          >
            <Pencil size={14} />
            Editar
          </Link>
          <Link
            className="flex items-center justify-center gap-2 border border-gray-200 rounded-lg px-4 py-2 hover:bg-green-100 hover:border-green-100 transition-colors duration-150 ease-in-out"
            href={`#`}
          >
            <CopyPlus size={14} />
            Usar
          </Link>
          <button className="cursor-pointer flex items-center justify-center gap-2 border border-gray-200 rounded-lg px-4 py-2 hover:bg-yellow-100 hover:border-yellow-100 transition-colors duration-150 ease-in-out">
            <Archive size={14} />
            Archivar
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-widest text-slate-400">
          Template code
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          {courseTemplate.internalName}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{courseTemplate.code}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">
          Pedagogical information
        </h3>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p className="text-sm text-slate-600">
            Level: {courseTemplate.pedagogicalMeta.level}
          </p>
          <p className="text-sm text-slate-600">
            Category: {courseTemplate.pedagogicalMeta.category}
          </p>
          <p className="text-sm text-slate-600">
            Target audience: {courseTemplate.pedagogicalMeta.targetAudience}
          </p>
          <p className="text-sm text-slate-600">
            Duration: {courseTemplate.pedagogicalMeta.estimatedDurationLabel}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Storefront</h3>

        <div className="mt-4 space-y-2">
          <p className="text-sm text-slate-600">
            Published: {courseTemplate.storefront.isPublished ? "Yes" : "No"}
          </p>
          <p className="text-sm text-slate-600">
            Public title: {courseTemplate.storefront.publicTitle}
          </p>
          <p className="text-sm text-slate-600">
            Description: {courseTemplate.storefront.shortDescription}
          </p>
          <p className="text-sm text-slate-600">
            Price mode: {courseTemplate.storefront.priceMode}
          </p>
        </div>
      </section>
    </div>
  );
}
