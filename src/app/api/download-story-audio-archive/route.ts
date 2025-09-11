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

    // Add story text as an HTML file
    zip.file(
      'story.html',
      `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${storyData.title || 'Story'}</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>${storyData.title || 'Untitled Story'}</h1>
          ${storyData.imageUrl ? `<img src="${storyData.imageUrl}" alt="Cover Image"/>` : ''}
          <div>
            ${storyData.content ? storyData.content.replace(/\n/g, '<br/>') : 'No content available.'}
          </div>
        </body>
        </html>
      `
    );

    // Fetch and add audio files
    if (storyData.audioUrls && Array.isArray(storyData.audioUrls)) {
      for (let i = 0; i < storyData.audioUrls.length; i++) {
        const audioUrl = storyData.audioUrls[i];
        try {
          const audioResponse = await fetch(audioUrl);
          if (!audioResponse.ok) {
            console.warn(`Could not fetch audio from ${audioUrl}: ${audioResponse.statusText}`);
            continue;
          }
          const audioBuffer = await audioResponse.arrayBuffer();
          const audioFileName = `audio_${i + 1}.mp3`; // Assuming mp3, adjust if needed
          zip.file(audioFileName, audioBuffer);
        } catch (fetchError) {
          console.error(`Error fetching audio ${audioUrl}:`, fetchError);
        }
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${storyData.title || 'story'}-with-audio.zip"`,
      },
    });
  } catch (error) {
    console.error('Error generating audio archive:', error);
    return NextResponse.json({ error: 'Failed to generate audio archive' }, { status: 500 });
  }
}
