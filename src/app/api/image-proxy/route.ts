import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Body = { url?: string };

async function fetchImageAsDataURL(imageUrl: string) {
  const r = await fetch(imageUrl, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
  const mime = r.headers.get('content-type') || 'image/png';
  if (!mime.startsWith('image/')) throw new Error('URL did not return an image');
  const b64 = Buffer.from(await r.arrayBuffer()).toString('base64');
  return `data:${mime};base64,${b64}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    const dataUrl = await fetchImageAsDataURL(body.url);
    return NextResponse.json({ dataUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy failed' }, { status: 500 });
  }
}
