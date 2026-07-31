"use client";

import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import CustomModal from "@/components/ui/CustomModal";
import type {
  CourseTemplateDetailDTO,
  CourseTemplateListItemDTO,
  ModuleDataDTO,
} from "@/lib/dto/course-template.dto";
import type { LessonImportCandidateDTO } from "@/lib/dto/lesson-import.dto";
import type {
  LessonBlockDTO,
  LessonDetailDTO,
} from "@/lib/dto/lesson.dto";

export interface ImportedLessonResult {
  item: CourseTemplateDetailDTO;
  importedLesson: {
    moduleOrder: number;
    lessonOrder: number;
    title: string;
    blocksCount: number;
    resourcesCount: number;
  };
}

export type SaveLessonAsTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lessonId?: string;
  initialLesson?: LessonDetailDTO;
  initialTemplateId?: string;
  initialModuleOrder?: number;
  mode: "from_lesson" | "from_template";
  locale: string;
  onImported?: (result: ImportedLessonResult) => void;
};

interface TemplateListResponse {
  data?: CourseTemplateListItemDTO[];
  error?: string;
}

interface TemplateDetailResponse {
  item?: CourseTemplateDetailDTO;
  error?: string;
}

interface LessonDetailResponse {
  item?: LessonDetailDTO;
  error?: string;
}

interface CandidateResponse {
  items?: LessonImportCandidateDTO[];
  error?: string;
}

interface ImportResponse extends Partial<ImportedLessonResult> {
  error?: string;
}

function blockClientId(block: LessonBlockDTO, index: number): string {
  return block._id ?? block.id ?? `order:${block.order ?? index}`;
}

function getModuleOrder(module: ModuleDataDTO, index: number): number {
  return module.order ?? index;
}

function getResponseError(
  data: { error?: string } | null,
  fallback: string,
): string {
  return data?.error ?? fallback;
}

function formatCandidateDate(value: string | null): string {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeComparableTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");
}

