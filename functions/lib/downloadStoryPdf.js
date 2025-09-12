"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadStoryPdf = void 0;
const functions = __importStar(require("firebase-functions"));
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
exports.downloadStoryPdf = functions
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
        const { html, pdfOptions } = req.body;
        if (!html) {
            res.status(400).send('Missing html');
            return;
        }
        const executablePath = await chromium_1.default.executablePath();
        const browser = await puppeteer_core_1.default.launch({
            args: chromium_1.default.args,
            defaultViewport: chromium_1.default.defaultViewport,
            executablePath,
            headless: chromium_1.default.headless,
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
    }
    catch (err) {
        console.error(err);
        res.status(500).send(`PDF generation failed: ${err?.message || err}`);
    }
});
//# sourceMappingURL=downloadStoryPdf.js.map