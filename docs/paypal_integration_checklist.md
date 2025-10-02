# PayPal Integration To-Do Checklist

This checklist outlines the necessary adjustments and improvements for the PayPal integration, taking into account the revised plan for separate one-time payment and subscription pages.

---

## I. Frontend - Restructuring One-Time Payments and Referrals/Promo Codes

*   **1. Migrate One-Time Payment Components to `src/app/buy-credits/page.tsx`:**
    *   Move the `PayButtonsOneTime` and `HostedPayPalButtonRenderer` components (along with `PayPalProviderClient` and `usePayPalScriptReducer`) from `src/app/subscription/page.tsx` to `src/app/buy-credits/page.tsx`.
    *   Modify `src/app/buy-credits/page.tsx` to utilize these components for rendering one-time payment buttons, replacing its current redirect-based PayPal flow.
    *   Ensure `src/app/subscription/page.tsx` no longer renders one-time payment buttons, focusing exclusively on subscription management.
    *   **STATUS: DONE.**
*   **2. Standardize One-Time Payment Flow on `src/app/buy-credits/page.tsx`:**
    *   Remove the `buildHostedButtonUrl` and `startOtpPurchase` (redirect-based) logic from `src/app/buy-credits/page.tsx`.
    *   Implement the `onApproveOneTime` handler (similar to the one in `subscription/page.tsx`) to process successful one-time payments via the `processPayPalOneTimePayment` Cloud Function.
    *   **STATUS: DONE.**
*   **3. Add Referrer Input to Both Pages:**
    *   Implement a referrer input field and its associated state/logic in both `src/app/subscription/page.tsx` and `src/app/buy-credits/page.tsx`.
    *   Ensure the `referredBy` value is correctly passed to the respective Firebase Cloud Functions (`processPayPalSubscription` for subscriptions, and `processPayPalOneTimePayment` for one-time purchases).
    *   **STATUS: DONE.**
*   **4. Add Promo Code Functionality to `src/app/subscription/page.tsx`:**
    *   Migrate the promo code input field and `handleRedeemPromoCode` logic from `src/app/buy-credits/page.tsx` to `src/app/subscription/page.tsx`.
    *   (The `src/app/buy-credits/page.tsx` already contains this, so no changes needed there for this item).
    *   **STATUS: DONE.**
*   **5. Standardize Firebase Functions Import:**
    *   Ensure all callable Firebase functions are consistently imported and used via `functions` from `@/lib/firebase` (remove `getClientFunctions` from `buy-credits/page.tsx` after moving logic).
    *   **STATUS: DONE.**
*   **6. Improve Hosted Buttons Type Safety (Optional but Recommended):**
    *   Investigate why `(window.paypal as any).HostedButtons` casting is necessary in `HostedPayPalButtonRenderer`. Ensuring `import '@paypal/paypal-js';` is effectively augmenting the `window.paypal` type.
    *   **STATUS: DONE.**

---

## II. Backend - Firebase Cloud Functions

### **`functions/src/processPayPalOneTimePayment.ts` (Callable Function for One-Time Payments)**

*   **1. REPLACE MOCK PAYPAL API (CRITICAL & URGENT):**
    *   **STATUS: DONE.** Real PayPal API calls are now used for capturing orders.
*   **2. Implement Credit Granting and Transaction Recording:**
    *   **STATUS: DONE.** User credits are updated, and detailed transaction records are created in Firestore.
*   **3. Implement Idempotency for Credit Grants:**
    *   **STATUS: DONE.** A `processedOneTimePayments` collection is used to prevent double-crediting.
*   **4. Fix TypeScript Errors for `captureResult`:**
    *   **STATUS: DONE.** Explicitly cast `captureRes.json()` to `PayPalOrderCaptureResponse`.

### **`functions/src/paypalWebhook.ts` (HTTP Cloud Function for Webhooks)**

