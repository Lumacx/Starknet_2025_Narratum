// src/app/api/generate-image-via-python/route.ts
import { NextResponse } from 'next/server';

// The URL of your running Python Flask API
const PYTHON_API_URL = 'http://127.0.0.1:8765/generate-image';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, sketch } = body;

    if (!prompt && !sketch) {
      return NextResponse.json({ error: 'Please provide a text prompt or a sketch.' }, { status: 400 });
    }

    console.log('[Next.js API] Forwarding to Python API with prompt:', prompt ? prompt.substring(0, 50) + "..." : "No prompt", "Sketch present:", !!sketch);

    const pythonApiResponse = await fetch(PYTHON_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, sketch }),
    });

    if (!pythonApiResponse.ok) {
      const errorBody = await pythonApiResponse.text(); // Use .text() for robustness
      console.error('[Next.js API] Error from Python API:', pythonApiResponse.status, errorBody);
      return NextResponse.json(
        { error: `Error from Python API: ${pythonApiResponse.status} ${errorBody}` },
        { status: pythonApiResponse.status }
      );
    }

    const data = await pythonApiResponse.json();
    console.log('[Next.js API] Success, received from Python API:', data.imageUrl ? 'Image received' : 'No image', 'Desc:', data.description ? data.description.substring(0,50) + "..." : "No desc");
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Next.js API] Internal error:', error);
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
}
