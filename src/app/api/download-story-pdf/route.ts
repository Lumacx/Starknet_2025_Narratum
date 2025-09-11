import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import playwright from 'playwright-chromium'; // or 'puppeteer'

export async function GET(req: NextRequest) {
  const storyId = req.nextUrl.searchParams.get('storyId');

  if (!storyId) {
    return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
  }

  try {
    // Fetch story content from Firebase
    const storyDoc = await adminDb.collection('stories').doc(storyId).get();
    if (!storyDoc.exists) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }
    const storyData = storyDoc.data();

    if (!storyData) {
      return NextResponse.json({ error: 'Story data is empty' }, { status: 404 });
    }

    // Basic HTML for the PDF - you would render your story content here
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${storyData.title || 'Story'}</title>
        <style>
          body { font-family: sans-serif; margin: 20px; }
          h1 { color: #333; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <h1>${storyData.title || 'Untitled Story'}</h1>
        ${storyData.imageUrl ? `<img src="${storyData.imageUrl}" alt="Cover Image" />` : ''}
        <div>
          ${storyData.content ? storyData.content.replace(/\\n/g, '<br/>') : 'No content available.'}
        </div>
      </body>
      </html>
    `;

    // Launch Playwright/Puppeteer and generate PDF
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${storyData.title || 'story'}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
