// src/app/api/generate-image/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const FIREBASE_FUNCTIONS_BASE_URL = process.env.FIREBASE_FUNCTIONS_BASE_URL?.replace(/\/$/, '');

async function callFirebaseFunction(functionName: string, body: any) {
  if (!FIREBASE_FUNCTIONS_BASE_URL) {
    throw new Error("FIREBASE_FUNCTIONS_BASE_URL is not set.");
  }
  
  const url = `${FIREBASE_FUNCTIONS_BASE_URL}/${functionName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Function ${functionName} failed with status ${response.status}: ${errorText}`);
  }

  return await response.json();
}

export async function POST(req: Request) {
  const originalBody = await req.json();
  const { storyId, ...restOfBody } = originalBody; // Extract storyId

  const bodyWithAspectRatio = { ...restOfBody };

  // Set default aspect ratio to 16:9 and add to the prompt
  const aspectRatio = "16:9";
  if (bodyWithAspectRatio.prompt) {
    bodyWithAspectRatio.prompt = `${bodyWithAspectRatio.prompt} --ar ${aspectRatio}`;
  } else {
    bodyWithAspectRatio.prompt = `--ar ${aspectRatio}`;
  }

  if (storyId) {
    bodyWithAspectRatio.storyId = storyId; // Add storyId to the body if present
  }

  // --- ATTEMPT 1: Try the dedicated Gemini (Nano Banana) function ---
  try {
    console.log("Attempting primary generation via generateWithGemini function...");
    const result = await callFirebaseFunction('generateWithGemini', bodyWithAspectRatio);
    console.log("Success with generateWithGemini.");
    return NextResponse.json(result);
  } catch (e: any) {
    console.warn("generateWithGemini function failed:", e.message);
  }

  // --- ATTEMPT 2: Fallback to the dedicated Imagen function ---
  try {
    console.log("Falling back to generateWithImagen function...");
    const result = await callFirebaseFunction('generateWithImagen', bodyWithAspectRatio);
    console.log("Success with generateWithImagen fallback.");
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Fallback generateWithImagen function also failed:", e.message);
    return NextResponse.json(
      { error: "All image generation services failed.", details: e.message },
      { status: 503 }
    );
  }
}