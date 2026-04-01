import {
  FormField,
  getStepFields,
  inputClass,
  MetaRow,
  SectionHeader,
} from "@/components/ui/addResourcesForm/FormSectionWrappers";
import {
  formatBytes,
  getAcceptByFormat,
  toDisplayLabel,
} from "@/lib/utils/form-helpers";
import { Link2, Loader2, UploadCloud } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { UploadedResourceMeta } from "../AddResourceForm";
import { FormatType } from "@/lib/constants/resource.constants";
import { createResourceSchema } from "@/lib/validators/resource";
import z from "zod";
import { useRef, useState } from "react";

interface AddResourseSecondStepProps {
  uploadMessage: string;
  uploadError: string;
  onUploadFile?: (
    file: File,
    format: Exclude<FormatType, "external_link">,
  ) => Promise<UploadedResourceMeta>;
}

export default function AddResourceSecondStep({
  onUploadFile,
}: AddResourseSecondStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const inputFileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    watch,
    setValue,
    trigger,
    resetField,
    formState: { errors },
  } = useFormContext<z.input<typeof createResourceSchema>>();

  const values = watch();
  const selectedFormat = watch("format");

  const processFile = async (file: File) => {
    if (!file || !selectedFormat || selectedFormat === "external_link") return;

    setUploadError("");
    setUploadMessage("");

    setValue("originalFilename", file.name, { shouldDirty: true });
    setValue("mimeType", file.type, { shouldDirty: true });
    setValue("fileSizeBytes", file.size, { shouldDirty: true });

    if (!onUploadFile) {
      setUploadMessage("Archivo detectado. Falta conectar Firebase.");
      return;
    }

    try {
      setIsUploading(true);
      const result = await onUploadFile(file, selectedFormat);

      setValue("storagePath", result.storagePath ?? "", {
        shouldValidate: true,
      });
      setValue("fileUrl", result.fileUrl ?? "", { shouldValidate: true });
      setValue("thumbnailUrl", result.thumbnailUrl ?? "", {
        shouldValidate: true,
      });
      setValue("thumbnailStoragePath", result.thumbnailStoragePath ?? "", {
        shouldValidate: true,
      });

      if (result.pageCount) setValue("pageCount", result.pageCount);
      if (result.durationSeconds)
        setValue("durationSeconds", result.durationSeconds);

      setUploadMessage("¡Archivo procesado con éxito!");
      await trigger(getStepFields(2, selectedFormat));
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Error al procesar",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveUploadedData = () => {
    setUploadError("");
    setUploadMessage("");
    resetField("storagePath");
    resetField("fileUrl");
    resetField("originalFilename");
    resetField("mimeType");
    resetField("fileSizeBytes");
    resetField("pageCount");
    resetField("durationSeconds");
    resetField("thumbnailUrl");
    resetField("thumbnailStoragePath");
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDropFinal = (e: React.DragEvent) => {
    setIsDragging(false);
    handleDrop(e);
  };

  return (
    <>
      <section className="space-y-6">
        <SectionHeader
          title="Contenido del recurso"
          description={
            selectedFormat === "external_link"
              ? "Añade la URL del recurso externo."
              : "Sube el archivo. El formulario puede rellenar automáticamente la metadata técnica."
          }
        />

        {!selectedFormat && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Primero selecciona un formato en el paso 1.
          </div>
        )}

        {selectedFormat === "external_link" && (
          <div className="space-y-4">
            <FormField
              label="URL externa"
              hint="Ejemplo: YouTube, Google Drive, artículo o herramienta web."
              error={errors.externalUrl?.message as string}
            >
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 ps-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://..."
                  {...register("externalUrl")}
                  className={inputClass(Boolean(errors.externalUrl))}
                />
              </div>
            </FormField>
          </div>
        )}

        {selectedFormat && selectedFormat !== "external_link" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    Subida del archivo
                  </div>
                  <div className="text-sm text-slate-600">
                    Formato seleccionado:{" "}
                    <span className="font-medium text-slate-900">
                      {toDisplayLabel(selectedFormat)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => inputFileRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  {isUploading ? "Procesando..." : "Seleccionar archivo"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => inputFileRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropFinal}
                className="flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center transition hover:border-slate-400 hover:bg-slate-50"
              >
                <UploadCloud className="mb-3 h-8 w-8 text-slate-400" />
                <div className="text-sm font-medium text-slate-900">
                  Arrastra aquí o pulsa para elegir archivo
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedFormat === "pdf" &&
                    "PDF con miniatura automática para biblioteca"}
                  {selectedFormat === "image" &&
                    "JPG, PNG, WEBP y otros formatos de imagen"}
                  {selectedFormat === "audio" &&
                    "MP3, WAV, M4A y formatos de audio"}
                  {selectedFormat === "video" &&
                    "MP4, MOV, WEBM y formatos de vídeo"}
                </div>
              </button>

              <input
                ref={inputFileRef}
                type="file"
                accept={getAcceptByFormat(selectedFormat)}
                className="hidden"
                onChange={handlePickFile}
              />

              {(values.originalFilename ||
                values.fileUrl ||
                values.storagePath) && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-emerald-900">
                        Archivo detectado
                      </div>
                      <div className="text-sm text-emerald-800">
                        {values.originalFilename || "Sin nombre"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveUploadedData}
                      className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 transition hover:bg-emerald-100"
                    >
                      Limpiar
                    </button>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <MetaRow label="MIME type" value={values.mimeType || "—"} />
                    <MetaRow
                      label="Tamaño"
                      value={
                        typeof values.fileSizeBytes === "number"
                          ? formatBytes(values.fileSizeBytes)
                          : "0 B"
                      }
                    />
                    <MetaRow
                      label="fileUrl"
                      value={values.fileUrl ? "Disponible" : "Pendiente"}
                    />
                    <MetaRow
                      label="storagePath"
                      value={values.storagePath ? "Disponible" : "Pendiente"}
                    />
                    {selectedFormat === "pdf" && (
                      <>
                        <MetaRow
                          label="thumbnailUrl"
                          value={
                            values.thumbnailUrl ? "Disponible" : "Pendiente"
                          }
                        />
                        <MetaRow
                          label="thumbnailStoragePath"
                          value={
                            values.thumbnailStoragePath
                              ? "Disponible"
                              : "Pendiente"
                          }
                        />
                        <MetaRow
                          label="Páginas"
                          value={
                            typeof values.pageCount === "number"
                              ? String(values.pageCount)
                              : "Pendiente"
                          }
                        />
                      </>
                    )}
                    {(selectedFormat === "audio" ||
                      selectedFormat === "video") && (
                      <MetaRow
                        label="Duración"
                        value={
                          typeof values.durationSeconds === "number"
                            ? `${values.durationSeconds}s`
                            : "Pendiente"
                        }
                      />
                    )}
                  </div>
                </div>
              )}

              {uploadMessage && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  {uploadMessage}
                </div>
              )}

              {uploadError && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {uploadError}
                </div>
              )}
            </div>
            {(selectedFormat === "audio" || selectedFormat === "video") && (
              <FormField
                label="Transcripción"
                hint="Opcional. Pega el texto completo del audio o vídeo."
                error={errors.transcriptText?.message}
              >
                <textarea
                  rows={6}
                  placeholder="Transcribe here the full content of the audio or video..."
                  {...register("transcriptText")}
                  className={inputClass(Boolean(errors.transcriptText))}
                />
              </FormField>
            )}
            {!onUploadFile && (
              <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    Modo manual
                  </div>
                  <div className="text-sm text-slate-600">
                    Útil mientras conectas Firebase o tu pipeline de
                    procesamiento.
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="fileUrl"
                    hint="URL pública del archivo ya subido."
                    error={errors.fileUrl?.message}
                  >
                    <input
                      type="url"
                      placeholder="https://..."
                      {...register("fileUrl")}
                      className={inputClass(Boolean(errors.fileUrl))}
                    />
                  </FormField>

                  <FormField
                    label="storagePath"
                    hint="Ruta interna en Firebase Storage."
                    error={errors.storagePath?.message}
                  >
                    <input
                      type="text"
                      placeholder="resources/teacher-1/file.pdf"
                      {...register("storagePath")}
                      className={inputClass(Boolean(errors.storagePath))}
                    />
                  </FormField>

                  <FormField
                    label="originalFilename"
                    error={errors.originalFilename?.message}
                  >
                    <input
                      type="text"
                      placeholder="my-file.pdf"
                      {...register("originalFilename")}
                      className={inputClass(Boolean(errors.originalFilename))}
                    />
                  </FormField>

                  <FormField label="mimeType" error={errors.mimeType?.message}>
                    <input
                      type="text"
                      placeholder="application/pdf"
                      {...register("mimeType")}
                      className={inputClass(Boolean(errors.mimeType))}
                    />
                  </FormField>

                  <FormField
                    label="fileSizeBytes"
                    error={errors.fileSizeBytes?.message}
                  >
                    <input
                      type="number"
                      placeholder="245000"
                      {...register("fileSizeBytes", {
                        setValueAs: (value) =>
                          value === "" ? undefined : Number(value),
                      })}
                      className={inputClass(Boolean(errors.fileSizeBytes))}
                    />
                  </FormField>

                  {selectedFormat === "pdf" && (
                    <>
                      <FormField
                        label="thumbnailUrl"
                        hint="Obligatorio para la miniatura del PDF en biblioteca."
                        error={errors.thumbnailUrl?.message}
                      >
                        <input
                          type="url"
                          placeholder="https://..."
                          {...register("thumbnailUrl")}
                          className={inputClass(Boolean(errors.thumbnailUrl))}
                        />
                      </FormField>
                      <FormField
                        label="thumbnailStoragePath"
                        hint="Obligatorio para la miniatura del PDF en biblioteca."
                        error={errors.thumbnailStoragePath?.message}
                      >
                        <input
                          type="url"
                          placeholder="https://..."
                          {...register("thumbnailStoragePath")}
                          className={inputClass(
                            Boolean(errors.thumbnailStoragePath),
                          )}
                        />
                      </FormField>

                      <FormField
                        label="pageCount"
                        error={errors.pageCount?.message}
                      >
                        <input
                          type="number"
                          placeholder="12"
                          {...register("pageCount", {
                            setValueAs: (value) =>
                              value === "" ? undefined : Number(value),
                          })}
                          className={inputClass(Boolean(errors.pageCount))}
                        />
                      </FormField>
                    </>
                  )}

                  {(selectedFormat === "audio" ||
                    selectedFormat === "video") && (
                    <FormField
                      label="durationSeconds"
                      error={errors.durationSeconds?.message}
                    >
                      <input
                        type="number"
                        placeholder="180"
                        {...register("durationSeconds", {
                          setValueAs: (value) =>
                            value === "" ? undefined : Number(value),
                        })}
                        className={inputClass(Boolean(errors.durationSeconds))}
                      />
                    </FormField>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
