import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  const { storyId, coverUrl } = await req.json();
  if (!storyId || !coverUrl) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  await adminDb.collection('stories').doc(storyId).update({ coverImageUrl: coverUrl });
  return NextResponse.json({ ok: true });
}
