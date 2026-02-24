import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongo";
import User from "@/models/User";
import { verifyState } from "@/lib/googleOAuthState";

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!code || !state) return NextResponse.json({ error: "Missing code/state" }, { status: 400 });

  const decoded = verifyState(state, process.env.NEXTAUTH_SECRET!);
  if (!decoded?.uid) return NextResponse.json({ error: "Invalid state" }, { status: 400 });

  await dbConnect();
  const user = await User.findById(decoded.uid).select("role");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const tokenJson = (await tokenRes.json()) as Partial<TokenResponse>;
  if (!tokenRes.ok || !tokenJson.access_token || !tokenJson.expires_in) {
    return NextResponse.json({ error: "Token exchange failed", details: tokenJson }, { status: 502 });
  }

  const expiresAt = Date.now() + tokenJson.expires_in * 1000;

  const update: Record<string, unknown> = {
    "google.connected": true,
    "google.scope": tokenJson.scope ?? null,
    "google.accessToken": tokenJson.access_token,
    "google.expiresAt": expiresAt,
    "google.updatedAt": new Date(),
  };

  if (tokenJson.refresh_token) update["google.refreshToken"] = tokenJson.refresh_token;

  await User.updateOne({ _id: decoded.uid }, { $set: update });
 
  const locale = "es";
  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/${locale}/dashboard?google=connected`);
}