export default function SaveLessonAsTemplateModal({
  isOpen,
  onClose,
  lessonId,
  initialLesson,
  initialTemplateId,
  initialModuleOrder,
  mode,
  locale,
  onImported,
}: SaveLessonAsTemplateModalProps) {
  const [templates, setTemplates] = useState<CourseTemplateListItemDTO[]>([]);
  const [templateDetail, setTemplateDetail] =
    useState<CourseTemplateDetailDTO | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    initialTemplateId ?? "",
  );
  const [selectedModuleOrder, setSelectedModuleOrder] = useState<
    number | undefined
  >(initialModuleOrder);
  const [insertAt, setInsertAt] = useState(0);

  const [candidates, setCandidates] = useState<LessonImportCandidateDTO[]>([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateStatus, setCandidateStatus] = useState<
    "completed" | "scheduled" | "all"
  >("completed");
  const [selectedLessonId, setSelectedLessonId] = useState(lessonId ?? "");
  const [lesson, setLesson] = useState<LessonDetailDTO | null>(
    initialLesson ?? null,
  );

  const [titleOverride, setTitleOverride] = useState(
    initialLesson?.title ?? "",
  );
  const [descriptionOverride, setDescriptionOverride] = useState("");
  const [teacherNotes, setTeacherNotes] = useState("");
  const [useActualContent, setUseActualContent] = useState(
    initialLesson?.status === "completed",
  );
  const [includeResources, setIncludeResources] = useState(true);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>(() =>
    (initialLesson?.blocks ?? []).map(blockClientId),
  );

  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ImportedLessonResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSuccess(null);
    setSelectedTemplateId(initialTemplateId ?? "");
    setSelectedModuleOrder(initialModuleOrder);
    setSelectedLessonId(lessonId ?? "");

    if (initialLesson) {
      setLesson(initialLesson);
      setTitleOverride(initialLesson.title);
      setDescriptionOverride("");
      setTeacherNotes("");
      setUseActualContent(initialLesson.status === "completed");
      setIncludeResources(true);
      setSelectedBlockIds(initialLesson.blocks.map(blockClientId));
    } else {
      setLesson(null);
      setTitleOverride("");
      setDescriptionOverride("");
      setTeacherNotes("");
      setIncludeResources(true);
      setSelectedBlockIds([]);
    }
  }, [
    initialLesson,
    initialModuleOrder,
    initialTemplateId,
    isOpen,
    lessonId,
  ]);

  useEffect(() => {
    if (!isOpen || mode !== "from_lesson") return;

    const controller = new AbortController();

    async function loadTemplates() {
      try {
        setIsLoadingTemplates(true);
        const response = await fetch("/api/course-template?limit=100", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as
          | TemplateListResponse
          | null;

        if (!response.ok) {
          throw new Error(
            getResponseError(data, "No se pudieron cargar las plantillas."),
          );
        }

        setTemplates(
          (data?.data ?? []).filter((template) =>
            ["draft", "ready"].includes(template.status),
          ),
        );
      } catch (loadError) {
        if ((loadError as { name?: string }).name !== "AbortError") {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar las plantillas.",
          );
        }
      } finally {
        setIsLoadingTemplates(false);
      }
    }

    void loadTemplates();
    return () => controller.abort();
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen || !selectedTemplateId) {
      setTemplateDetail(null);
      return;
    }

    const controller = new AbortController();

    async function loadTemplate() {
      try {
        setIsLoadingTemplate(true);
        setError(null);
        const response = await fetch(
          `/api/course-template/${selectedTemplateId}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = (await response.json().catch(() => null)) as
          | TemplateDetailResponse
          | null;

        if (!response.ok || !data?.item) {
          throw new Error(
            getResponseError(data, "No se pudo cargar la plantilla."),
          );
        }

        const detail = data.item;
        const modules = detail.curriculum.modules;
        const requestedModule = modules.find(
          (module, index) =>
            getModuleOrder(module, index) ===
            initialModuleOrder,
        );
        const nextModule = requestedModule ?? modules[0];
        const nextModuleOrder = nextModule
          ? getModuleOrder(nextModule, modules.indexOf(nextModule))
          : undefined;

        setTemplateDetail(detail);
        setSelectedModuleOrder(nextModuleOrder);
        setInsertAt(nextModule?.lessons.length ?? 0);
      } catch (loadError) {
        if ((loadError as { name?: string }).name !== "AbortError") {
          setTemplateDetail(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la plantilla.",
          );
        }
      } finally {
        setIsLoadingTemplate(false);
      }
    }

    void loadTemplate();
    return () => controller.abort();
  }, [
    initialModuleOrder,
    isOpen,
    selectedTemplateId,
  ]);

  useEffect(() => {
    if (!isOpen || mode !== "from_template") return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIsLoadingCandidates(true);
        setError(null);
        const params = new URLSearchParams({
          search: candidateSearch,
          status: candidateStatus,
          limit: "20",
        });
        const response = await fetch(
          `/api/lessons/import-candidates?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = (await response.json().catch(() => null)) as
          | CandidateResponse
          | null;

        if (!response.ok) {
          throw new Error(
            getResponseError(data, "No se pudieron cargar las clases."),
          );
        }

        setCandidates(data?.items ?? []);
      } catch (loadError) {
        if ((loadError as { name?: string }).name !== "AbortError") {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar las clases.",
          );
        }
      } finally {
        setIsLoadingCandidates(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [candidateSearch, candidateStatus, isOpen, mode]);

  useEffect(() => {
    if (!isOpen || !selectedLessonId) return;
    if (initialLesson?.id === selectedLessonId) {
      setLesson(initialLesson);
      return;
    }

    const controller = new AbortController();

    async function loadLesson() {
      try {
        setIsLoadingLesson(true);
        setError(null);
        const response = await fetch(`/api/lessons/${selectedLessonId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as
          | LessonDetailResponse
          | null;

        if (!response.ok || !data?.item) {
          throw new Error(
            getResponseError(data, "No se pudo cargar la clase real."),
          );
        }

        setLesson(data.item);
        setTitleOverride(data.item.title);
        setDescriptionOverride("");
        setTeacherNotes("");
        setUseActualContent(data.item.status === "completed");
        setIncludeResources(true);
        setSelectedBlockIds(data.item.blocks.map(blockClientId));
      } catch (loadError) {
        if ((loadError as { name?: string }).name !== "AbortError") {
          setLesson(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la clase real.",
          );
        }
      } finally {
        setIsLoadingLesson(false);
      }
    }

    void loadLesson();
    return () => controller.abort();
  }, [initialLesson, isOpen, selectedLessonId]);

  const selectedModule = useMemo(() => {
    const modules = templateDetail?.curriculum.modules ?? [];
    return modules.find(
      (module, index) =>
        getModuleOrder(module, index) === selectedModuleOrder,
    );
  }, [selectedModuleOrder, templateDetail]);

  const selectedBlocks = useMemo(() => {
    const selected = new Set(selectedBlockIds);
    return (lesson?.blocks ?? []).filter((block, index) =>
      selected.has(blockClientId(block, index)),
    );
  }, [lesson, selectedBlockIds]);

  const previewMinutes = selectedBlocks.reduce(
    (total, block) =>
      total +
      (useActualContent && block.actualMinutes !== undefined
        ? block.actualMinutes
        : (block.estimatedMinutes ?? 10)),
    0,
  );
  const previewResources = includeResources
    ? new Set(selectedBlocks.flatMap((block) => block.resources)).size
    : 0;
  const duplicateTitle = Boolean(
    selectedModule?.lessons.some(
      (templateLesson) =>
        normalizeComparableTitle(templateLesson.title) ===
        normalizeComparableTitle(titleOverride),
    ),
  );
  const sourceHasBlocks = (lesson?.blocks.length ?? 0) > 0;
  const canConfirm =
    Boolean(selectedTemplateId) &&
    selectedModuleOrder !== undefined &&
    Boolean(selectedModule) &&
    Boolean(lesson) &&
    titleOverride.trim().length > 0 &&
    (!sourceHasBlocks || selectedBlockIds.length > 0) &&
    !isSubmitting;

  const handleModuleChange = (value: string) => {
    const moduleOrder = Number(value);
    const modules = templateDetail?.curriculum.modules ?? [];
    const targetModuleOption = modules.find(
      (candidate, index) =>
        getModuleOrder(candidate, index) === moduleOrder,
    );

    setSelectedModuleOrder(moduleOrder);
    setInsertAt(targetModuleOption?.lessons.length ?? 0);
  };

  const toggleBlock = (blockId: string) => {
    setSelectedBlockIds((current) =>
      current.includes(blockId)
        ? current.filter((id) => id !== blockId)
        : [...current, blockId],
    );
  };

  const handleImport = async () => {
    if (!canConfirm || !lesson || selectedModuleOrder === undefined) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await fetch(
        `/api/course-template/${selectedTemplateId}/import-lesson`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: lesson.id,
            targetModuleOrder: selectedModuleOrder,
            insertAt,
            titleOverride,
            descriptionOverride,
            teacherNotes,
            importOptions: {
              useActualContent,
              includeResources,
              selectedBlockIds,
            },
          }),
        },
      );
      const data = (await response.json().catch(() => null)) as
        | ImportResponse
        | null;

      if (!response.ok || !data?.item || !data.importedLesson) {
        throw new Error(
          getResponseError(data, "No se pudo importar la clase real."),
        );
      }

      const result: ImportedLessonResult = {
        item: data.item,
        importedLesson: data.importedLesson,
      };
      setSuccess(result);
      onImported?.(result);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "No se pudo importar la clase real.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === "from_lesson"
          ? "Guardar como clase modelo"
          : "Importar desde clase real"
      }
      maxWidth="5xl"
    >
      <div className="max-h-[78vh] overflow-y-auto rounded-xl bg-slate-50 p-4 text-slate-900 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {mode === "from_lesson"
              ? "Se copiará la estructura de esta clase como una sesión reutilizable. No se copiarán alumnos, asistencia, créditos ni notas personales."
              : "Busca una clase ya preparada o impartida y conviértela en clase modelo."}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h3 className="mt-3 text-lg font-semibold text-emerald-950">
              Clase guardada como modelo en {success.item.internalName}.
            </h3>
            <p className="mt-1 text-sm text-emerald-800">
              Se han importado {success.importedLesson.blocksCount} bloques y{" "}
              {success.importedLesson.resourcesCount} recursos sugeridos.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href={`/${locale}/dashboard/courses/templates/${success.item.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#812020]"
              >
                <BookOpen className="h-4 w-4" />
                Ver plantilla
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {mode === "from_template" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-[#9e2727]" />
                  <h3 className="font-semibold text-slate-900">
                    Seleccionar clase real
                  </h3>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px]">
                  <label className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={candidateSearch}
                      onChange={(event) =>
                        setCandidateSearch(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-10 text-sm outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/15"
                      placeholder="Buscar por título"
                    />
                  </label>
                  <select
                    value={candidateStatus}
                    onChange={(event) =>
                      setCandidateStatus(
                        event.target.value as
                          | "completed"
                          | "scheduled"
                          | "all",
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727]"
                  >
                    <option value="completed">Impartidas</option>
                    <option value="scheduled">Programadas</option>
                    <option value="all">Todas</option>
                  </select>
                </div>

                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
                  {isLoadingCandidates ? (
                    <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando clases...
                    </p>
                  ) : candidates.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
                      No hay clases que coincidan con la búsqueda.
                    </p>
                  ) : (
                    candidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => setSelectedLessonId(candidate.id)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          selectedLessonId === candidate.id
                            ? "border-[#9e2727] bg-[#9e2727]/5"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="block text-sm font-semibold text-slate-900">
                          {candidate.title}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatCandidateDate(candidate.scheduledStart)}
                          </span>
                          <span>{candidate.attendeesSummary}</span>
                          <span>{candidate.blocksCount} bloques</span>
                          <span>{candidate.resourcesCount} recursos</span>
                          <span>{candidate.estimatedMinutes} min</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </section>
            )}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-[#9e2727]" />
                  <h3 className="font-semibold text-slate-900">
                    Destino
                  </h3>
                </div>

                {mode === "from_lesson" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Plantilla
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(event) =>
                        setSelectedTemplateId(event.target.value)
                      }
                      disabled={isLoadingTemplates}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727]"
                    >
                      <option value="">
                        {isLoadingTemplates
                          ? "Cargando plantillas..."
                          : "Selecciona una plantilla"}
                      </option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.internalName} · {template.level} ·{" "}
                          {template.category} · {template.modulesCount} módulos ·{" "}
                          {template.lessonsCount} clases · {template.blocksCount}{" "}
                          bloques
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedTemplateId && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Módulo destino
                      </label>
                      <select
                        value={selectedModuleOrder ?? ""}
                        onChange={(event) =>
                          handleModuleChange(event.target.value)
                        }
                        disabled={
                          isLoadingTemplate ||
                          !templateDetail?.curriculum.modules.length
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727]"
                      >
                        {!templateDetail?.curriculum.modules.length && (
                          <option value="">Sin módulos disponibles</option>
                        )}
                        {templateDetail?.curriculum.modules.map(
                          (module, index) => {
                            const order = getModuleOrder(module, index);
                            return (
                              <option key={`${order}-${module.title}`} value={order}>
                                {index + 1}. {module.title}
                              </option>
                            );
                          },
                        )}
                      </select>
                    </div>

                    {templateDetail &&
                      templateDetail.curriculum.modules.length === 0 && (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                          Esta plantilla no tiene módulos todavía. Añade un
                          módulo antes de importar una clase.
                        </p>
                      )}

                    {selectedModule && (
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Posición
                        </label>
                        <select
                          value={insertAt}
                          onChange={(event) =>
                            setInsertAt(Number(event.target.value))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727]"
                        >
                          {Array.from(
                            { length: selectedModule.lessons.length + 1 },
                            (_, index) => (
                              <option key={index} value={index}>
                                {index === 0
                                  ? "Al principio"
                                  : index === selectedModule.lessons.length
                                    ? "Al final"
                                    : `Después de la clase ${index}`}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#9e2727]" />
                  <h3 className="font-semibold text-slate-900">
                    Revisar clase modelo
                  </h3>
                </div>

                {isLoadingLesson ? (
                  <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando contenido de la clase...
                  </p>
                ) : !lesson ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    Selecciona una clase real para revisar su contenido.
                  </p>
                ) : (
                  <>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Título de la clase modelo
                      </label>
                      <input
                        value={titleOverride}
                        maxLength={140}
                        onChange={(event) =>
                          setTitleOverride(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/15"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Descripción
                      </label>
                      <textarea
                        rows={2}
                        value={descriptionOverride}
                        maxLength={1000}
                        onChange={(event) =>
                          setDescriptionOverride(event.target.value)
                        }
                        className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/15"
                        placeholder="Descripción reutilizable opcional"
                      />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={useActualContent}
                          onChange={(event) =>
                            setUseActualContent(event.target.checked)
                          }
                          className="mt-0.5 rounded border-slate-300 text-[#9e2727]"
                        />
                        <span>
                          <span className="block font-medium">
                            Usar lo trabajado realmente en clase
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            El contenido real se convertirá en planificado.
                          </span>
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={includeResources}
                          onChange={(event) =>
                            setIncludeResources(event.target.checked)
                          }
                          className="mt-0.5 rounded border-slate-300 text-[#9e2727]"
                        />
                        <span>
                          <span className="block font-medium">
                            Incluir recursos
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            Se copiarán como recursos sugeridos.
                          </span>
                        </span>
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {previewMinutes || lesson.scheduledDurationMinutes || 60} min
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                        <FileText className="h-3.5 w-3.5" />
                        {selectedBlocks.length} bloques
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {previewResources} recursos
                      </span>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-700">
                          Bloques
                        </p>
                        {lesson.blocks.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedBlockIds(
                                selectedBlockIds.length === lesson.blocks.length
                                  ? []
                                  : lesson.blocks.map(blockClientId),
                              )
                            }
                            className="text-xs font-medium text-[#9e2727] hover:underline"
                          >
                            {selectedBlockIds.length === lesson.blocks.length
                              ? "Desmarcar todos"
                              : "Seleccionar todos"}
                          </button>
                        )}
                      </div>
                      <div className="max-h-64 space-y-2 overflow-y-auto">
                        {lesson.blocks.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                            La clase no tiene bloques. Puedes importarla como
                            clase modelo vacía.
                          </p>
                        ) : (
                          lesson.blocks.map((block, index) => {
                            const blockId = blockClientId(block, index);
                            const usesActual =
                              useActualContent &&
                              Boolean(
                                block.actualContent?.trim() ||
                                  block.actualMinutes !== undefined ||
                                  block.achievedObjectives.length,
                              );
                            const minutes =
                              useActualContent &&
                              block.actualMinutes !== undefined
                                ? block.actualMinutes
                                : (block.estimatedMinutes ?? 10);

                            return (
                              <label
                                key={blockId}
                                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedBlockIds.includes(blockId)}
                                  onChange={() => toggleBlock(blockId)}
                                  className="mt-1 rounded border-slate-300 text-[#9e2727]"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-slate-900">
                                    {block.title}
                                  </span>
                                  <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                    <span>{block.type}</span>
                                    <span>{minutes} min</span>
                                    <span>
                                      {includeResources
                                        ? block.resources.length
                                        : 0}{" "}
                                      recursos
                                    </span>
                                    <span
                                      className={
                                        usesActual
                                          ? "font-medium text-emerald-700"
                                          : ""
                                      }
                                    >
                                      {usesActual ? "contenido real" : "planificado"}
                                    </span>
                                  </span>
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Notas para la profesora
                      </label>
                      <textarea
                        rows={2}
                        value={teacherNotes}
                        maxLength={1000}
                        onChange={(event) =>
                          setTeacherNotes(event.target.value)
                        }
                        className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/15"
                        placeholder="No se copiarán las notas privadas de la clase real"
                      />
                    </div>
                  </>
                )}
              </section>
            </div>

            {duplicateTitle && (
              <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Ya existe una clase modelo con un título parecido en este
                módulo.
              </p>
            )}

            {sourceHasBlocks && selectedBlockIds.length === 0 && (
              <p className="text-sm text-amber-700">
                Selecciona al menos un bloque para continuar.
              </p>
            )}

            <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Revisa el contenido antes de importarlo. No se copiarán alumnos,
              asistencia, créditos ni notas personales.
            </p>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!canConfirm}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#812020] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Star className="h-4 w-4" />
                )}
                {isSubmitting ? "Importando..." : "Añadir a plantilla"}
              </button>
            </div>
          </div>
        )}
      </div>
    </CustomModal>
  );
}
