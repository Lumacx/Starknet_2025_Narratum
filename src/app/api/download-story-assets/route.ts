// src/app/api/download-story-assets/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/* ---------------- Admin init ---------------- */
function ensureAdmin() {
  if (getApps().length) return;

  const useADC =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.FIREBASE_CONFIG;

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT;

  const bucketEnv = process.env.FIREBASE_STORAGE_BUCKET;
  const bucket = bucketEnv || (projectId ? `${projectId}.appspot.com` : undefined);

  if (saJson) initializeApp({ credential: cert(JSON.parse(saJson)), storageBucket: bucket });
  else if (useADC) initializeApp({ credential: applicationDefault(), storageBucket: bucket });
  else initializeApp({ storageBucket: bucket });
}

/* Node → Web stream adapter */
function nodeToWebReadable(nodeStream: NodeJS.ReadableStream) {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel(reason) {
      try { (nodeStream as any).destroy?.(reason as any); } catch {}
    },
  });
}

type Asset = {
  id: string;
  name?: string;
  storagePath?: string | null;
  source?: 'storage' | 'youtube';
  youtubeUrl?: string | null;
  sceneIndex?: number | null;
  pageNumber?: number | null;
  kind?: 'page' | 'teaser' | 'raw' | 'manifest';
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get('storyId');
    const persist = searchParams.get('persist') === '1'; // optional

    if (!storyId) {
      return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
    }

    ensureAdmin();
    const db = getFirestore();
    const bucket = getStorage().bucket();
    const adminAuth = getAuth();

    // ---------- Owner-only auth ----------
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let callerUid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
      callerUid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ---------- Load story & owner ----------
    const storySnap = await db.doc(`stories/${storyId}`).get();
    if (!storySnap.exists) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

    const data = storySnap.data() || {};
    const ownerUid: string | undefined =
      data.ownerUid || data.userId || data?.creator?.uid;

    if (!ownerUid) return NextResponse.json({ error: 'Story missing ownerUid' }, { status: 500 });
    if (callerUid !== ownerUid) {
      return NextResponse.json({ error: 'Forbidden', reason: 'owner_only' }, { status: 403 });
    }

    // ---------- Collect assets from asset index ----------
    const base = db
      .collection('users').doc(ownerUid)
      .collection('assetIndex').doc('default')
      .collection('stories').doc(storyId)
      .collection('storyAssets').doc('default');

    const types = ['images', 'audio', 'narration', 'soundfx', 'videos'] as const;
    const assetsByType: Record<string, Asset[]> = {};
    for (const t of types) {
      const ss = await base.collection(t).get();
      assetsByType[t] = ss.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    }

    // ---------- Fallback: scan Storage prefixes (for older uploads) ----------
    const prefixes = [
      `users/${ownerUid}/stories/${storyId}/`, // recommended layout
      `stories/${storyId}/`,                   // legacy 1
      `storyAssets/${storyId}/`,               // legacy 2
    ];

    // We'll track paths we've already added to avoid duplicates
    const already = new Set<string>();
    for (const t of types) {
      for (const a of assetsByType[t] || []) {
        if (a.storagePath) already.add(a.storagePath);
      }
    }

    // ---------- Build ZIP ----------
    const pass = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => pass.destroy(err));
    archive.pipe(pass); // <-- IMPORTANT: actually pipe archiver to a stream

    // Manifest data we’ll write at the end
    const manifest: any = {
      storyId,
      ownerUid,
      time: new Date().toISOString(),
      counts: { images: 0, audio: 0, narration: 0, soundfx: 0, videos: 0, fallback: 0 },
      prefixesTried: prefixes,
      indexDocs: Object.fromEntries(types.map(t => [t, (assetsByType[t] || []).length])),
      addedSamples: [] as string[],
    };

    // 1) From asset index (storage-backed)
    const storageTypes = ['images', 'audio', 'narration', 'soundfx'] as const;
    for (const t of storageTypes) {
      for (const a of assetsByType[t] || []) {
        if (!a.storagePath) continue;
        const file = bucket.file(a.storagePath);
        const exists = (await file.exists())[0];
        if (!exists) continue;
        const filename = a.name || a.storagePath.split('/').pop() || `${a.id}`;
        const zipName = `${t}/${filename}`;
        archive.append(file.createReadStream(), { name: zipName });
        manifest.counts[t]++;
        if (manifest.addedSamples.length < 20) manifest.addedSamples.push(zipName);
      }
    }

    // 2) Videos from asset index (MP4s) + gather YT list
    const ytRows: string[] = [];
    for (const a of assetsByType['videos'] || []) {
      if (a.source === 'storage' && a.storagePath) {
        const file = bucket.file(a.storagePath);
        const exists = (await file.exists())[0];
        if (!exists) continue;
        const filename = a.name || a.storagePath.split('/').pop() || `${a.id}.mp4`;
        const zipName = `videos/${filename}`;
        archive.append(file.createReadStream(), { name: zipName });
        manifest.counts.videos++;
        if (manifest.addedSamples.length < 20) manifest.addedSamples.push(zipName);
      } else if (a.source === 'youtube' && a.youtubeUrl) {
        const row = [
          (a.sceneIndex ?? '').toString(),
          (a.pageNumber ?? '').toString(),
          (a.kind ?? '').toString(),
          ((a.name || a.id || '') as string).replace(/\t/g, ' '),
          a.youtubeUrl as string,
        ].join('\t');
        ytRows.push(row);
      }
    }

    if (ytRows.length) {
      const header = [
        '# YouTube links for this story',
        `# storyId: ${storyId}`,
        `# ownerUid: ${ownerUid}`,
        `# generated: ${new Date().toISOString()}`,
        'sceneIndex\tpageNumber\tkind\tname\tyoutubeUrl',
      ].join('\n');
      const txt = header + '\n' + ytRows.join('\n') + '\n';
      archive.append(txt, { name: 'videos/YOUTUBE_LINKS.txt' });

      if (persist) {
        const manifestPath = `users/${ownerUid}/stories/${storyId}/videos/YOUTUBE_LINKS.txt`;
        await bucket.file(manifestPath).save(txt, { contentType: 'text/plain' });
      }
    }

    // 3) Fallback: scan bucket for any files under known prefixes
    for (const prefix of prefixes) {
      const [files] = await bucket.getFiles({ prefix });
      for (const f of files) {
        if (already.has(f.name)) continue; // already added via index
        // trim prefix to get a relative name
        const rel = f.name.startsWith(prefix) ? f.name.slice(prefix.length) : f.name;
        if (!rel) continue;
        const zipName = `raw/${rel}`;
        archive.append(f.createReadStream(), { name: zipName });
        manifest.counts.fallback++;
        if (manifest.addedSamples.length < 20) manifest.addedSamples.push(zipName);
      }
    }

    // Always include a manifest.json so the ZIP is never empty
    archive.append(Buffer.from(JSON.stringify(manifest, null, 2)), { name: 'manifest.json' });

    // finalize AFTER all appends are scheduled
    archive.finalize();

    return new NextResponse(nodeToWebReadable(pass) as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="story-${storyId}-assets.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || 'Failed to build archive' }, { status: 500 });
  }
}
