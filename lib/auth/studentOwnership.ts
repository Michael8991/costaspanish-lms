import type { QueryFilter } from "mongoose";

import type { Role } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import type { StudentProfileDoc } from "@/models/StudentProfile";

export type StudentOwnershipUser = {
  id: string;
  role: Role;
};

export function getStudentOwnershipFilter(
  user: StudentOwnershipUser,
  filter: QueryFilter<StudentProfileDoc> = {},
): QueryFilter<StudentProfileDoc> | null {
  const currentUserObjectId = getCurrentUserObjectId(user);

  if (!currentUserObjectId) return null;
  if (user.role === "admin") return filter;

  return {
    ...filter,
    teacherId: currentUserObjectId,
  } as QueryFilter<StudentProfileDoc>;
}

export function getStudentOwnerMatch(user: StudentOwnershipUser) {
  const currentUserObjectId = getCurrentUserObjectId(user);

  if (!currentUserObjectId) return null;

  return user.role === "admin" ? {} : { teacherId: currentUserObjectId };
}
