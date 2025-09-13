import 'server-only';
const must = (v: string|undefined, name: string) => { if(!v) throw new Error(`Missing ${name}`); return v; };
export const FIREBASE_PROJECT_ID  = must(process.env.FIREBASE_PROJECT_ID, 'FIREBASE_PROJECT_ID');
export const FIREBASE_CLIENT_EMAIL= must(process.env.FIREBASE_CLIENT_EMAIL,'FIREBASE_CLIENT_EMAIL');
export const FIREBASE_PRIVATE_KEY = must(process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),'FIREBASE_PRIVATE_KEY');
