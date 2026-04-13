import { z } from "zod";
import { PARTICIPANT_MODES } from "../constants/courseTemplate.constants";

// Helpers

const trimmedString = (max = 3000) =>
    z.string()
      .trim()
      .max(max)
      .or(z.literal(""))
      .nullable()   
      .default("")
      .transform(val => val === "" ? undefined : val);

  const optionalUrlString = () =>
    z.string()
      .url("URL no válida")
      .or(z.literal(""))
      .nullable()  
      .optional()
      .default("")
    .transform(val => val === "" ? undefined : val);
      
const nonEmptyTrimmedString = (fieldName: string, max = 200) =>
  z
    .string({
      required_error: `${fieldName} is required`,
      invalid_type_error: `${fieldName} must be a string`,
    })
    .trim()
    .min(1, `${fieldName} is required`)
    .max(max, `${fieldName} must be at most  ${max} characters`)

//Subschemas
export const priceConditionSchema = z
  .object({
    participantMode: z.enum(PARTICIPANT_MODES).optional(),
    participantCount: z.number().int().min(1).optional(),
    packageClasses: z.number().int().min(1).optional(),
    monthlyClasses: z.number().int().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.packageClasses && data.monthlyClasses) {
      ctx.addIssue({
        code: "custom",
        message: "A price condition cannot define both packageClasses and monthlyClasses",
        path: ["monthlyClasses"],
      });
    }

    if (data.participantMode === "solo" && data.participantCount && data.participantCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: 'participantCount must be 1 when participantMode is "solo"',
        path: ["participantCount"],
      });
    }

    if (data.participantMode === "pair" && data.participantCount && data.participantCount !== 2) {
      ctx.addIssue({
        code: "custom",
        message: 'participantCount must be 2 when participantMode is "pair"',
        path: ["participantCount"],
      });
    }

    if (data.participantMode === "trio" && data.participantCount && data.participantCount !== 3) {
      ctx.addIssue({
        code: "custom",
        message: 'participantCount must be 3 when participantMode is "trio"',
        path: ["participantCount"],
      });
    }

    if (data.participantMode === "group" && data.participantCount && data.participantCount < 2) {
      ctx.addIssue({
        code: "custom",
        message: 'participantCount should be >= 2 when participantMode is "group"',
        path: ["participantCount"],
      });
    }
  
  })

  export const priceOptionSchema = z.object({
  label: nonEmptyTrimmedString("label", 120),
  amount: nonNegativeNumber("amount").optional(),
  condition: priceConditionSchema.optional(),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});
      

//Base courseTemplate Schema


//Create Schema
// export const createCourseTemplateSchema = z
    

//Update Schema


//Internal / DB schema

//Types inferidos