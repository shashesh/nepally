import { updateUserProfile, bioSchema, BIO_MAX_LENGTH } from '@nepally/shared';
import type { User } from '@nepally/shared';
import { usePrompt, notify } from '../components/ui';
import { supabase } from '../lib/supabase';

export interface ProfileEditing {
  editName: () => Promise<void>;
  editBio: () => Promise<void>;
  changePassword: () => Promise<void>;
}

/**
 * Name, bio and password-reset actions for the profile page's account menu,
 * driven through the shared `usePrompt` dialog instead of `window.prompt`.
 * `ActionMenu` closes itself on selection, so unlike the handlers this
 * replaces, none of these ever need to flip a `menuOpen` flag.
 *
 * All three are no-ops when `user` is null (profile page renders null in
 * that case, but the menu's onClick handlers can still be wired up before
 * the redirect effect runs).
 */
export function useProfileEditing(
  user: Pick<User, 'id' | 'email' | 'full_name' | 'bio'> | null,
  refreshUser: () => Promise<void>
): ProfileEditing {
  const prompt = usePrompt();

  async function editName(): Promise<void> {
    if (!user) return;

    const value = await prompt({
      title: 'Edit name',
      label: 'Full name',
      initialValue: user.full_name ?? '',
      validate: (candidate) => (candidate.trim() ? null : 'Name cannot be empty'),
    });
    if (value === null) return;

    const { error } = await updateUserProfile(supabase, user.id, {
      full_name: value.trim(),
    });

    if (error) {
      notify.error(error.message || 'Failed to update profile');
      return;
    }

    await refreshUser();
    notify.success('Profile updated');
  }

  async function editBio(): Promise<void> {
    if (!user) return;

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

    const bio = bioSchema.parse(value);

    const { error } = await updateUserProfile(supabase, user.id, { bio });

    if (error) {
      notify.error(error.message || 'Failed to update bio');
      return;
    }

    await refreshUser();
    notify.success(bio ? 'Bio updated' : 'Bio cleared');
  }

  async function changePassword(): Promise<void> {
    if (!user) return;

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      notify.error(error.message || 'Failed to send password reset email');
      return;
    }

    notify.success('Password reset email sent');
  }

  return { editName, editBio, changePassword };
}
