/** Business hours are stored as 24-hour "H:MM" or "HH:MM" strings. */

/** Minutes since midnight, or null when the value isn't a valid "H:MM" time. */
export function parseTimeToMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** A stored time as US readers expect it: "17:30" → "5:30 PM". A value it can't read is left as it is. */
export function formatClockTime(hhmm: string): string {
  const total = parseTimeToMinutes(hhmm);
  if (total === null) return hhmm;
  const h24 = Math.floor(total / 60);
  const minutes = (total % 60).toString().padStart(2, '0');
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${minutes} ${h24 >= 12 ? 'PM' : 'AM'}`;
}
