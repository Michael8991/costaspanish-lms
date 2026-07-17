import { Types } from "mongoose";
import { requireAuth } from "@/lib/auth/apiAuth";

type AuthUser = Exclude<Awaited<ReturnType<typeof requireAuth>>, null>;

export function getCurrentUserId(user: AuthUser): string {
  return String(user.id ?? "");
}

export function getCurrentUserObjectId(user: AuthUser): Types.ObjectId | null {
  const rawId = getCurrentUserId(user);

  if (!Types.ObjectId.isValid(rawId)) {
    return null;
  }

  return new Types.ObjectId(rawId);
}