# Credit System Implementation ToDo List

This document outlines the tasks required to implement a comprehensive credit system within the Narratum application. The system will enable users to purchase credits, use them for reading stories, creating stories, and tipping writers, and track their transactions. It also includes a monthly free credit grant for all users.

---

### **Task List for Credit System Implementation (Updated)**

**1. Backend & Database (Firestore) Changes**

*   **File:** `firestore.rules`
    *   **Task:** Add a `credits` field to the `users/{uid}` document, defaulting to 0.
    *   **Task:** Add a `lastMonthlyCreditGrant` (timestamp) field to the `users/{uid}` document. This will track when the user last received their free monthly credits.
    *   **Task:** Add a `transactions` subcollection under `users/{uid}/transactions/{transactionId}`.
    *   **Task:** Define a schema for `transactions` documents including fields like: `type` (e.g., 'purchase', 'read', 'tip_given', 'tip_received', 'create', 'free_monthly_grant'), `amount`, `storyId` (optional), `targetUid` (optional, for tips), `timestamp`, `description`.
    *   **Task:** Update Firestore security rules for `users/{uid}`:
        *   Allow only authenticated users (`request.auth.uid == uid`) to read their own `credits` and `lastMonthlyCreditGrant`.
        *   Allow `credits` and `lastMonthlyCreditGrant` fields to be updated only by trusted server-side operations (e.g., Cloud Functions). This is crucial to prevent client-side manipulation.
    *   **Task:** Update Firestore security rules for `users/{uid}/transactions`:
        *   Allow authenticated users to read their own transactions.
        *   Allow creation of transactions only by trusted server-side operations.
    *   **Task:** Add a `type` field (e.g., 'basic', 'premium', 'convai') to the `stories/{storyId}` document. This will determine the cost of reading and creating.
    *   **Task:** Modify `stories/{storyId}` read rule (`allow read: if isPublicStory() || isOwnerDoc();`) to check if the user has enough credits and deduct them for "premium" and "convai" stories. This will likely involve a Cloud Function triggered on read.

