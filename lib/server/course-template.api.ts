import { z, type ZodError } from "zod";
import type { CreateCourseTemplateInput } from "@/lib/validators/courseTemplate.validator";

export function isValidObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

export function formatZodError(error: ZodError) {
    const flattened = z.flattenError(error);
  return {
    formErrors: flattened.formErrors,
    fieldErrors: flattened.fieldErrors,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined) return base;

  if (Array.isArray(base) && Array.isArray(patch)) {
    return patch as T;
  }

  if (isPlainObject(base) && isPlainObject(patch)) {
    const result: Record<string, unknown> = { ...base };

    for (const [key, patchValue] of Object.entries(patch)) {
      const baseValue = result[key];
      result[key] = baseValue === undefined ? patchValue : deepMerge(baseValue, patchValue);
    }

    return result as T;
  }

  return patch as T;
}

export function toCourseTemplatePersistenceInput(input: CreateCourseTemplateInput) {
  return {
    code: input.code,
    internalName: input.internalName,
    status: input.status,
    version: input.version,
    pedagogicalMeta: input.pedagogicalMeta,
    storefront: input.storefront,
    curriculum: input.curriculum,
  };
}