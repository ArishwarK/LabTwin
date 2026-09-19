import { GoogleCalendarEvent, LabBookingSlot } from '../types';

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export interface CreateEventParams {
  summary: string;
  description: string;
  location: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string;   // YYYY-MM-DD
  endTime: string;   // HH:mm
  timeZone?: string; // default 'Asia/Kolkata'
  attendees?: string[];
}

/**
 * Fetch calendar events from user's primary calendar within a date range
 */
export const listCalendarEvents = async (
  accessToken: string,
  timeMin?: string,
  timeMax?: string
): Promise<GoogleCalendarEvent[]> => {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });

  if (timeMin) params.append('timeMin', timeMin);
  if (timeMax) params.append('timeMax', timeMax);

  const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to fetch events from Google Calendar (${response.status})`
    );
  }

  const data = await response.json();
  return data.items || [];
};

/**
 * Create a new slot booking event in user's primary Google Calendar
 */
export const createCalendarEvent = async (
  accessToken: string,
  eventData: CreateEventParams
): Promise<GoogleCalendarEvent> => {
  const timeZone = eventData.timeZone || 'Asia/Kolkata';

  // Construct ISO 8601 strings with timezone offset (+05:30 for Asia/Kolkata or local)
  const startDateTime = `${eventData.startDate}T${eventData.startTime}:00`;
  const endDateTime = `${eventData.endDate}T${eventData.endTime}:00`;

  const payload: Record<string, any> = {
    summary: eventData.summary,
    description: eventData.description,
    location: eventData.location,
    start: {
      dateTime: new Date(startDateTime).toISOString(),
      timeZone: timeZone,
    },
    end: {
      dateTime: new Date(endDateTime).toISOString(),
      timeZone: timeZone,
    },
    colorId: '9', // Blueberry / Navy Blue in Google Calendar
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 60 },
      ],
    },
  };

  if (eventData.attendees && eventData.attendees.length > 0) {
    payload.attendees = eventData.attendees.map((email) => ({ email }));
  }

  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to create event in Google Calendar (${response.status})`
    );
  }

  return await response.json();
};

/**
 * Delete an event from user's primary Google Calendar
 */
export const deleteCalendarEvent = async (
  accessToken: string,
  eventId: string
): Promise<void> => {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to delete event from Google Calendar (${response.status})`
    );
  }
};
