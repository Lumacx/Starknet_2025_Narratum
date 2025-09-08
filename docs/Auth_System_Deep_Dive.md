# Auth System Deep Dive

This document provides a detailed technical overview of Narratum's authentication architecture, including the integration of traditional and Web3 (Starknet) authentication methods, and how user profiles are managed across these systems.

## 1. Overview of Authentication Providers

Narratum leverages Firebase Authentication to manage user identities, supporting multiple providers:

*   **Email/Password:** Standard email and password-based authentication.
*   **Google Sign-In:** Seamless integration with Google accounts for user registration and login.
*   **Starknet Wallet:** Allows users to authenticate using their Starknet wallet, linking to a Firebase user.

## 2. Starknet Wallet Integration

Starknet wallet integration is a key new feature, allowing users to interact with Narratum using their Web3 identity. This is facilitated through the `starknet-react/core` and `starknetkit` libraries.

### 2.1. Libraries Used

*   **`starknet-react/core`:** Provides React hooks and utilities for interacting with Starknet wallets and contracts within a React application.
*   **`starknetkit`:** A modular wallet connection library that abstracts away the complexities of connecting to various Starknet wallets.

### 2.2. The `useAuth` Context and `starknetAddress`

*   The application utilizes a custom `useAuth` context (likely defined in `src/context/AuthContext.tsx`) to manage the global authentication state.
*   This context now includes state to track the connected `starknetAddress` of the user.
*   When a user connects their Starknet wallet, the `starknetAddress` is captured and managed by this context.

### 2.3. Linking Starknet to an Anonymous Firebase User

To ensure all Narratum features (which rely on Firebase user IDs for data ownership) are accessible even for Starknet-only users, a specific flow is implemented:

1.  **Starknet Connection:** When a user connects their Starknet wallet for the first time, Narratum checks if they have an existing Firebase account linked to that Starknet address.
2.  **`signInAnonymously`:** If no existing Firebase account is found, Firebase's `signInAnonymously()` method is called. This creates a temporary, anonymous Firebase user account.
3.  **Address Linkage:** The connected `starknetAddress` is then associated with this anonymous Firebase user. This linkage is persisted in the user's Firestore document.
4.  **Seamless Experience:** From this point onwards, the user can use Narratum's features (e.g., creating stories, favoriting) as if they had a traditional Firebase account, with their data owned by the anonymous Firebase user ID. Their Starknet wallet serves as their primary login mechanism.

### 2.4. `NARRATUM_CONTRACT_ADDRESS` and `save_wallet_data`

*   The `NARRATUM_CONTRACT_ADDRESS` (defined in `src/NarratumContract.abi.json` and likely referenced in `src/constants.ts`) points to a specific Starknet smart contract.
*   The function `save_wallet_data` on this contract (if present and used for authentication purposes beyond purely profile linkage) could be invoked to register the user's wallet with an on-chain component of Narratum, further decentralizing identity or ownership aspects.
    *   **Note:** The exact purpose and invocation of `save_wallet_data` for authentication should be verified. If it's purely for associating a wallet with a user profile *after* Firebase authentication, it would be part of the `User Profile Creation/Update` flow rather than primary authentication.

### 2.5. Persistence of `walletAddress` on Firestore

*   Upon a successful Starknet wallet connection, the `starknetAddress` is stored in the user's document within Firestore (e.g., `firestore.collection('users').doc(firebaseUserId)`).
*   This ensures that the linkage between the Firebase user and their Starknet wallet is persistent across sessions.

## 3. User Profile Creation/Update

Regardless of the authentication method (Email, Google, or Starknet), a consistent user profile management system is in place:

*   **Firebase Auth User:** When a user logs in or signs up, Firebase Authentication provides a unique `user.uid`.
*   **Firestore User Document:** A corresponding document is created or updated in the `users` collection in Firestore, using the `user.uid` as the document ID.
*   **Data Stored:** This document typically stores:
    *   `email`
    *   `displayName`
    *   `avatarUrl`
    *   `starknetAddress` (if connected)
    *   Other user-specific settings or metadata.
*   **`ensureUserProfile.ts`:** A utility function (likely `src/lib/ensureUserProfile.ts`) is responsible for ensuring that a Firestore user document exists and is up-to-date whenever a user authenticates.

This robust authentication system provides flexibility for users while maintaining a centralized and consistent profile management backend through Firebase Firestore.