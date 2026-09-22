/**
 * Event date formats shared by web and mobile.
 */

const TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

/** "Thu, Mar 5 · 6:00 PM". A multi-day event reads "Mar 5 – Mar 7". */
export function formatEventDateShort(startDate: string, endDate?: string | null): string {
  const start = new Date(startDate);
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };

  if (!endDate || start.toDateString() === new Date(endDate).toDateString()) {
    const time = start.toLocaleTimeString('en-US', TIME);
    return `${start.toLocaleDateString('en-US', opts)} · ${time}`;
  }

  const end = new Date(endDate);
  const startShort = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endShort = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startShort} – ${endShort}`;
}

/** "Thursday, March 5 · 6:00 PM – 9:00 PM". A multi-day event reads "March 5 – March 7". */
export function formatEventDateLong(startDate: string, endDate?: string | null): string {
  const start = new Date(startDate);
  if (!endDate) {
    return start.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      ...TIME,
    });
  }

  const end = new Date(endDate);
  if (start.toDateString() === end.toDateString()) {
    const dateStr = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const startTime = start.toLocaleTimeString('en-US', TIME);
    const endTime = end.toLocaleTimeString('en-US', TIME);
    return `${dateStr} · ${startTime} – ${endTime}`;
  }

  const monthDay: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', monthDay)} – ${end.toLocaleDateString('en-US', monthDay)}`;
}
