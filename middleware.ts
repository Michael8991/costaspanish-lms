import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico") ||
        PUBLIC_FILE.test(pathname)
    ) return NextResponse.next();

    if (pathname.startsWith("/api/auth")) return NextResponse.next();

    //Bloqueamos el see de cualquier entorno que no sea dev
    if (pathname.startsWith("/api/seed-admin")) {
        if (process.env.NODE_ENV !== "development") {
            return NextResponse.json({ ok: false, message:"Forbidden"}, {status: 403})
        }
        return NextResponse.next();
    }

    //Definimos las zonas protegidas
    const isProtectedPage =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/teacher");
    
    const isProtectedApi =
        pathname.startsWith("/api/") &&
        !pathname.startsWith("/api/auth") &&
        !pathname.startsWith("/api/seed-admin");
    
    if (!isProtectedPage && !isProtectedApi) {
        return NextResponse.next();
    }

    //Comprobamos la sesión, el token jwt de NextAuth.
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        if (isProtectedApi) {
            return NextResponse.json({ok: false, message: "Unauthorized"}, {status: 401})
        }
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    const role = token.role as "admin" | "teacher" | "student" | undefined; 

    const adminOnly =
        pathname.startsWith("/dashboard/admin") ||
        pathname.startsWith("/api/admin");
    
    if (adminOnly && role !== "admin") {
        if (isProtectedApi) {
            return NextResponse.json(
                { ok: false, message: "Forbidden" },
                { status: 403 }
            )
        }
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    const teacherOnly =
        pathname.startsWith("/dashboard/teacher") || pathname.startsWith("/api/teacher");
    
    if (teacherOnly && role !== "admin" && role !== "teacher") {
        if (isProtectedApi) {
            return NextResponse.json(
                { ok: false, message: "Forbidden" },
                { status: 403 }
            )
        }
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
    
}

export const config = {
     matcher: [
    
    "/dashboard/:path*",
    "/admin/:path*",
    "/teacher/:path*",

    "/api/:path*",
  ],
}