import { Types } from "mongoose";
import type { z } from "zod";

import type { createStudentProfileSchema } from "@/lib/validators/student";

type NewStudentPayload = z.infer<typeof createStudentProfileSchema>;

export function buildNewStudentProfileCreateData(
  payload: NewStudentPayload,
  teacherId: string,
) {
  const contactEmail = (payload.contactEmail ?? payload.email ?? "").trim();

  return {
    teacherId: new Types.ObjectId(teacherId),
    contactEmail,
    contactEmailLower: contactEmail.toLowerCase(),
    fullName: payload.fullName,
    phone: payload.phone,
    country: payload.country,
    timezone: payload.timezone,
    level: payload.level,
    nativeLanguage: payload.nativeLanguage,
    goals: payload.goals,
    internalNotes: payload.internalNotes,
    activePlans: [],
  };
}
