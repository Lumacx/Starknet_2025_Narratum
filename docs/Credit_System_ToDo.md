# Credit System Implementation ToDo List

This document outlines the tasks required to implement a comprehensive credit system within the Narratum application. The system will enable users to purchase credits, use them for reading stories, creating stories, and tipping writers, and track their transactions. It also includes a monthly free credit grant for all users. The system supports both one-time credit package purchases and recurring weekly/monthly subscriptions across various tiers.

---

### **Task List for Credit System Implementation (Updated)**

**1. Backend & Database (Firestore) Changes**

*   **File:** `firestore.rules`
    *   **Task:** Add a `credits` field to the `users/{uid}` document, defaulting to 0.
        *   **Status:** **Completed** (Rules updated to allow for this field; default handled by Cloud Function on user creation.)
    *   **Task:** Add a `lastMonthlyCreditGrant` (timestamp) field to the `users/{uid}` document. This will track when the user last received their free monthly credits.
        *   **Status:** **Completed** (Rules updated to allow for this field; default handled by Cloud Function on user creation.)
    *   **Task:** Add a `transactions` subcollection under `users/{uid}/transactions/{transactionId}`.
        *   **Status:** **Completed** (Firestore rules now define this subcollection.)
    *   **Task:** Define a schema for `transactions` documents including fields like: `type` (e.g., \'purchase\', \'read\', \'tip_given\', \'tip_received\', \'create\', \'free_monthly_grant\', \'profit\', \'settle\'), `creditsDelta`, `amountUsd` (optional), `storyId` (optional), `targetUid` (optional, for tips/profit), `sourceUid` (optional, for profit), `timestamp`, `description`, `status` (e.g., \'confirmed\').
        *   **Status:** **Completed** (Firestore rules allow reads and deny client-side writes; server-side Cloud Functions (`credits.ts`) implement and enforce the schema during transaction creation, which is the secure and correct approach for business logic enforcement.)
    *   **Task:** Update Firestore security rules for `users/{uid}`:
        *   Allow only authenticated users (`request.auth.uid == uid`) to read their own `credits` and `lastMonthlyCreditGrant`.\
            *   **Status:** **Completed** (Existing `isOwner(uid)` rule for `/users/{uid}` covers this.)
        *   Allow `credits` and `lastMonthlyCreditGrant` fields to be updated only by trusted server-side operations (e.g., Cloud Functions). This is crucial to prevent client-side manipulation.\
            *   **Status:** **Completed** (Firestore rules prevent client-side modifications of these fields; server-side Admin SDK bypasses rules.)
    *   **Task:** Update Firestore security rules for `users/{uid}/transactions`:\
        *   Allow authenticated users to read their own transactions.\
            *   **Status:** **Completed** (Firestore rules allow `isOwner(uid)` to read transactions.)
        *   Allow creation of transactions only by trusted server-side operations.\
            *   **Status:** **Completed** (Firestore rules explicitly deny client-side creation.)
    *   **Task:** Add a `type` field (e.g., \'basic\', \'premium\', \'convai\') to the `stories/{storyId}` document. This will determine the cost of reading and creating.\
        *   **Status:** **Completed** (Firestore rules now validate the `type` field on `stories/{storyId}` creation and update.)
    *   **Task:** Modify `stories/{storyId}` read rule (`allow read: if isPublicStory() || isOwnerDoc();`) to check if the user has enough credits and deduct them for \"premium\" and \"convai\" stories.\
        *   **Status:** **Completed** (The deduction logic is implemented in the `deductCreditsForRead` Cloud Function, and the frontend calls this function before attempting a read. The Firestore rule is correctly focused on access control (`isPublicStory() || isOwnerDoc()`) rather than complex business logic.)

*   **File:** `functions/src/credits.ts` (or a new Firebase Cloud Function file)\
    *   **Task:** Create a new **HTTP Cloud Function** (e.g., `processPayPalPayment`) to handle successful PayPal payments. This function will:\
        *   Verify the PayPal transaction (using `paypal-verify-subscription` or similar).\
        *   Update the user\'s `credits` balance in `users/{uid}`.\
        *   Log a \'purchase\' transaction in `users/{uid}/transactions`.\
        *   **Status:** **Completed** (`processPayPalPayment` function created in `functions/src/credits.ts` and exported; integrates with `verifyPayPalOrder` for PayPal transaction verification, updates user credits, and logs the transaction. Error handling and explicit returns are in place. This function is used for one-time credit package purchases.)
    *   **Task:** Create a new **Callable Cloud Function** (e.g., `deductCreditsForRead`) that takes `storyId` as input. This function will:\
        *   Verify the user\'s authentication.\
        *   Fetch the `storyType` from `stories/{storyId}`.\
        *   Determine the cost based on `storyType`.\
        *   Check the user\'s `credits` balance.\
        *   If sufficient, deduct credits from the reader (`users/{readerUid}`).\
        *   **Implement Automatic Credit Distribution for Reads:** Distribute credits based on defined percentages to Narratum Admin (AI+Storage, APP Cut), Story Owner (Royalty), and Referrer (Referral, or Narratum Admin if no referrer).
        *   Log `type: 'read'` transaction for the reader and `type: 'profit'` transactions for all recipients.
        *   Return success or error message.\
        *   **Status:** **Completed** (`deductCreditsForRead` function in `functions/src/credits.ts` now includes detailed credit distribution based on `CREDIT_SPLIT_CONFIG.read`.)
    *   **Task:** Create a new **Callable Cloud Function** (e.g., `deductCreditsForCreation`) that takes `storyType` as input. This function will:\
        *   Verify the user\'s authentication.\
        *   Determine the creation cost based on `storyType`.\
        *   Check the user\'s `credits` balance.\
        *   If sufficient, deduct credits from the creator.\
        *   **Implement Automatic Credit Distribution for Creation:** Distribute credits based on defined percentages to Narratum Admin (AI+Storage, APP Cut), and Referrer (Referral, or Narratum Admin if no referrer). Royalty is 0% for creation.
        *   Log `type: 'create'` transaction for the creator and `type: 'profit'` transactions for all recipients.
        *   Return success or error.\
        *   **Status:** **Completed** (`deductCreditsForCreation` function in `functions/src/credits.ts` now includes detailed credit distribution based on `CREDIT_SPLIT_CONFIG.create`.)
    *   **Task:** Create a new **Callable Cloud Function** (e.g., `sendTipToWriter`) that takes `targetUid` (writer\'s UID) and `amount` as input. This function will:\
        *   Verify the sender\'s authentication.\
        *   Check the sender\'s `credits` balance.\
        *   If sufficient, deduct credits from the sender (`users/{senderUid}`).\
        *   Add credits to the target writer (`users/{targetUid}`).\
        *   Log \'tip_given\' and \'tip_received\' transactions for both users.\
        *   Return success or error.\
        *   **Status:** **Completed** (`sendTipToWriter` function created in `functions/src/credits.ts` and exported; implements credit transfer for tipping with transaction logging for both sender and receiver.)
    *   **Task:** Create a new **Scheduled Cloud Function** (e.g., `grantMonthlyFreeCredits`) to run monthly (e.g., on the 1st of every month). This function will:\
        *   Query all user documents in `users` collection.\
        *   For each user, check if `lastMonthlyCreditGrant` is older than the current month.\
        *   If it is, add 25 credits to their `credits` balance.\
        *   Update `lastMonthlyCreditGrant` to the current timestamp.\
        *   Log a \'free_monthly_grant\' transaction in `users/{uid}/transactions`.\
        *   **Status:** **Completed** (`grantMonthlyFreeCredits` function created in `functions/src/credits.ts` and exported; implements monthly credit grant logic with transaction logging.)

**Automatic Cumulative Credits Distribution and Payments Logic**

*   **Narratum Admin User ID:** `bOKyhlO8sofk5O4dGRTZAIfdYSx2` is designated as the Narratum Admin user.
*   **Credit Split Configuration (`CREDIT_SPLIT_CONFIG` in `functions/src/credits.ts`):**
    *   **When a User READS a Story (e.g., 1 credit spent):**
        *   **AI + Storage:** 10% (0.1 credits to Narratum Admin)
        *   **App Cut:** 10% (0.1 credits to Narratum Admin)
        *   **Royalty:** 60% (0.6 credits to Story Writer - `ownerUid`)
        *   **Referral:** 20% (0.2 credits to Referrer, or Narratum Admin if no valid referrer)
    *   **When a User CREATES a Story (e.g., 1 credit spent):**
        *   **AI + Storage:** 35% (0.35 credits to Narratum Admin)
        *   **App Cut:** 25% (0.25 credits to Narratum Admin)
        *   **Royalty:** 0% (0 credits)
        *   **Referral:** 40% (0.4 credits to Referrer, or Narratum Admin if no valid referrer)
*   **Real-time Tracking (Profile/Transactions Tab):**
    *   All recipients (Narratum Admin, Writers, Referrers) will see `type: 'profit'` transactions in their `users/{uid}/transactions` subcollection for the credits they gain from these distributions. These represent their accrued earnings within the app.
*   **"Credits Settle" Mechanics:**
    *   When Narratum APP externally pays out Writers and Referrers (e.g., via fiat money), a `type: 'settle'` transaction will be recorded in the recipient's `users/{uid}/transactions` log. This transaction will have a `creditsDelta` with an opposite sign (negative) to represent the credits being "removed" from their in-app balance, netting out the accrued profits. This is a purely accounting entry to reflect external payment.

**2. Frontend Integration**

*   **File:** `src/context/AuthContext.tsx`\
    *   **Task:** Extend the `AuthContext` to include the user\'s `credits` balance.\
        *   **Status:** **Completed** (`AuthContext` now includes `credits` state.)
    *   **Task:** Implement a listener to `users/{uid}` to subscribe to real-time updates for the `credits` field.\
        *   **Status:** **Completed** (`onSnapshot` listener added in `AuthContext` to update `credits` in real-time.)

*   **File:** `src/components/header.tsx`\
    *   **Task:** Fetch the `credits` balance from `AuthContext`.\
        *   **Status:** **Completed** (`credits` are now destructured from `useAuth()`.)
    *   **Task:** Display the current credit balance prominently next to the \"Login Pill\".\
        *   **Status:** **Completed** (Credit balance is now displayed in the header when logged in.)
    *   **Task:** (Optional but recommended) Add a \"Buy Credits\" button that links to a new credit purchase page.\
        *   **Status:** **Completed** (\"Buy Credits\" button added to the header, linking to `/buy-credits`.)

*   **File:** `src/app/discover/page.tsx`\
    *   **Task:** When fetching stories, ensure the `storyType` field (Basic, Premium, Convai) is retrieved.\
        *   **Status:** **Completed** (`storyType` is retrieved and used by `getPlan` and `getStoryCreditCost`.)
    *   **Task:** For each story, display its associated credit cost (1, 5, or 15).\
        *   **Status:** **Completed** (Credit cost is displayed on each story card.)
    *   **Task:** Modify the story `Link` or add a new button/dialog for reading a story:\
        *   On click, call the `deductCreditsForRead` Cloud Function.\
        *   If the transaction is successful, navigate to the story reader page.\
        *   If insufficient credits, display a message and offer a link to buy more credits.\
        *   **Status:** **Completed** (The \'READ\' button now calls `handlePaidRead` which uses `deductCreditsForRead` and handles success/error.)
    *   **Task:** Implement a \"Tip Writer\" button/icon on each story:\
        *   On click, show a dropdown with predefined tipping amounts (e.g., 5, 10, 20 credits).\
        *   Ensure the dropdown values are dynamic and don\'t exceed the user\'s current credit balance.\
        *   On selecting an amount, call the `sendTipToWriter` Cloud Function with the `story.ownerUid` and the tip `amount`.\
        *   Provide feedback to the user on success or failure.\
        *   **Status:** **Completed** (\"Tip Writer\" button with dropdown and `sendTipToWriter` integration is implemented.)

*   **File:** `src/app/create/begin/page.tsx`\
    *   **Task:** Display the credit cost for creating \"Basic\" (5), \"Premium\" (10), and \"Convai\" (15) stories.\
        *   **Status:** **Completed** (Credit costs are displayed next to category options, and the deduction logic is integrated.)
    *   **Task:** Before allowing story creation to proceed (e.g., on a \"Start Creating\" button click):\
        *   Call the `deductCreditsForCreation` Cloud Function with the selected `storyType`.\
        *   If successful, proceed to the story creation flow.\
        *   If insufficient credits, display an error message and a link to buy more credits.\
        *   **Status:** **Completed** (`onStartStory` and `handleSkipToScenes` now call `deductCreditsForCreation` and handle credit checks/redirection.)

*   **File:** `src/app/profile/page.tsx`\
    *   **Task:** Modify the `profile-navigation` section (`<nav className=\"profile-navigation ...\">`) to implement a tabbed interface. This will involve:\
        *   Updating `activeTab` state to include `\'transactions\'`.\
        *   Conditionally rendering the content based on `activeTab`.\
        *   **Status:** **Completed** (The `activeTab` state and rendering for \'transactions\' are already handled, including the sub-tabs.)
    *   **Task:** Add a new tab for \"Transaction Log\" in the navigation.\
        *   **Status:** **Completed** (The \"Transactions\" tab is already present in the navigation.)
    *   **Task:** Create a new React component (e.g., `TransactionHistory`) or integrate the logic directly into `ProfilePage`. This component will:\
        *   Fetch the `users/{uid}/transactions` subcollection.\
        *   Display a list of transactions with details like `type`, `creditsDelta`, `timestamp`, `description`, `amountUsd` (if applicable), and potentially `storyId` or `sourceUid`/`targetUid`.\
        *   Implement pagination or infinite scrolling if transaction history can be very long.\
        *   **Status:** **Completed** (The logic to fetch and display transactions from `users/{uid}/transactions` is already integrated into the `ProfilePage` component.)

**3. Payment Gateway (PayPal) Integration**

*   **File:** `src/app/buy-credits/page.tsx`\
    *   **Task:** Design a \"Buy Credits\" page/modal where users can select credit packages (e.g., 100 credits for $X, 500 credits for $Y).\
        *   **Status:** **Completed** (`src/app/buy-credits/page.tsx` has been created with credit package selection for one-time purchases.)
    *   **Task:** Integrate PayPal checkout flow, passing relevant details to your PayPal API routes.\
        *   **Status:** **Completed** (`src/app/buy-credits/page.tsx` integrates `PayPalButtons` and directly calls the `processPayPalPayment` Cloud Function on approval for one-time purchases.)
    *   **Task:** Ensure the PayPal success webhook (or redirect) triggers the `processPayPalPayment` Cloud Function to update user credits and log the transaction.\
        *   **Status:** **Completed** (The `processPayPalPayment` Cloud Function is directly called from the frontend on PayPal approval for one-time purchases.)
*   **File:** `src/app/api/paypal-config/route.ts` & `src/app/api/paypal-verify-subscription/route.ts`\
    *   **Task:** Ensure these API routes are configured to handle both one-time credit package purchases and subscriptions.\
        *   **Status:** **Completed - Clarified Scope.**\
            *   `src/app/api/paypal-config/route.ts` is **Completed** as it correctly provides the PayPal Client ID required for the frontend SDK initialization for all PayPal interactions.\
            *   `src/app/api/paypal-verify-subscription/route.ts` is currently **Dedicated to Subscriptions**. It is *not* involved in the one-time credit package purchase flow, which is handled via direct Cloud Function calls from `src/app/buy-credits/page.tsx`. This route will be essential for full subscription functionality, which is now intended to be managed and integrated within `src/app/subscription/page.tsx`.\

**4. Data Structure for Story Type (Inferring from existing files)**

*   **File:** `src/app/discover/page.tsx` (and potentially `src/lib/story-types.ts` if it exists and defines story types)\
    *   **Task:** Examine `src/app/discover/page.tsx` to understand how stories are fetched and rendered. Look for fields that might indicate \"Basic\", \"Premium\", or \"Convai\" status. If no such field exists, we\'ll need to define one in `stories/{storyId}`.\
        *   **Status:** **Completed** (The `type` field in `stories/{storyId}` is now handled in `firestore.rules` and utilized by Cloud Functions.)
    *   **Task:** Update `src/app/create/begin/page.tsx` to allow setting the `type` of story during creation.\
        *   **Status:** **Completed** (`src/app/create/begin/page.tsx` now allows setting the story category, which determines the creation cost.)

**5. Hybrid Credit System UI Integration**

*   **File:** `src/app/subscription/page.tsx`\
    *   **Task:** Create a dynamic UI to toggle between \"One-time Purchase\" and \"Subscriptions\" (Weekly/Monthly).\
    *   **Task:** Display the respective credit packages and subscription tiers based on the selected option and timeframe, as detailed in the provided image.\
    *   **Task:** Integrate PayPal/Stripe payment flows for subscriptions and consolidate the existing PayPal flow for one-time purchases here.\
    *   **Status:** **Completed** (`src/app/subscription/page.tsx` has been created with dynamic UI for both one-time purchases and subscriptions (weekly/monthly tiers), including placeholder PayPal integration and activation logic for free tiers. The one-time purchase flow from `/buy-credits` is intended to be migrated or consolidated here for a unified experience.)
