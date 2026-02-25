import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;
const LOCALES = ["es", "en"] as const;
type Locale = (typeof LOCALES)[number];

function getLocaleFromPath(pathname: string): Locale | null {
  const seg = pathname.split("/")[1];
  return (LOCALES as readonly string[]).includes(seg) ? (seg as Locale) : null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    PUBLIC_FILE.test(pathname)
  )
    return NextResponse.next();

  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  //Bloqueamos el see de cualquier entorno que no sea dev
  if (pathname.startsWith("/api/seed-admin")) {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

  const locale = getLocaleFromPath(pathname);
  const effectivePath = locale
    ? pathname.replace(`/${locale}`, "") || "/"
    : pathname;

  //Definimos las zonas protegidas
  const isProtectedPage =
    effectivePath.startsWith("/dashboard") ||
    effectivePath.startsWith("/admin") ||
    effectivePath.startsWith("/teacher");

  const isProtectedApi =
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth") &&
    !pathname.startsWith("/api/seed-admin") &&
    !pathname.startsWith("/api/seed-users") &&
    !pathname.startsWith("/api/seed-teacher");

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  //Comprobamos la sesión, el token jwt de NextAuth.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (isProtectedApi) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    const callback = req.nextUrl.pathname + req.nextUrl.search;
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = `/login`;
    loginUrl.searchParams.set("callbackUrl", callback);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as "admin" | "teacher" | "student" | undefined;

  const adminOnly =
    effectivePath.startsWith("/admin") ||
    effectivePath.startsWith("/dashboard/admin") ||
    pathname.startsWith("/api/admin");

  if (adminOnly && role !== "admin") {
    if (isProtectedApi) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 },
      );
    }
    const loc = locale ?? "es";
    const url = req.nextUrl.clone();
    url.pathname = `/${loc}/dashboard`;
    return NextResponse.redirect(url);
  }

  const teacherOnly =
    effectivePath.startsWith("/teacher") ||
    effectivePath.startsWith("/dashboard/teacher") ||
    pathname.startsWith("/api/teacher");

  if (teacherOnly && role !== "admin" && role !== "teacher") {
    if (isProtectedApi) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 },
      );
    }
    const loc = locale ?? "es";
    const url = req.nextUrl.clone();
    url.pathname = `/${loc}/dashboard`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/(es|en)/dashboard/:path*",
    "/(es|en)/admin/:path*",
    "/(es|en)/teacher/:path*",
    "/api/:path*",
  ],
};
