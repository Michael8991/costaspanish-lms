import { z } from "zod";

import { COURSE_STATUSES } from "@/lib/constants/course.constants";
import { courseOperationalDefaultsSchema } from "@/lib/validators/courseTemplate.validator";

export const COURSE_PROFILE_CLASS_TYPES = [
  "private",
  "pair",
  "group_regular",
  "semi_intensive",
  "intensive",
] as const;

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Debe ser un ObjectId válido")
  .transform((value) => value.toLowerCase());

const dateValueSchema = z.union([
  z.date(),
  z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "La fecha no es válida",
    }),
]);

const optionalDateSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  dateValueSchema.optional(),
);

const nullableDateSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  dateValueSchema.nullable().optional(),
);

const studentIdsSchema = z
  .array(objectIdSchema)
  .superRefine((studentIds, ctx) => {
    const seenStudentIds = new Set<string>();

    studentIds.forEach((studentId, index) => {
      if (seenStudentIds.has(studentId)) {
        ctx.addIssue({
          code: "custom",
          path: [index],
          message: "No se puede repetir un alumno",
        });
      }
      seenStudentIds.add(studentId);
    });
  });

export const courseMemberBillingSchema = z
  .object({
    mode: z.enum(["individual_cycle"]).default("individual_cycle"),
    billingAnchorDay: z.number().int().min(1).max(31).optional(),
    billingStartedAt: nullableDateSchema,
    nextBillingDate: nullableDateSchema,
    firstVoucherId: objectIdSchema.nullable().optional(),
    lastVoucherId: objectIdSchema.nullable().optional(),
    notes: z.string().trim().max(1000).optional().default(""),
  })
  .strict();

export const courseMemberSchema = z
  .object({
    studentId: objectIdSchema,
    status: z.enum(["active", "paused", "left"]).default("active"),
    joinedAt: dateValueSchema.optional(),
    leftAt: nullableDateSchema,
    billing: courseMemberBillingSchema.optional(),
  })
  .strict();

const courseMembersSchema = z
  .array(courseMemberSchema)
  .superRefine((members, ctx) => {
    const seenStudentIds = new Set<string>();

    members.forEach((member, index) => {
      if (seenStudentIds.has(member.studentId)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "studentId"],
          message: "No se puede repetir un alumno",
        });
      }
      seenStudentIds.add(member.studentId);
    });
  });

function validateStudentCapacity(
  classType: (typeof COURSE_PROFILE_CLASS_TYPES)[number],
  activeMembersCount: number,
  path: "studentIds" | "members",
  ctx: z.RefinementCtx,
) {
  if (classType === "private" && activeMembersCount > 1) {
    ctx.addIssue({
      code: "custom",
      path: [path],
      message: "Un curso privado admite como máximo un alumno",
    });
  }

  if (classType === "pair" && activeMembersCount > 2) {
    ctx.addIssue({
      code: "custom",
      path: [path],
      message: "Un curso en pareja admite como máximo dos alumnos",
    });
  }
}

export const createCourseProfileSchema = z
  .object({
    templateId: objectIdSchema,
    name: z.string().trim().min(1, "El nombre es obligatorio").max(140),
    classType: z.enum(COURSE_PROFILE_CLASS_TYPES),
    studentIds: studentIdsSchema.default([]),
    members: courseMembersSchema.optional(),
    status: z.enum(COURSE_STATUSES).default("active"),
    startDate: optionalDateSchema,
    targetEndDate: optionalDateSchema,
    scheduleNotes: z.string().trim().max(1000).optional().default(""),
    internalNotes: z.string().trim().max(2000).optional().default(""),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.studentIds.length === 0 && !data.members?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["studentIds"],
        message: "Selecciona al menos un alumno",
      });
    }

    const usesMembers = Boolean(data.members?.length);
    const activeMembersCount = usesMembers
      ? (data.members ?? []).filter((member) => member.status === "active")
          .length
      : data.studentIds.length;
    validateStudentCapacity(
      data.classType,
      activeMembersCount,
      usesMembers ? "members" : "studentIds",
      ctx,
    );

    if (
      data.startDate &&
      data.targetEndDate &&
      new Date(data.targetEndDate) < new Date(data.startDate)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["targetEndDate"],
        message: "La fecha objetivo no puede ser anterior a la fecha de inicio",
      });
    }
  });

export const updateCourseProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(140).optional(),
    status: z.enum(COURSE_STATUSES).optional(),
    classType: z.enum(COURSE_PROFILE_CLASS_TYPES).optional(),
    studentIds: studentIdsSchema.optional(),
    members: courseMembersSchema.optional(),
    policies: courseOperationalDefaultsSchema.optional(),
    startDate: optionalDateSchema,
    targetEndDate: optionalDateSchema,
    scheduleNotes: z.string().trim().max(1000).optional(),
    internalNotes: z.string().trim().max(2000).optional(),
    progress: z
      .object({
        currentModuleOrder: z.number().int().min(0).optional(),
        currentLessonOrder: z.number().int().min(0).optional(),
        completedLessonsCount: z.number().int().min(0).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.classType && data.members) {
      validateStudentCapacity(
        data.classType,
        data.members.filter((member) => member.status === "active").length,
        "members",
        ctx,
      );
    } else if (data.classType && data.studentIds) {
      validateStudentCapacity(
        data.classType,
        data.studentIds.length,
        "studentIds",
        ctx,
      );
    }
  });

export type CreateCourseProfileInput = z.infer<
  typeof createCourseProfileSchema
>;
export type UpdateCourseProfileInput = z.infer<
  typeof updateCourseProfileSchema
>;
