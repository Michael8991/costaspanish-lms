"use client";

import LessonBlockCategoryStack from "@/components/dashboard/lessons/LessonBlockCategoryStack";
import CompactResourcePickerModal from "@/components/dashboard/resources/CompactResourcePickerModal";
import { getFileTypeBadge } from "@/components/dashboard/resources/ResourcesTableView";
import { LESSON_BLOCK_TYPES, LESSON_SKILLS } from "@/lib/constants/lesson.constants";
import { CEFR_LEVELS } from "@/lib/constants/resource.constants";
import type { TemplateBlockDTO } from "@/lib/dto/course-template.dto";
import type { ResourceMap } from "@/lib/hooks/useResourcesByIds";
import { normalizeBlockCategories } from "@/lib/utils/lesson-block-categories";
import { getLessonBlockTypeVisual } from "@/lib/utils/lesson-block-visuals";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Clock3,
  FileQuestion,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type EditableTemplateBlock = TemplateBlockDTO & {
  clientId: string;
};

interface CourseTemplateBlocksEditorProps {
  blocks: EditableTemplateBlock[];
  onChange: (nextBlocks: EditableTemplateBlock[]) => void;
  resourceMap: ResourceMap;
  isResourcesLoading: boolean;
  resourcesError: string | null;
}

interface StringListEditorProps {
  title: string;
  description?: string;
  values: string[];
  placeholder: string;
  addLabel: string;
  onChange: (nextValues: string[]) => void;
}

function createClientId() {
  return `block-${crypto.randomUUID()}`;
}

export function createEditableTemplateBlock(
  block: TemplateBlockDTO,
  clientId = createClientId(),
): EditableTemplateBlock {
  const type = block.type?.trim() || "custom";

  return {
    ...block,
    clientId,
    type,
    categories: normalizeBlockCategories(type, block.categories),
    plannedObjectives: block.plannedObjectives ?? [],
    cefrLevels: block.cefrLevels ?? [],
    skills: block.skills ?? [],
    tags: block.tags ?? [],
    resources: Array.from(
      new Set(
        (block.resources ?? [])
          .map((resourceId) => String(resourceId).trim())
          .filter(Boolean),
      ),
    ),
  };
}

export function removeBlockClientIds(
  blocks: EditableTemplateBlock[],
): TemplateBlockDTO[] {
  return blocks.map((block) => ({
    title: block.title,
    type: block.type,
    categories: block.categories,
    plannedContent: block.plannedContent,
    plannedObjectives: block.plannedObjectives,
    estimatedMinutes: block.estimatedMinutes,
    cefrLevels: block.cefrLevels,
    skills: block.skills,
    tags: block.tags,
    resources: block.resources,
    order: block.order,
  }));
}

function normalizeBlockOrder(
  blocks: EditableTemplateBlock[],
): EditableTemplateBlock[] {
  return blocks.map((block, index) => ({
    ...block,
    order: index,
    categories: normalizeBlockCategories(block.type || "custom", block.categories),
  }));
}

