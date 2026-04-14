import type { BusinessHours } from '../../types/marketplace';

export interface OpenStatus {
  isOpen: boolean;
  nextChangeLabel?: string;
}

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

function parseTimeToMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatTimeLabel(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? 'p' : 'a';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${m.toString().padStart(2, '0')}${period}`;
}

export function isBusinessOpenNow(
  businessHours: BusinessHours | null | undefined,
  now: Date
): OpenStatus {
  if (!businessHours) {
    return { isOpen: false, nextChangeLabel: undefined };
  }
  const dayKey = DAY_KEYS[now.getDay()];
  const entry = businessHours[dayKey];
  if (!entry) {
    return { isOpen: false, nextChangeLabel: undefined };
  }
  const openMin = parseTimeToMinutes(entry.open);
  const closeMin = parseTimeToMinutes(entry.close);
  if (openMin === null || closeMin === null) {
    return { isOpen: false, nextChangeLabel: undefined };
  }
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isOpen = nowMin >= openMin && nowMin < closeMin;
  return {
    isOpen,
    nextChangeLabel: isOpen ? `Closes ${formatTimeLabel(closeMin)}` : undefined,
  };
}