*   **1. IMPLEMENT WEBHOOK VERIFICATION (CRITICAL & URGENT):**
    *   **STATUS: DONE.** Full PayPal webhook signature verification is now implemented using `verifyPayPalWebhookSignature` and the `PAYPAL_WEBHOOK_ID` configured as a Firebase Function environment variable.
*   **2. PROCESS SUBSCRIPTION EVENTS (CRITICAL & URGENT):**
    *   **STATUS: DONE.** The function now handles `BILLING.SUBSCRIPTION.ACTIVATED`, `RENEWED`, `CANCELLED`, `SUSPENDED`, and `PAYMENT_FAILED` events.
*   **3. Implement Idempotency for ALL Webhook Events:**
    *   **STATUS: DONE.** A `processedWebhookEvents` collection is used to prevent duplicate processing of all webhook events.
*   **4. Ensure `paypalOrderId` in Transaction Records:**
    *   **STATUS: DONE.** `paypalOrderId` is explicitly stored in `creditTransactions` and `pendingHostedCreditPurchases` (for one-time payments).
*   **5. Fix TypeScript Errors/Typos:**
    *   **STATUS: DONE.** Corrected `packageId` and `pricePaid` references, and `paypalButtonId` to `paypalHostedButtonId` typos.

### **`functions/src/utils/paypal.ts` (PayPal Utilities)**

*   **1. Export PayPal API Response Interfaces:**
    *   **STATUS: DONE.** `PayPalAccessTokenResponse`, `PayPalWebhookVerificationResponse`, `PayPalOrderCaptureResponse`, and `PayPalSubscriptionDetailsResponse` are now correctly exported.
*   **2. Fix TypeScript Errors for `unknown` type assignments:**
    *   **STATUS: DONE.** Explicitly cast `tokenRes.json()` to `PayPalAccessTokenResponse` and `verifyRes.json()` to `PayPalWebhookVerificationResponse`.
*   **3. Add `getPayPalOrderDetails` function:**
    *   **STATUS: DONE.** Added a function to fetch PayPal order details.

### **`functions/src/credits.ts` (Callable Function for One-Time Payments)**

*   **1. Update `processPayPalOneTimePayment` to use `getPayPalOrderDetails`:**
    *   **STATUS: DONE.** Modified the function to correctly import and use `getPayPalOrderDetails`.

---

## III. Backend - Next.js API Routes

*   **`src/app/api/paypal-webhook/route.ts`:**
    *   **STATUS: DONE.** Removed as `functions/src/paypalWebhook.ts` is now the sole, verified handler for all PayPal webhooks.
*   **`src/app/api/paypal-verify-subscription/route.ts`:**
    *   **STATUS: RETAINED.** This route remains as a client-initiated status check for subscriptions. The webhook remains the authoritative source.
*   **`src/app/api/paypal-config/route.ts`:**
    *   **STATUS: DONE.** Removed as `process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID` is used directly on the frontend.
    
---

## IV. General

*   **Environment Variable Consistency:** Ensure that all PayPal-related environment variables (`PAYPAL_CLIENT_ID`, `PAYPAL_SECRET_KEY`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENV`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`) are correctly configured and accessible in the respective environments (frontend, Firebase Cloud Functions, Next.js API routes).
*   **PayPal API Response Interfaces:** Newly defined `PayPalAccessTokenResponse`, `PayPalWebhookVerificationResponse`, `PayPalOrderCaptureResponse`, and `PayPalSubscriptionDetailsResponse` interfaces in `functions/src/utils/paypal.ts` improve type safety for PayPal API interactions.
*   **Comprehensive Testing:** After implementing these changes, thorough testing of both one-time payments and subscription flows (including activation, renewal, cancellation, and edge cases like failed payments) is essential.
*   **Security Review:** Perform a security review of the entire PayPal integration, focusing on data integrity, prevention of fraud (especially double-crediting), and secure handling of sensitive information.