*   **File:** `functions/src/index.ts` (or a new Firebase Cloud Function file)
    *   **Task:** Create a new **HTTP Cloud Function** (e.g., `processPayPalPayment`) to handle successful PayPal payments. This function will:
        *   Verify the PayPal transaction (using `paypal-verify-subscription` or similar).
        *   Update the user's `credits` balance in `users/{uid}`.
        *   Log a 'purchase' transaction in `users/{uid}/transactions`.
    *   **Task:** Create a new **Callable Cloud Function** (e.g., `deductCreditsForRead`) that takes `storyId` as input. This function will:
        *   Verify the user's authentication.
        *   Fetch the `storyType` from `stories/{storyId}`.
        *   Determine the cost based on `storyType`.
        *   Check the user's `credits` balance.
        *   If sufficient, deduct credits from the reader (`users/{readerUid}`).
        *   Add credits to the story owner (`users/{ownerUid}`) for the read (if desired, or split a portion).
        *   Log 'read' and 'read_earning' (for owner) transactions.
        *   Return success or error message.
    *   **Task:** Create a new **Callable Cloud Function** (e.g., `deductCreditsForCreation`) that takes `storyType` as input. This function will:
        *   Verify the user's authentication.
        *   Determine the creation cost based on `storyType`.
        *   Check the user's `credits` balance.
        *   If sufficient, deduct credits from the creator.
        *   Log a 'create' transaction.
        *   Return success or error.
    *   **Task:** Create a new **Callable Cloud Function** (e.g., `sendTipToWriter`) that takes `targetUid` (writer's UID) and `amount` as input. This function will:
        *   Verify the sender's authentication.
        *   Check the sender's `credits` balance.
        *   If sufficient, deduct credits from the sender (`users/{senderUid}`).
        *   Add credits to the target writer (`users/{targetUid}`).
        *   Log 'tip_given' and 'tip_received' transactions for both users.
        *   Return success or error.
    *   **Task:** Create a new **Scheduled Cloud Function** (e.g., `grantMonthlyFreeCredits`) to run monthly (e.g., on the 1st of every month). This function will:
        *   Query all user documents in `users` collection.
        *   For each user, check if `lastMonthlyCreditGrant` is older than the current month.
        *   If it is, add 25 credits to their `credits` balance.
        *   Update `lastMonthlyCreditGrant` to the current timestamp.
        *   Log a 'free_monthly_grant' transaction in `users/{uid}/transactions`.

**2. Frontend Integration**

*   **File:** `src/context/AuthContext.tsx`
    *   **Task:** Extend the `AuthContext` to include the user's `credits` balance.
    *   **Task:** Implement a listener to `users/{uid}` to subscribe to real-time updates for the `credits` field.

*   **File:** `src/components/header.tsx`
    *   **Task:** Fetch the `credits` balance from `AuthContext`.
    *   **Task:** Display the current credit balance prominently next to the "Login Pill".
    *   **Task:** (Optional but recommended) Add a "Buy Credits" button that links to a new credit purchase page.

*   **File:** `src/app/discover/page.tsx`
    *   **Task:** When fetching stories, ensure the `storyType` field (Basic, Premium, Convai) is retrieved.
    *   **Task:** For each story, display its associated credit cost (1, 5, or 15).
    *   **Task:** Modify the story `Link` or add a new button/dialog for reading a story:
        *   On click, call the `deductCreditsForRead` Cloud Function.
        *   If the transaction is successful, navigate to the story reader page.
        *   If insufficient credits, display a message and offer a link to buy more credits.
    *   **Task:** Implement a "Tip Writer" button/icon on each story:
        *   On click, show a dropdown with predefined tipping amounts (e.g., 5, 10, 20 credits).
        *   Ensure the dropdown values are dynamic and don't exceed the user's current credit balance.
        *   On selecting an amount, call the `sendTipToWriter` Cloud Function with the `story.ownerUid` and the tip `amount`.
        *   Provide feedback to the user on success or failure.

*   **File:** `src/app/create/begin/page.tsx`
    *   **Task:** Display the credit cost for creating "Basic" (5), "Premium" (10), and "Convai" (15) stories.
    *   **Task:** Before allowing story creation to proceed (e.g., on a "Start Creating" button click):
        *   Call the `deductCreditsForCreation` Cloud Function with the selected `storyType`.
        *   If successful, proceed to the story creation flow.
        *   If insufficient credits, display an error message and a link to buy more credits.

*   **File:** `src/app/profile/page.tsx`
    *   **Task:** Modify the `profile-navigation` section (`<nav className="profile-navigation ...">`) to implement a tabbed interface. This will involve:
        *   Updating `activeTab` state to include `'transactions'`.
        *   Conditionally rendering the content based on `activeTab`.
    *   **Task:** Add a new tab for "Transaction Log" in the navigation.
    *   **Task:** Create a new React component (e.g., `TransactionHistory`) or integrate the logic directly into `ProfilePage`. This component will:
        *   Fetch the `users/{uid}/transactions` subcollection.
        *   Display a list of transactions with details like `type`, `amount`, `timestamp`, `description`, and potentially `storyTitle` or `writerName`.
        *   Implement pagination or infinite scrolling if transaction history can be very long.

**3. Payment Gateway (PayPal) Integration**

*   **File:** `src/app/api/paypal-config/route.ts` & `src/app/api/paypal-verify-subscription/route.ts`
    *   **Task:** Ensure these API routes are configured to handle one-time credit package purchases, not just subscriptions.
    *   **Task:** Design a "Buy Credits" page/modal where users can select credit packages (e.g., 100 credits for $X, 500 credits for $Y).
    *   **Task:** Integrate PayPal checkout flow, passing relevant details to your PayPal API routes.
    *   **Task:** Ensure the PayPal success webhook (or redirect) triggers the `processPayPalPayment` Cloud Function to update user credits and log the transaction.

**4. Data Structure for Story Type (Inferring from existing files)**

*   **File:** `src/app/discover/page.tsx` (and potentially `src/lib/story-types.ts` if it exists and defines story types)
    *   **Task:** Examine `src/app/discover/page.tsx` to understand how stories are fetched and rendered. Look for fields that might indicate "Basic", "Premium", or "Convai" status. If no such field exists, we'll need to define one in `stories/{storyId}`.
    *   **Task:** Update `src/app/create/begin/page.tsx` to allow setting the `type` of story during creation.

---

## Key Components & Interactions:

*   **Firestore:** Centralized storage for user `credits`, `lastMonthlyCreditGrant`, `transactions` subcollection, and `storyType` for `stories`. Strict security rules are paramount.
*   **Firebase Cloud Functions:** Essential for secure and atomic operations:
    *   Processing PayPal payments and updating credits.
    *   Deducting credits for reading and creating stories.
    *   Handling tipping between users.
    *   **Scheduled function** for granting monthly free credits.
*   **Next.js Frontend:**
    *   **AuthContext:** Will be the source of truth for current user credits.
    *   **Header Component:** Global display of credit balance.
    *   **Discover Page:** Logic for displaying story costs, deducting credits on read, and facilitating tipping.
    *   **Create Page:** Logic for displaying creation costs and deducting credits on creation.
    *   **Profile Page:** New "Transaction Log" tab for users to review their credit history.
*   **PayPal API Routes:** Existing routes (`src/app/api/paypal-config/route.ts`, `src/app/api/paypal-verify-subscription/route.ts`) will need to be extended to handle one-time credit purchases, ensuring proper verification and triggering the Cloud Function.

## Important Considerations:

*   **Security:** All credit-related operations (deductions, additions, transaction logging) *must* be handled on the server-side via Firebase Cloud Functions to prevent tampering. Firestore security rules will enforce this.
*   **Atomicity:** Credit deductions and additions, especially those involving transfers (like tipping or read earnings), should be atomic operations within Cloud Functions to prevent race conditions and ensure data integrity. Firestore transactions should be used for this.
*   **Error Handling:** Robust error handling is needed in both frontend and backend for insufficient credits, payment failures, and other unexpected issues.
*   **User Experience (UX):** Clear messaging to users about credit costs, remaining balance, successful transactions, and options to buy more credits is crucial.
*   **Scalability:** Consider the potential load on Cloud Functions and Firestore for credit-related operations as your user base grows.
*   **Story Type Definition:** A clear and consistent way to define 'Basic', 'Premium', and 'Convai' story types is needed in the `stories` collection. This might be a simple string field, or a more complex object if additional metadata is required per type.
