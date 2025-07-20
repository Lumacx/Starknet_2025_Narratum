// src/types/global.d.ts
export {};

declare global {
  interface Window {
    google: typeof google;
  }

  interface GoogleCredentialResponse {
    credential: string;
    select_by: string;
    clientId: string;
  }

  namespace google {
    namespace accounts {
      namespace id {
        function initialize(config: {
          client_id: string;
          callback: (response: CredentialResponse) => void;
        }): void;

        function renderButton(
          parent: HTMLElement,
          options: {
            theme?: string;
            size?: string;
            text?: string;
            shape?: string;
            logo_alignment?: string;
          }
        ): void;

        function prompt(callback?: () => void): void;

        interface CredentialResponse {
          credential: string;
          select_by: string;
          clientId: string;
        }
      }
    }
  }
}
