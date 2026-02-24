"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
type EventDTO = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  meetLink: string | null;
};

export default function TeacherTodaySchedule() {
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/integrations/google/events", {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok || !data.connected) {
        setConnected(false);
        setLoading(false);
        return;
      }

      setConnected(true);
      setEvents(data.events);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-4">Loading schedule...</div>;

  if (!connected)
    return (
      <div className="flex w-full align-middle justify-center">
        <Link
          href="/api/integrations/google/start"
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm"
        >
          Connect Google Calendar
        </Link>
      </div>
    );
  if (!events.length)
    return (
      <div className="flex w-full align-middle justify-center text-black">
        No upcoming events.
      </div>
    );

  return (
    <div className="p-4">
      <div className="flex flex-col gap-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex justify-between py-2 px-4 bg-white rounded shadow-md"
          >
            <div className="flex flex-col">
              <span className="font-medium">{event.title}</span>
              {event.meetLink && (
                <a
                  href={event.meetLink}
                  target="_blank"
                  className="text-sm text-blue-600 underline"
                >
                  Join meeting
                </a>
              )}
            </div>
            <div>
              <span className="text-sm text-gray-500">
                {event.start && event.end
                  ? `${new Date(event.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} - ${new Date(event.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`
                  : "Hora no definida"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
