// src/app/api/set-book-cover/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin'; // ✅ lazy Admin

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: Request) {
  try {
    const { storyId, coverUrl } = await req.json();
    if (!storyId || !coverUrl) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const db = getAdminDb(); // ✅ lazy Admin
    await db.collection('stories').doc(String(storyId)).update({
      coverImageUrl: String(coverUrl),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('set-book-cover failed:', err);
    const msg = err?.message || 'Failed to set cover';
    const code = /NOT_FOUND|not found/i.test(msg) ? 404 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
