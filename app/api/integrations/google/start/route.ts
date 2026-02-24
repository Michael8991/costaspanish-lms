import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { signState } from "@/lib/googleOAuthState";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`;

  const state = signState(
    { uid: session.user.id, nonce: crypto.randomUUID(), iat: Date.now() },
    process.env.NEXTAUTH_SECRET!
  );

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set(
    "scope",
    [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.events", // o readonly en fase 1
    ].join(" ")
  );
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}