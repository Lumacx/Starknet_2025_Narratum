// src/app/api/describe-image/route.ts
import { NextResponse } from 'next/server';

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
    try {
        const body = await req.json();
        const result = await callFirebaseFunction('describeImage', body);
        return NextResponse.json(result);
    } catch (e: any) {
        console.error('describe-image error:', e?.stack || e);
        return NextResponse.json(
            { error: e?.message || 'Describe failed' },
            { status: 500 },
        );
    }
}
