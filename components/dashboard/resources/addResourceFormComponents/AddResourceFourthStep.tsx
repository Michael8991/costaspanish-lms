import {
  FormField,
  inputClass,
  ReviewRow,
  ReviewTags,
  SectionHeader,
} from "@/components/ui/addResourcesForm/FormSectionWrappers";
import {
  RESOURCE_STATUS,
  RESOURCE_VISIBILITY,
} from "@/lib/constants/resource.constants";
import {
  normalizeLooseStringArray,
  toDisplayLabel,
} from "@/lib/utils/form-helpers";
import { createResourceSchema } from "@/lib/validators/resource";
import { useFormContext } from "react-hook-form";
import z from "zod";

export default function AddResourceFourthStep() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<z.input<typeof createResourceSchema>>();

  const values = watch();

  return (
    <div>
      <section className="space-y-8">
        <SectionHeader
          title="Revisión y publicación"
          description="Último repaso antes de guardar el recurso."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Estado" error={errors.status?.message}>
            <select {...register("status")} className={inputClass(false)}>
              {RESOURCE_STATUS.map((status) => (
                <option key={status} value={status}>
                  {toDisplayLabel(status)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Visibilidad" error={errors.visibility?.message}>
            <select {...register("visibility")} className={inputClass(false)}>
              {RESOURCE_VISIBILITY.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {toDisplayLabel(visibility)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 text-base font-semibold text-slate-900">
            Resumen del recurso
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ReviewRow label="Título" value={values.title || "—"} />
            <ReviewRow
              label="Formato"
              value={values.format ? toDisplayLabel(values.format) : "—"}
            />
            <ReviewRow
              label="Tipo pedagógico"
              value={
                values.pedagogicalType
                  ? toDisplayLabel(values.pedagogicalType)
                  : "—"
              }
            />
            <ReviewRow
              label="Estado"
              value={values.status ? toDisplayLabel(values.status) : "—"}
            />
            <ReviewRow
              label="Visibilidad"
              value={
                values.visibility ? toDisplayLabel(values.visibility) : "—"
              }
            />
            <ReviewRow label="Archivo" value={values.originalFilename || "—"} />
            <ReviewRow label="fileUrl" value={values.fileUrl ? "Sí" : "No"} />
            <ReviewRow
              label="thumbnailUrl"
              value={values.thumbnailUrl ? "Sí" : "No"}
            />
            <ReviewRow
              label="thumbnailStoragePath"
              value={values.thumbnailStoragePath ? "Sí" : "No"}
            />
          </div>

          <div className="mt-5 space-y-4">
            <ReviewTags title="Niveles" items={values.levels || []} />
            <ReviewTags title="Skills" items={values.skills || []} />
            <ReviewTags title="Delivery" items={values.deliveryModes || []} />
            <ReviewTags title="Stages" items={values.lessonStages || []} />
            <ReviewTags
              title="Grammar topics"
              items={
                Array.isArray(values.grammarTopics)
                  ? values.grammarTopics
                  : typeof values.grammarTopics === "string"
                    ? values.grammarTopics
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : []
              }
            />
            <ReviewTags
              title="Vocabulary topics"
              items={
                Array.isArray(values.vocabularyTopics)
                  ? values.vocabularyTopics
                  : typeof values.vocabularyTopics === "string"
                    ? values.vocabularyTopics
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : []
              }
            />
            <ReviewTags
              title="Tags"
              items={
                Array.isArray(values.tags)
                  ? values.tags
                  : typeof values.tags === "string"
                    ? values.tags
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : []
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}
