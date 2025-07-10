import * as dataConnector from '../../dataconnect-generated/js/default-connector';
import type { GetUserProfileData } from '../../dataconnect-generated/js/default-connector';

// Correctly derive the UserProfile type from the generated GetUserProfileData type.
export type UserProfile = NonNullable<GetUserProfileData['user']>;

/**
 * Gets a user's profile using the DataConnect query.
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const result = await dataConnector.getUserProfile({ userId });
    if (result && result.user) {
      return result.user as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("DataConnect error in getUserProfile:", error);
    return null;
  }
};

/**
 * Creates a user profile using the DataConnect mutation.
 */
export const createUserProfile = async (
  profileData: { userId: string, email: string; username: string; displayname: string }
): Promise<UserProfile> => {
  try {
    // DataConnect infers the creator from the auth context, but we pass the data.
    await dataConnector.createUserProfile({
      email: profileData.email,
      username: profileData.username,
      displayname: profileData.displayname,
    });
    
    // Fetch the newly created user to ensure it exists before proceeding.
    const newUser = await getUserProfile(profileData.userId);
    if (!newUser) {
      throw new Error("Failed to fetch user profile after creation.");
    }
    return newUser;
  } catch (error) {
    console.error("DataConnect error in createUserProfile:", error);
    throw error;
  }
};

/**
 * Checks if a username is available using a DataConnect query.
 */
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    const result = await dataConnector.isUsernameAvailable({ username });
    return result.users.length === 0;
  } catch (error) {
    console.error("DataConnect error in isUsernameAvailable:", error);
    // In case of an error, assume the username is not available to be safe.
    return false;
  }
};
