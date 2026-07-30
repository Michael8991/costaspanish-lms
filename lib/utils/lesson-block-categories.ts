import type { LessonBlockType } from "@/lib/types/lesson";

export function normalizeBlockCategories(
  type: string,
  categories?: readonly string[] | null,
): string[] {
  return Array.from(
    new Set(
      [type, ...(categories ?? [])]
        .map((category) => category.trim())
        .filter(Boolean),
    ),
  );
}

export function normalizeLessonBlockCategories(
  type: LessonBlockType,
  categories?: readonly LessonBlockType[] | null,
): LessonBlockType[] {
  return normalizeBlockCategories(type, categories) as LessonBlockType[];
}

export function getSecondaryLessonBlockCategories(
  type: LessonBlockType,
  categories?: readonly LessonBlockType[] | null,
): LessonBlockType[] {
  return normalizeLessonBlockCategories(type, categories).filter(
    (category) => category !== type,
  );
}
