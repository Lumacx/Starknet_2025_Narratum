// src/app/api/download-story-audio-archive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import JSZip from 'jszip';

export async function GET(req: NextRequest) {
  const storyId = req.nextUrl.searchParams.get('storyId');

  if (!storyId) {
    return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
  }

  try {
    const storyDoc = await adminDb.collection('stories').doc(storyId).get();
    if (!storyDoc.exists) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const storyData = storyDoc.data();
    if (!storyData) {
      return NextResponse.json({ error: 'Story data is empty' }, { status: 404 });
    }

    const zip = new JSZip();

    // --- Add Story HTML ---
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${storyData.title || 'Story'}</title>
        <meta charset="utf-8">
      </head>
      <body>
        <h1>${storyData.title || 'Untitled Story'}</h1>
        ${
          storyData.imageUrl
            ? `<img src="${storyData.imageUrl}" alt="Cover Image" style="max-width:100%;"/>`
            : ''
        }
        <div>
          ${
            storyData.content
              ? storyData.content.replace(/\n/g, '<br/>')
              : 'No content available.'
          }
        </div>
      </body>
      </html>
    `;
    zip.file('story.html', new TextEncoder().encode(htmlContent));

    // --- Add Audio Files ---
    if (Array.isArray(storyData.audioUrls)) {
      for (let i = 0; i < storyData.audioUrls.length; i++) {
        const audioUrl = storyData.audioUrls[i];
        try {
          const audioResponse = await fetch(audioUrl);
          if (!audioResponse.ok) {
            console.warn(
              `Skipping audio: ${audioUrl} (status ${audioResponse.status})`
            );
            continue;
          }
          const audioBuffer = await audioResponse.arrayBuffer();
          const ext =
            audioUrl.split('.').pop()?.split('?')[0] || 'mp3'; // Guess extension
          const audioFileName = `audio_${i + 1}.${ext}`;
          zip.file(audioFileName, audioBuffer);
        } catch (fetchError) {
          console.error(`Error fetching audio ${audioUrl}:`, fetchError);
        }
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${
          (storyData.title || 'story').replace(/[^a-z0-9_\-]/gi, '_')
        }-with-audio.zip"`,
      },
    });
  } catch (error) {
    console.error('Error generating audio archive:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio archive' },
      { status: 500 }
    );
  }
}
