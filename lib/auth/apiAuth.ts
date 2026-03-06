import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export type Role = "admin" | "teacher" | "student";
export async function requireAuth(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.uid) return null;

    return {
        id: String(token.uid),
        role: token.role as Role,
    };
}

export function requireRole(user: { role: Role } | null, allowed: Role[]) {
    if (!user) return false;
    return allowed.includes(user.role)
}