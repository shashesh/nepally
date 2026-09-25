import { useState } from 'react';
import {
  updateUserProfile,
  bioSchema,
  BIO_MAX_LENGTH,
  fullNameSchema,
  FULL_NAME_MAX_LENGTH,
  userMessage,
} from '@nepally/shared';
import type { User } from '@nepally/shared';
import { usePrompt, notify } from '../components/ui';
import { supabase } from '../lib/supabase';

const NAME_FAILED = "Couldn't update your name. Please try again.";
const BIO_FAILED = "Couldn't update your bio. Please try again.";
const RESET_FAILED = "Couldn't send the reset email. Please try again.";

export interface ProfileEditing {
  editName: () => Promise<void>;
  editBio: () => Promise<void>;
  changePassword: () => Promise<void>;
  /** True from the moment a dialog resolves with a value until the write
   * (and, for name/bio, the follow-up refresh) finishes; also true for the
   * whole of `changePassword`. Lets a caller (e.g. the profile menu) disable
   * the triggering item while a request is in flight. */
  saving: boolean;
}

/**
 * Name, bio and password-reset actions for the profile page's account menu,
 * driven through the shared `usePrompt` dialog instead of `window.prompt`.
 * `ActionMenu` closes itself on selection, so none of these ever need to
 * flip a `menuOpen` flag the way the handlers they replace did.
 *
 * `user` is nullable only because the profile page calls this hook
 * unconditionally, above its own `if (!user) return null;` early return
 * (rules of hooks forbid calling it after that return) — not because the
 * account menu can be reached with no signed-in user. Each action guards on
 * it and is a no-op when it is null.
 */
export function useProfileEditing(
  user: Pick<User, 'id' | 'email' | 'full_name' | 'bio'> | null,
  refreshUser: () => Promise<unknown>
): ProfileEditing {
  const prompt = usePrompt();
  const [saving, setSaving] = useState(false);

  async function editName(): Promise<void> {
    if (!user) return;
    const context = { platform: 'web', userId: user.id };

    const value = await prompt({
      title: 'Edit name',
      label: 'Full name',
      initialValue: user.full_name,
      maxLength: FULL_NAME_MAX_LENGTH,
      validate: (candidate) => {
        const result = fullNameSchema.safeParse(candidate);
        return result.success ? null : result.error.issues[0]?.message || 'Invalid name';
      },
    });
    if (value === null) return;

    setSaving(true);
    try {
      const { error } = await updateUserProfile(supabase, user.id, {
        full_name: fullNameSchema.parse(value),
      });

      if (error) {
        notify.error(userMessage(error, NAME_FAILED, 'profile_name_update_failed', context));
        return;
      }

      await refreshUser();
      notify.success('Profile updated');
    } catch (error) {
      notify.error(userMessage(error, NAME_FAILED, 'profile_name_update_failed', context));
    } finally {
      setSaving(false);
    }
  }

  async function editBio(): Promise<void> {
    if (!user) return;
    const context = { platform: 'web', userId: user.id };

    const value = await prompt({
      title: 'Edit bio',
      label: `Bio (up to ${BIO_MAX_LENGTH} characters)`,
      initialValue: user.bio ?? '',
      multiline: true,
      validate: (candidate) => {
        const result = bioSchema.safeParse(candidate);
        return result.success ? null : result.error.issues[0]?.message || 'Invalid bio';
      },
    });
    if (value === null) return;

    setSaving(true);
    try {
      const bio = bioSchema.parse(value);
      const { error } = await updateUserProfile(supabase, user.id, { bio });

      if (error) {
        notify.error(userMessage(error, BIO_FAILED, 'profile_bio_update_failed', context));
        return;
      }

      await refreshUser();
      notify.success(bio ? 'Bio updated' : 'Bio cleared');
    } catch (error) {
      notify.error(userMessage(error, BIO_FAILED, 'profile_bio_update_failed', context));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(): Promise<void> {
    if (!user) return;
    const context = { platform: 'web', userId: user.id };

    setSaving(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        notify.error(userMessage(error, RESET_FAILED, 'password_reset_request_failed', context));
        return;
      }

      notify.success('Password reset email sent');
    } catch (error) {
      notify.error(userMessage(error, RESET_FAILED, 'password_reset_request_failed', context));
    } finally {
      setSaving(false);
    }
  }

  return { editName, editBio, changePassword, saving };
}
