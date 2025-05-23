// src/app/api/semantic-search/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { searchQuery, storyTitles } = await request.json();

    if (!searchQuery || !storyTitles || !Array.isArray(storyTitles)) {
      return NextResponse.json(
        { error: 'Missing searchQuery or storyTitles in request body' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables.');
      return NextResponse.json(
        { error: 'API Key not configured on server. Search is disabled.' },
        { status: 500 }
      );
    }

    const prompt = `Given the following story titles: ${JSON.stringify(storyTitles)}.
                    Find titles that are semantically related to "${searchQuery}".
                    Return only a JSON array of the matching story titles.
                    If no titles are semantically related, return an empty array.`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
      },
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('Gemini API Error:', errorBody);
      return NextResponse.json(
        { error: `Gemini API request failed with status ${geminiResponse.status}`, details: errorBody },
        { status: geminiResponse.status }
      );
    }

    const result = await geminiResponse.json();

    if (
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0 &&
      result.candidates[0].content.parts[0].text
    ) {
      const jsonString = result.candidates[0].content.parts[0].text;
      try {
        const matchedTitles = JSON.parse(jsonString);
        return NextResponse.json({ matchedTitles });
      } catch (parseError: any) {
        console.error('Error parsing Gemini response:', parseError, 'Raw string:', jsonString);
        return NextResponse.json(
          { error: 'Error processing search results from Gemini', details: parseError.message },
          { status: 500 }
        );
      }
    } else {
      console.warn('Unexpected response structure from Gemini API:', result);
      return NextResponse.json(
        { error: 'No valid response or unexpected structure from search API.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in /api/semantic-search:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
