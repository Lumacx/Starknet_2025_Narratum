import * as functions from 'firebase-functions';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const downloadStoryPdf = functions
  .region('us-central1')
  .runWith({
    memory: '1GB', // headless chromium needs a bit of memory
    timeoutSeconds: 120,
  })
  .https.onRequest(async (req, res) => {
    try {
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      const { html, pdfOptions } = req.body as {
        html: string;
        pdfOptions?: Record<string, unknown>;
      };

      if (!html) {
        res.status(400).send('Missing html');
        return;
      }

      const executablePath = await chromium.executablePath();

      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        ...pdfOptions,
      });

      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="story.pdf"');
      res.status(200).send(Buffer.from(pdf));
    } catch (err: any) {
      console.error(err);
      res.status(500).send(`PDF generation failed: ${err?.message || err}`);
    }
  });
