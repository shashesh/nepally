import { supabase } from '../../config/supabase';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  zip_code?: string;
  metro_area_id?: string;
  trust_level: number;
  created_at: string;
}

interface UserResult {
  data?: User;
  error?: Error;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserResult> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('User not found');

    return { data: data as User };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch user'),
    };
  }
}

/**
 * Update user location (ZIP code and metro area)
 */
export async function updateUserLocation(
  userId: string,
  zipCode: string,
  metroAreaId: string
): Promise<UserResult> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        zip_code: zipCode,
        metro_area_id: metroAreaId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update user');

    return { data: data as User };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to update user location'),
    };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'full_name' | 'phone'>>
): Promise<UserResult> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update profile');

    return { data: data as User };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to update profile'),
    };
  }
}

/**
 * Create user profile (called after auth signup)
 */
export async function createUserProfile(
  userId: string,
  email: string,
  fullName: string
): Promise<UserResult> {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        trust_level: 0, // Start at Level 0
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create profile');

    return { data: data as User };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to create profile'),
    };
  }
}
