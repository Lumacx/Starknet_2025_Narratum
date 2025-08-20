// src/lib/userUtils.ts
import * as dc from '@firebasegen/default-connector';
import type { GetUserProfileData } from '@firebasegen/default-connector';

// Canonical user profile type from the generated query result
export type UserProfile = NonNullable<GetUserProfileData['user']>;

/**
 * Small helper that normalizes SDK returns across versions:
 * Some builds return GetUserProfileData directly, others wrap it as { data }.
 */
function unwrapData<T>(res: T | { data: T }): T {
  return (res as any)?.data ?? (res as any);
}

/**
 * Fetch a user's profile by uid using the generated SDK.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    // NOTE: In your SDK build, dc.getUserProfile is typed as a QueryResult wrapper.
    // We normalize the return shape with unwrapData.
    const raw = await (dc as any).getUserProfile({ userId });
    const data = unwrapData<GetUserProfileData>(raw);
    return (data?.user ?? null) as UserProfile | null;
  } catch (err) {
    console.error('DataConnect getUserProfile failed:', err);
    return null;
  }
}

/**
 * Create a user profile, then refetch it to return the canonical shape.
 * The mutation does not accept userId; auth context supplies it.
 */
export async function createUserProfile(profileData: {
  userId: string;
  email: string;
  username: string;
  displayname: string;
  avatarUrl?: string;
}): Promise<UserProfile> {
  try {
    await (dc as any).createUserProfile({
      username: profileData.username,
      email: profileData.email,
      displayname: profileData.displayname,
      avatarUrl: profileData.avatarUrl,
    });

    const newUser = await getUserProfile(profileData.userId);
    if (!newUser) throw new Error('Failed to fetch user profile after creation.');
    return newUser;
  } catch (err) {
    console.error('DataConnect createUserProfile failed:', err);
    throw err;
  }
}

/**
 * Username availability check.
 * If you add this query to dataconnect/connector/queries.gql and regenerate:
 *
 *   query CheckUsernameAvailable($username: String!) {
 *     users(where: { username: { eq: $username } }, limit: 1) { id }
 *   }
 *
 * it will be available as dc.checkUsernameAvailable.
 * Until then, we fall back to "true" so the UI can proceed.
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  try {
    const maybe = (dc as any).checkUsernameAvailable;
    if (typeof maybe === 'function') {
      const raw = await maybe({ username });
      const data = unwrapData<{ users?: Array<{ id: string }> }>(raw);
      return (data.users?.length ?? 0) === 0;
    }
    return true; // op not generated yet
  } catch (err) {
    console.error('DataConnect isUsernameAvailable failed:', err);
    return false;
  }
}
