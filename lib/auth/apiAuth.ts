import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export type Role = "admin" | "teacher" | "student";
export async function requireAuth(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) return null;

    return {
        id: String(token.id),
        role: token.role as Role,
    };
}

export function requireRole(user: { role: Role } | null, allowed: Role[]) {
    if (!user) return false;
    return allowed.includes(user.role)
}