// src/lib/parseGsiJwt.ts
export function parseGsiJwt(idToken: string): any | null {
    try {
      const base64 = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
  