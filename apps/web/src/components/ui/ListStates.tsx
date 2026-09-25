import React, { type ReactElement, type ReactNode } from 'react';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

export interface ListStatesProps {
  loading: boolean;
  loadingLabel: string;
  /** Shown with a retry; takes precedence over empty. */
  error: string | null;
  onRetry: () => void;
  isEmpty: boolean;
  /** Usually an EmptyState. */
  empty: ReactNode;
  children: ReactNode;
}

/** loading → error with retry → empty → children. */
export function ListStates({
  loading,
  loadingLabel,
  error,
  onRetry,
  isEmpty,
  empty,
  children,
}: ListStatesProps): ReactElement {
  if (loading) return <LoadingState label={loadingLabel} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (isEmpty) return <>{empty}</>;
  return <>{children}</>;
}
