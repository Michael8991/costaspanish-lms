// types/google-calendar.ts
export type ISODateTime = string;

export interface CalendarEventDTO {
  id: string;
  title: string;
  description: string | null;
  start: ISODateTime | null; // dateTime o date
  end: ISODateTime | null;
  location: string | null;
  meetLink: string | null;
}

export interface GoogleEventDateTime {
  date?: string;      // all-day
  dateTime?: string;  // timed
  timeZone?: string;
}

export interface GoogleConferenceEntryPoint {
  entryPointType?: string; // "video" etc
  uri?: string;
}

export interface GoogleConferenceData {
  entryPoints?: GoogleConferenceEntryPoint[];
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  location?: string;
  hangoutLink?: string;
  conferenceData?: GoogleConferenceData;
}

export interface GoogleEventsListResponse {
  items?: GoogleCalendarEvent[];
}