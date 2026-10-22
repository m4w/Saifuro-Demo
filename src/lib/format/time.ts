import type { IsoDate } from "@/lib/api/types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Oct 22, 2026, 2:32 PM GMT+2". Uses the viewer's time zone unless one is given. */
export function formatDateTime(iso: IsoDate, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone,
  }).format(new Date(iso));
}

/** Short duration for "time waiting": "under 1 min", "45 min", "2 h 5 min", "3 d 4 h". */
export function formatDuration(ms: number): string {
  if (ms < MINUTE) return "under 1 min";
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)} min`;
  if (ms < DAY) {
    const h = Math.floor(ms / HOUR);
    const m = Math.floor((ms % HOUR) / MINUTE);
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  return h ? `${d} d ${h} h` : `${d} d`;
}

/** "just now", "12 min ago", "2 h 5 min ago". */
export function formatRelative(iso: IsoDate, now: number): string {
  const ms = now - new Date(iso).getTime();
  return ms < MINUTE ? "just now" : `${formatDuration(ms)} ago`;
}

/** "Sep 3, 2026". */
export function formatDate(iso: IsoDate, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone,
  }).format(new Date(iso));
}