function StringListEditor({
  title,
  description,
  values,
  placeholder,
  addLabel,
  onChange,
}: StringListEditorProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h6 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </h6>
          {description && (
            <p className="mt-0.5 text-[11px] text-slate-400">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange([...values, ""])}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </button>
      </div>

      {values.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-400">
          Todavía no hay elementos.
        </p>
      ) : (
        values.map((value, index) => (
          <div
            key={`${title}-${index}`}
            className="grid gap-2 sm:grid-cols-[1fr_auto]"
          >
            <input
              value={value}
              onChange={(event) =>
                onChange(
                  values.map((currentValue, valueIndex) =>
                    valueIndex === index ? event.target.value : currentValue,
                  ),
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/20"
              placeholder={placeholder}
            />
            <button
              type="button"
              onClick={() =>
                onChange(values.filter((_, valueIndex) => valueIndex !== index))
              }
              className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-red-600 transition hover:bg-red-50"
              aria-label={`Eliminar elemento ${index + 1} de ${title.toLowerCase()}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default function CourseTemplateBlocksEditor({
  blocks,
  onChange,
  resourceMap,
  isResourcesLoading,
  resourcesError,
}: CourseTemplateBlocksEditorProps) {
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [recentlyMovedBlockId, setRecentlyMovedBlockId] = useState<
    string | null
  >(null);
  const [resourcePickerBlockId, setResourcePickerBlockId] = useState<
    string | null
  >(null);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
    },
    [],
  );

  const updateBlocks = (nextBlocks: EditableTemplateBlock[]) => {
    onChange(normalizeBlockOrder(nextBlocks));
  };

  const updateBlock = (
    blockIndex: number,
    patch: Partial<EditableTemplateBlock>,
  ) => {
    updateBlocks(
      blocks.map((block, index) =>
        index === blockIndex ? { ...block, ...patch } : block,
      ),
    );
  };

  const addBlock = () => {
    const nextBlock = createEditableTemplateBlock({
      title: "Nuevo bloque modelo",
      type: "custom",
      categories: ["custom"],
      plannedContent: "",
      plannedObjectives: [],
      estimatedMinutes: 10,
      cefrLevels: [],
      skills: [],
      tags: [],
      resources: [],
      order: blocks.length,
    });

    updateBlocks([...blocks, nextBlock]);
    setExpandedBlockIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(nextBlock.clientId);
      return nextIds;
    });
  };

  const removeBlock = (blockIndex: number) => {
    if (!window.confirm("¿Eliminar este bloque modelo?")) return;

    const removedBlockId = blocks[blockIndex]?.clientId;
    updateBlocks(blocks.filter((_, index) => index !== blockIndex));
    setExpandedBlockIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (removedBlockId) nextIds.delete(removedBlockId);
      return nextIds;
    });
    if (removedBlockId === resourcePickerBlockId) {
      setResourcePickerBlockId(null);
    }
  };

  const moveBlock = (blockIndex: number, direction: -1 | 1) => {
    const targetIndex = blockIndex + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const nextBlocks = [...blocks];
    [nextBlocks[blockIndex], nextBlocks[targetIndex]] = [
      nextBlocks[targetIndex],
      nextBlocks[blockIndex],
    ];
    const movedBlockId = blocks[blockIndex].clientId;

    updateBlocks(nextBlocks);
    setRecentlyMovedBlockId(movedBlockId);
    if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
    moveTimerRef.current = setTimeout(
      () => setRecentlyMovedBlockId(null),
      1200,
    );
  };

  const toggleExpanded = (clientId: string) => {
    setExpandedBlockIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(clientId)) {
        nextIds.delete(clientId);
      } else {
        nextIds.add(clientId);
      }
      return nextIds;
    });
  };

  const toggleCategory = (
    blockIndex: number,
    category: string,
    block: EditableTemplateBlock,
  ) => {
    const categories = normalizeBlockCategories(block.type, block.categories);
    if (category === block.type) return;

    updateBlock(blockIndex, {
      categories: categories.includes(category)
        ? categories.filter((currentCategory) => currentCategory !== category)
        : [...categories, category],
    });
  };

  const toggleValue = (
    values: string[],
    value: string,
    onNextValues: (nextValues: string[]) => void,
  ) => {
    onNextValues(
      values.includes(value)
        ? values.filter((currentValue) => currentValue !== value)
        : [...values, value],
    );
  };
  const resourcePickerBlock = blocks.find(
    (block) => block.clientId === resourcePickerBlockId,
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h6 className="text-sm font-semibold text-slate-900">
            Bloques modelo
          </h6>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Los bloques modelo dividen una clase modelo en partes reutilizables.
            Más adelante podrán servir para preparar clases reales.
          </p>
        </div>
        <button
          type="button"
          onClick={addBlock}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#9e2727] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#8d2121]"
        >
          <Plus className="h-4 w-4" />
          Añadir bloque modelo
        </button>
      </div>

      {blocks.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
          <p className="text-sm font-medium text-slate-700">
            Sin bloques modelo todavía.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Añade una parte sugerida para estructurar esta clase modelo.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {blocks.map((block, blockIndex) => {
            const type = block.type || "custom";
            const visual = getLessonBlockTypeVisual(type);
            const categories = normalizeBlockCategories(type, block.categories);
            const isExpanded = expandedBlockIds.has(block.clientId);
            const isRecentlyMoved = recentlyMovedBlockId === block.clientId;
            const hasEmptyTitle = block.title.trim().length === 0;
            const hasInvalidDuration =
              block.estimatedMinutes !== undefined &&
              block.estimatedMinutes < 0;
            const hasValidationError = hasEmptyTitle || hasInvalidDuration;
            const objectives = block.plannedObjectives ?? [];
            const resourcesCount = block.resources?.length ?? 0;
            const cefrLevels = block.cefrLevels ?? [];
            const skills = block.skills ?? [];
            const tags = block.tags ?? [];
            const panelId = `template-block-panel-${block.clientId}`;

            return (
              <article
                key={block.clientId}
                className={`overflow-hidden rounded-xl border bg-white transition ${
                  hasValidationError ? "border-red-300" : "border-slate-200"
                } ${
                  isRecentlyMoved
                    ? "bg-[#9e2727]/10 ring-2 ring-[#9e2727]/40"
                    : ""
                }`}
              >
                <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(block.clientId)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <span className="mt-1 shrink-0 font-mono text-xs font-semibold text-slate-400">
                      {String(blockIndex + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <LessonBlockCategoryStack categories={categories} />
                      <span className="mt-1.5 block truncate text-sm font-semibold text-slate-900">
                        {block.title || "Bloque modelo sin título"}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span>{visual.label}</span>
                        {block.estimatedMinutes !== undefined && (
                          <span>{block.estimatedMinutes} min</span>
                        )}
                        <span>
                          {objectives.length}{" "}
                          {objectives.length === 1 ? "objetivo" : "objetivos"}
                        </span>
                        {resourcesCount > 0 && (
                          <span>
                            {resourcesCount}{" "}
                            {resourcesCount === 1
                              ? "recurso sugerido"
                              : "recursos sugeridos"}
                          </span>
                        )}
                        {isRecentlyMoved && (
                          <span className="font-semibold text-[#9e2727]">
                            Movido
                          </span>
                        )}
                      </span>
                      {hasValidationError && (
                        <span className="mt-1 block text-xs font-medium text-red-600">
                          Revisa los campos indicados.
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div className="flex items-center gap-1.5 sm:self-start">
                    <button
                      type="button"
                      disabled={blockIndex === 0}
                      onClick={() => moveBlock(blockIndex, -1)}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Subir bloque modelo ${blockIndex + 1}`}
                      title="Subir"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={blockIndex === blocks.length - 1}
                      onClick={() => moveBlock(blockIndex, 1)}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Bajar bloque modelo ${blockIndex + 1}`}
                      title="Bajar"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(blockIndex)}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                      aria-label={`Eliminar bloque modelo ${blockIndex + 1}`}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    id={panelId}
                    className="space-y-5 border-t border-slate-100 bg-slate-50/60 p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-[1fr_220px_150px]">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Título
                        </label>
                        <input
                          value={block.title}
                          onChange={(event) =>
                            updateBlock(blockIndex, {
                              title: event.target.value,
                            })
                          }
                          className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#9e2727]/20 ${
                            hasEmptyTitle
                              ? "border-red-300"
                              : "border-slate-200 focus:border-[#9e2727]"
                          }`}
                          placeholder="Ej. Warmup de saludos"
                        />
                        {hasEmptyTitle && (
                          <p className="mt-1 text-xs text-red-600">
                            El título del bloque modelo es obligatorio.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Tipo principal
                        </label>
                        <select
                          value={type}
                          onChange={(event) => {
                            const nextType = event.target.value || "custom";
                            updateBlock(blockIndex, {
                              type: nextType,
                              categories: normalizeBlockCategories(
                                nextType,
                                categories.filter(
                                  (category) => category !== type,
                                ),
                              ),
                            });
                          }}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/20"
                        >
                          {!LESSON_BLOCK_TYPES.some(
                            (blockType) => blockType === type,
                          ) && <option value={type}>{visual.label}</option>}
                          {LESSON_BLOCK_TYPES.map((blockType) => (
                            <option key={blockType} value={blockType}>
                              {getLessonBlockTypeVisual(blockType).label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Duración
                        </label>
                        <div className="relative mt-1.5">
                          <Clock3 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            min={0}
                            value={block.estimatedMinutes ?? ""}
                            onChange={(event) =>
                              updateBlock(blockIndex, {
                                estimatedMinutes:
                                  event.target.value === ""
                                    ? undefined
                                    : Number(event.target.value),
                              })
                            }
                            className={`w-full rounded-lg border bg-white py-2.5 pr-9 pl-9 text-sm outline-none transition focus:ring-2 focus:ring-[#9e2727]/20 ${
                              hasInvalidDuration
                                ? "border-red-300"
                                : "border-slate-200 focus:border-[#9e2727]"
                            }`}
                            placeholder="10"
                          />
                          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400">
                            min
                          </span>
                        </div>
                        {hasInvalidDuration && (
                          <p className="mt-1 text-xs text-red-600">
                            La duración no puede ser negativa.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Categorías
                      </span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {LESSON_BLOCK_TYPES.map((category) => {
                          const categoryVisual =
                            getLessonBlockTypeVisual(category);
                          const isSelected = categories.includes(category);
                          const isPrimary = category === type;

                          return (
                            <button
                              key={category}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() =>
                                toggleCategory(blockIndex, category, block)
                              }
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition ${
                                isSelected
                                  ? `${categoryVisual.badgeClassName} border-transparent ring-1 ring-inset`
                                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                              }`}
                            >
                              {categoryVisual.label}
                              {isPrimary && (
                                <Star className="h-3 w-3 fill-current" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-[11px] text-slate-400">
                        La categoría con estrella define el icono y siempre se
                        conserva como principal.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Contenido planificado
                      </label>
                      <textarea
                        rows={3}
                        value={block.plannedContent ?? ""}
                        onChange={(event) =>
                          updateBlock(blockIndex, {
                            plannedContent: event.target.value,
                          })
                        }
                        className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/20"
                        placeholder="Qué se hará en este bloque"
                      />
                    </div>

                    <StringListEditor
                      title="Objetivos planificados"
                      description="Resultados concretos de este bloque modelo."
                      values={objectives}
                      placeholder="Ej. Activar vocabulario de presentaciones"
                      addLabel="Añadir objetivo"
                      onChange={(plannedObjectives) =>
                        updateBlock(blockIndex, { plannedObjectives })
                      }
                    />

                    <div className="grid gap-5 lg:grid-cols-2">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Niveles
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {CEFR_LEVELS.map((level) => {
                            const isSelected = cefrLevels.includes(level);
                            return (
                              <button
                                key={level}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() =>
                                  updateBlock(blockIndex, {
                                    cefrLevels: isSelected
                                      ? cefrLevels.filter(
                                          (currentLevel) =>
                                            currentLevel !== level,
                                        )
                                      : [...cefrLevels, level],
                                  })
                                }
                                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                                  isSelected
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                }`}
                              >
                                {level}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Destrezas
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {LESSON_SKILLS.map((skill) => {
                            const isSelected = skills.includes(skill);
                            return (
                              <button
                                key={skill}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() =>
                                  toggleValue(skills, skill, (nextSkills) =>
                                    updateBlock(blockIndex, {
                                      skills: nextSkills,
                                    }),
                                  )
                                }
                                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                                  isSelected
                                    ? "border-purple-200 bg-purple-50 text-purple-700"
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                }`}
                              >
                                {skill}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <StringListEditor
                      title="Etiquetas"
                      values={tags}
                      placeholder="Ej. presentaciones"
                      addLabel="Añadir etiqueta"
                      onChange={(nextTags) =>
                        updateBlock(blockIndex, { tags: nextTags })
                      }
                    />

                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Recursos sugeridos
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            Material recomendado para preparar una clase real
                            desde esta plantilla.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setResourcePickerBlockId(block.clientId)
                          }
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-[#9e2727]/30 hover:bg-[#9e2727]/5 hover:text-[#9e2727]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {resourcesCount > 0
                            ? "Editar recursos"
                            : "Añadir recursos"}
                        </button>
                      </div>

                      {resourcesError && resourcesCount > 0 && (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          No se pudieron cargar los detalles de algunos
                          recursos. Las asociaciones se mantienen.
                        </p>
                      )}

                      {resourcesCount === 0 ? (
                        <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                          No hay recursos sugeridos para este bloque.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {block.resources.map((resourceId) => {
                            const resource = resourceMap[resourceId];
                            const visual = resource
                              ? getFileTypeBadge(resource.asset.format)
                              : null;
                            const FormatIcon = visual?.icon ?? FileQuestion;

                            return (
                              <li
                                key={resourceId}
                                className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                              >
                                <span
                                  className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${
                                    visual
                                      ? visual.color
                                      : "border border-slate-200 bg-white text-slate-400"
                                  }`}
                                >
                                  <FormatIcon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-medium text-slate-700">
                                    {resource
                                      ? resource.title
                                      : isResourcesLoading
                                        ? "Cargando recurso..."
                                        : "Recurso no encontrado"}
                                  </span>
                                  <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                                    {resource
                                      ? `${visual?.label ?? "Recurso"}${
                                          resource.asset.originalFilename
                                            ? ` · ${resource.asset.originalFilename}`
                                            : ""
                                        }`
                                      : resourceId}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateBlock(blockIndex, {
                                      resources: block.resources.filter(
                                        (currentResourceId) =>
                                          currentResourceId !== resourceId,
                                      ),
                                    })
                                  }
                                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                  aria-label={`Quitar recurso ${resource?.title ?? resourceId}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Quitar recurso
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {resourcePickerBlock && (
        <CompactResourcePickerModal
          isOpen
          onClose={() => setResourcePickerBlockId(null)}
          selectedResourceIds={resourcePickerBlock.resources}
          onConfirm={(resourceIds) => {
            const blockIndex = blocks.findIndex(
              (block) => block.clientId === resourcePickerBlock.clientId,
            );
            if (blockIndex < 0) return;

            updateBlock(blockIndex, {
              resources: Array.from(
                new Set(resourceIds.map((resourceId) => resourceId.trim())),
              ).filter(Boolean),
            });
          }}
        />
      )}
    </section>
  );
}
