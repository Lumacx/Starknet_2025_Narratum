import '@paypal/paypal-js';

declare global {
  interface Window {
    paypal?: {
      HostedButtons?: (
        options: {
          hostedButtonId: string;
        }
      ) => {
        render: (selector: string) => Promise<void>;
      };
      // Add other paypal properties if needed
    };
  }
}
