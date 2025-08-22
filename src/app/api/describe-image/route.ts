import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs"; // ensure server runtime

export async function POST(req: NextRequest) {
  try {
    const { dataUrl } = await req.json(); // base64 data URL from client
    if (!dataUrl) return NextResponse.json({ error: "Missing dataUrl" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Split data URL
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/data:(.*?);base64/)?.[1] || "image/png";

    const result = await model.generateContent([
      {
        inlineData: {
          data: b64,
          mimeType: mime,
        },
      },
      {
        text: `Describe this image in 1-2 concise sentences suitable as a prompt for character/scene generation. 
Focus on subject, style, age, outfit, pose, lighting, and mood.`,
      },
    ]);

    const text = result.response.text().trim();
    return NextResponse.json({ description: text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 });
  }
}
