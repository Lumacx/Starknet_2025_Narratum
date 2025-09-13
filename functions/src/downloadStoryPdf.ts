// functions/src/downloadStoryPdf.ts
import * as functions from 'firebase-functions';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const downloadStoryPdf = functions
  .region('us-central1')
  .runWith({
    memory: '1GB',          // headless chromium needs memory
    timeoutSeconds: 120,
  })
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const { html, pdfOptions } = (req.body || {}) as {
        html?: string;
        pdfOptions?: Record<string, unknown>;
      };

      if (!html || typeof html !== 'string' || html.trim().length === 0) {
        res.status(400).send('Missing html');
        return;
      }

      const executablePath = await chromium.executablePath();

      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless, // true on CF
      });

      try {
        const page = await browser.newPage();

        // Make CSS look like a browser (not print) and allow backgrounds
        await page.emulateMediaType('screen');

        // If your HTML uses relative URLs for images/CSS, set a base here (optional).
        // You can also pass this from the caller; leaving blank falls back to in-doc <base>.
        const baseURL = undefined as string | undefined;

        await page.setContent(html, {
          waitUntil: 'networkidle0',
          // @ts-expect-error: Puppeteer supports baseURL in newer versions; harmless if ignored.
          baseURL,
        });

        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: true, // respect @page size if present
          ...(pdfOptions ?? {}),
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="story.pdf"');
        res.status(200).send(Buffer.from(pdf));
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      res.status(500).send(`PDF generation failed: ${err?.message || err}`);
    }
  });
