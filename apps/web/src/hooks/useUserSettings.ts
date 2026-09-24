import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_USER_SETTINGS, getUserSettings, upsertUserSettings } from '@nepally/shared';
import type { UserSettings, UserSettingsValues } from '@nepally/shared';
import { supabase } from '../lib/supabase';

const LOAD_ERROR = "Couldn't load your notification preferences.";

export interface UserSettingsState {
  /** Null while loading and after a failed load, so nothing unloaded can be saved. */
  values: UserSettingsValues | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setValue: <K extends keyof UserSettingsValues>(key: K, value: UserSettingsValues[K]) => void;
  saving: boolean;
  /** Resolves false on failure, keeping the edits. A second call while saving resolves false with no request. */
  save: () => Promise<boolean>;
}

/** The editable fields of a row: never user_id or the timestamps. */
function toValues(row: UserSettings): UserSettingsValues {
  return {
    email_notifications: row.email_notifications,
    push_notifications: row.push_notifications,
    emergency_alerts: row.emergency_alerts,
    metro_area_alerts: row.metro_area_alerts,
    notify_chat: row.notify_chat,
    notify_comments: row.notify_comments,
    notify_likes: row.notify_likes,
  };
}

/**
 * A member's notification preferences, for the preferences page.
 *
 * A failed load leaves `values` null rather than falling back to the
 * defaults: showing defaults there let Save overwrite the member's real
 * settings with them (recon 16). Defaults are only for a member who has no
 * row yet.
 */
export function useUserSettings(userId: string | null): UserSettingsState {
  const [values, setValues] = useState<UserSettingsValues | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const savingRef = useRef(false);

  // A different member starts from nothing (react.dev: adjusting state when a prop changes).
  const [loadedUserId, setLoadedUserId] = useState(userId);
  if (userId !== loadedUserId) {
    setLoadedUserId(userId);
    setValues(null);
    setLoading(Boolean(userId));
    setError(null);
  }

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void getUserSettings(supabase, userId).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setValues(null);
        setError(LOAD_ERROR);
      } else {
        setValues(result.data ? toValues(result.data) : { ...DEFAULT_USER_SETTINGS });
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const reload = useCallback(() => {
    setValues(null);
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const setValue = useCallback(<K extends keyof UserSettingsValues>(key: K, value: UserSettingsValues[K]) => {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (!userId || !values || savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    try {
      const result = await upsertUserSettings(supabase, userId, values);
      return !result.error;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [userId, values]);

  return {
    values: userId ? values : null,
    loading: Boolean(userId) && loading,
    error,
    reload,
    setValue,
    saving,
    save,
  };
}
