import {
  getUserProfile as dcGetUserProfile,
  createUserProfile as dcCreateUserProfile,
} from '../../dataconnect-generated/js/default-connector';
import type { GetUserProfileData } from '../../dataconnect-generated/js/default-connector';

// Correctly derive the UserProfile type from the generated GetUserProfileData type.
export type UserProfile = NonNullable<GetUserProfileData['user']>;

/**
 * Gets a user's profile using the DataConnect query.
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data } = await dcGetUserProfile({ userId });
    if (data && data.user) {
      return data.user;
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
    await dcCreateUserProfile({
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
 * Placeholder for checking username availability.
 * This should be refactored to use a DataConnect query for consistency.
 */
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from './firebase';

const db = getFirestore(app);
export const isUsernameAvailable = async (username: string) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
};
