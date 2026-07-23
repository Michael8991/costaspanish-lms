import type { LessonBlockType } from "@/lib/types/lesson";

export function normalizeLessonBlockCategories(
  type: LessonBlockType,
  categories?: readonly LessonBlockType[] | null,
): LessonBlockType[] {
  return Array.from(new Set([type, ...(categories ?? [])]));
}

export function getSecondaryLessonBlockCategories(
  type: LessonBlockType,
  categories?: readonly LessonBlockType[] | null,
): LessonBlockType[] {
  return normalizeLessonBlockCategories(type, categories).filter(
    (category) => category !== type,
  );
}
