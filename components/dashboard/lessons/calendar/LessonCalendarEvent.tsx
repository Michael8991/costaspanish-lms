"use client";

import type { EventDisplayInfo } from "@fullcalendar/react";

import type { LessonListDTO } from "@/lib/dto/lesson.dto";
import { getLessonCalendarCopy } from "@/lib/utils/lesson-calendar-i18n";
import { getLessonStatusVisual } from "@/lib/utils/lesson-status-visuals";

interface LessonCalendarEventProps {
  info: EventDisplayInfo;
  locale: string;
}

export default function LessonCalendarEvent({
  info,
  locale,
}: LessonCalendarEventProps) {
  const lesson = info.event.extendedProps.lesson as LessonListDTO;
  const isMonth = info.view.type === "dayGridMonth";
  const copy = getLessonCalendarCopy(locale);
  const status = getLessonStatusVisual(lesson.status);

  if (isMonth) {
    return (
      <span className="lesson-calendar-event-content lesson-calendar-event-content--month">
        <span aria-hidden="true" className="lesson-calendar-event-dot" />
        <span className="lesson-calendar-event-title">{lesson.title}</span>
        <span className="lesson-calendar-event-time">{info.timeText}</span>
      </span>
    );
  }

  return (
    <span className="lesson-calendar-event-content">
      <span className="lesson-calendar-event-title">{lesson.title}</span>
      <span className="lesson-calendar-event-time">{info.timeText}</span>
      <span className="lesson-calendar-event-status">
        {lesson.preparationStatus === "prepared"
          ? copy.prepared
          : copy.needsPreparation}
        <span aria-hidden="true"> · </span>
        {status.label}
      </span>
    </span>
  );
}
