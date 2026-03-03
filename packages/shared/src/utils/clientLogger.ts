export type ClientLogLevel = 'error' | 'warn' | 'info';

export interface ClientLogPayload {
  event: string;
  level?: ClientLogLevel;
  context?: Record<string, unknown>;
  error?: unknown;
}

function getErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return undefined;
}

export function logClientEvent(payload: ClientLogPayload): void {
  const level = payload.level ?? 'error';
  const normalized = {
    event: payload.event,
    context: payload.context ?? {},
    error: getErrorMessage(payload.error),
  };

  if (level === 'warn') {
    console.warn(payload.event, normalized);
    return;
  }

  if (level === 'info') {
    console.info(payload.event, normalized);
    return;
  }

  console.error(payload.event, normalized);
}
