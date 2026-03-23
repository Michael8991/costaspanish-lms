"use client";

import { CalendarDays, CalendarX, Clock, Video, Wifi } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
type EventDTO = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  meetLink: string | null;
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getEventStatus(start: string | null, end: string | null) {
  if (!start || !end) return "upcoming";
  const now = new Date();
  const s = new Date(start);
  const e = new Date(end);
  if (now >= s && now <= e) return "live";
  if (now < s) return "upcoming";
  return "done";
}

export default function TeacherTodaySchedule() {
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/integrations/google/events", {
          credentials: "include",
        });

        if (!res.ok) {
          setConnected(false);
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (!data.connected) {
          setConnected(false);
          setLoading(false);
          return;
        }

        setConnected(true);
        setEvents(data.events ?? []);
      } catch {
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  if (loading)
    return (
      <div className="p-8 text-center text-white">
        <p className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9e2727] mx-auto mb-4"></p>
        Cargando calendario...
      </div>
    );

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <Wifi size={18} className="text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">
            Google Calendar no conectado
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            Conecta tu cuenta para ver tus clases de hoy
          </p>
        </div>
        <Link
          href="/api/integrations/google/start"
          className="mt-1 inline-flex items-center gap-2 rounded-lg bg-[#9e2727] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#8d2323]"
        >
          <CalendarDays size={14} />
          Conectar Google Calendar
        </Link>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
        <CalendarX size={22} className="text-gray-300" />
        <p className="text-sm text-gray-400">No hay clases programadas hoy</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((event, index) => {
        const status = getEventStatus(event.start, event.end);
        const isLive = status === "live";
        const isDone = status === "done";

        return (
          <div
            key={event.id}
            style={{ animationDelay: `${index * 60}ms` }}
            className={`group relative flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200
              ${
                isLive
                  ? "border-[#9e2727]/20 bg-[#9e2727]/5 shadow-sm"
                  : isDone
                    ? "border-gray-100 bg-gray-50 opacity-60"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
          >
            {/* Indicador lateral */}
            <div
              className={`h-8 w-1 shrink-0 rounded-full transition-all
                ${isLive ? "bg-[#9e2727]" : isDone ? "bg-gray-200" : "bg-gray-300 group-hover:bg-[#9e2727]/40"}`}
            />

            {/* Contenido principal */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span
                  className={`truncate text-sm font-semibold
                    ${isDone ? "text-gray-400" : "text-gray-800"}`}
                >
                  {event.title}
                </span>
                {isLive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#9e2727] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    En curso
                  </span>
                )}
              </div>

              {event.meetLink && (
                <a
                  href={event.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex w-fit items-center gap-1 text-xs font-medium text-[#9e2727] transition-opacity hover:opacity-70"
                >
                  <Video size={11} />
                  Unirse a la reunión
                </a>
              )}
            </div>

            {/* Hora */}
            <div className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
              <Clock size={11} />
              {event.start && event.end
                ? `${formatTime(event.start)} – ${formatTime(event.end)}`
                : "Hora no definida"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
