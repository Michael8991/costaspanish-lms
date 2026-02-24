// app/api/integrations/google/events/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongo";
import User from "@/models/User";
import type {
    CalendarEventDTO,
    GoogleEventsListResponse,
    GoogleCalendarEvent,
} from "@/lib/types/google-calendar";



function toISO(d: Date): string {
  return d.toISOString();
}

type GoogleTokens = {
  connected: boolean;
  calendarId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
};

async function loadGoogleTokens(userId: string): Promise<GoogleTokens | null> {
  await dbConnect();
  const user = await User.findById(userId).select("role google").lean();
  if (!user) return null;
  if (user.role !== "teacher") return null;

  return {
    connected: Boolean(user.google?.connected),
    calendarId: user.google?.calendarId ?? "primary",
    accessToken: user.google?.accessToken ?? undefined,
    refreshToken: user.google?.refreshToken ?? undefined,
    expiresAt: user.google?.expiresAt ?? undefined,
  };
}

async function saveGoogleAccessToken(userId: string, accessToken: string, expiresAt: number) {
  await dbConnect();
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        "google.accessToken": accessToken,
        "google.expiresAt": expiresAt,
        "google.updatedAt": new Date(),
      },
    }
  );
}

async function refreshGoogleAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data: unknown = await res.json();

  if (!res.ok) {
    return Promise.reject(new Error(`Google token refresh failed`));
  }

  // Narrowing seguro
  const obj = data as { access_token?: string; expires_in?: number };
  if (!obj.access_token || !obj.expires_in) {
    return Promise.reject(new Error(`Invalid refresh token response`));
  }

  const expiresAt = Date.now() + obj.expires_in * 1000;
  return { accessToken: obj.access_token, expiresAt };
}

function pickMeetLink(e: GoogleCalendarEvent): string | null {
  if (e.hangoutLink) return e.hangoutLink;

  const ep = e.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video" && p.uri);
  return ep?.uri ?? null;
}

function mapToDTO(e: GoogleCalendarEvent): CalendarEventDTO {
  return {
    id: e.id,
    title: e.summary ?? "(No title)",
    description: e.description ?? null,
    start: e.start?.dateTime ?? e.start?.date ?? null,
    end: e.end?.dateTime ?? e.end?.date ?? null,
    location: e.location ?? null,
    meetLink: pickMeetLink(e),
  };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const now = new Date();

const startOfDay = new Date(now);
startOfDay.setHours(0, 0, 0, 0);

const endOfDay = new Date(now);
endOfDay.setHours(23, 59, 59, 999);

const fromDate = from ? new Date(from) : startOfDay;
const toDate = to ? new Date(to) : endOfDay;

  const google = await loadGoogleTokens(userId);
if (!google?.connected || !google.accessToken) {
  return NextResponse.json({ connected: false, events: [] satisfies CalendarEventDTO[] });
}

let accessToken = google.accessToken;
const isExpired = !google.expiresAt || google.expiresAt <= Date.now() + 30_000;

if (isExpired) {
  if (!google.refreshToken) {
    return NextResponse.json(
      { connected: false, error: "missing_refresh_token", events: [] satisfies CalendarEventDTO[] },
      { status: 401 }
    );
  }
  const refreshed = await refreshGoogleAccessToken(google.refreshToken);
  accessToken = refreshed.accessToken;
  await saveGoogleAccessToken(userId, refreshed.accessToken, refreshed.expiresAt);
}
  const calendarId = encodeURIComponent(google.calendarId);
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`);
  url.searchParams.set("timeZone", "Europe/Madrid");
  url.searchParams.set("timeMin", toISO(fromDate));
  url.searchParams.set("timeMax", toISO(toDate));
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const gRes = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = (await gRes.json()) as GoogleEventsListResponse;

  if (!gRes.ok) {
    return NextResponse.json({ error: "Google API error", details: payload }, { status: 502 });
  }

  const events = (payload.items ?? []).map(mapToDTO);
  return NextResponse.json({ connected: true, events });
}