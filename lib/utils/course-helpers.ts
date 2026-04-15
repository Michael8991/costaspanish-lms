import z from "zod";

export const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
export const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const objectIdString = (fieldName: string) =>
  z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? `${fieldName} is required`
          : `${fieldName} must be a string`,
    })
    .trim()
    .regex(OBJECT_ID_REGEX, `${fieldName} must be a valid ObjectId`);

export const nonEmptyTrimmedString = (fieldName: string, max = 200) =>
  z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? `${fieldName} is required`
          : `${fieldName} must be a string`,
    })
    .trim()
    .min(1, `${fieldName} is required`)
    .max(max, `${fieldName} must be at most ${max} characters`);

export const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (value === "") return undefined;
    return value;
  });

export const optionalHttpUrlString = () =>
  z
    .string()
    .trim()
    .url("Invalid URL")
    .or(z.literal(""))
    .nullable()
    .optional()
    .default("")
    .transform((value) => (value === "" || value === null ? undefined : value));

export const nonNegativeNumber = (fieldName: string) =>
  z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? `${fieldName} is required`
          : `${fieldName} must be a number`,
    })
    .min(0, `${fieldName} must be greater than or equal to 0`);

export const positiveInt = (fieldName: string) =>
  z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? `${fieldName} is required`
          : `${fieldName} must be a number`,
    })
    .int(`${fieldName} must be an integer`)
    .positive(`${fieldName} must be greater than 0`);

export const normalizeStringArray = (maxItemLength = 120) =>
  z
    .array(z.string().trim().min(1).max(maxItemLength))
    .default([])
    .transform((items) => {
      const cleaned = items.map((item) => item.trim()).filter(Boolean);
      return Array.from(new Set(cleaned));
    });
