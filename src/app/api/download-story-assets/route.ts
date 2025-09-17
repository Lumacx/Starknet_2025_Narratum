// src/app/api/download-story-assets/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import archiver from 'archiver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ---------- Robust Admin init ----------
function ensureAdmin() {
  if (getApps().length) return;

  const useADC =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.FIREBASE_CONFIG;

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON;
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  const bucketEnv = process.env.FIREBASE_STORAGE_BUCKET;
  const bucket = bucketEnv || (projectId ? `${projectId}.appspot.com` : undefined);

  if (saJson) {
    initializeApp({ credential: cert(JSON.parse(saJson)), storageBucket: bucket });
  } else if (useADC) {
    initializeApp({ credential: applicationDefault(), storageBucket: bucket });
  } else {
    initializeApp({ storageBucket: bucket });
  }
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
    const ownerUid = searchParams.get('ownerUid');
    const persist = searchParams.get('persist') === '1';

    if (!storyId || !ownerUid) {
      return NextResponse.json({ error: 'Missing storyId or ownerUid' }, { status: 400 });
    }

    ensureAdmin();
    const db = getFirestore();
    const bucket = getStorage().bucket();

    // Gate by story published (tweak if you want owner-only downloads for unpublished)
    const storySnap = await db.doc(`stories/${storyId}`).get();
    if (!storySnap.exists) return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    const isPublished = !!storySnap.get('published');
    if (!isPublished) return NextResponse.json({ error: 'Story not public' }, { status: 403 });

    // Collect assets from the asset hub
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

    // Stream a zip
    const body = new ReadableStream({
      start(controller) {
        const archive = archiver('zip', { zlib: { level: 9 } });

        // Types for TS happiness
        archive.on('warning', (err: Error) => console.warn('archiver warning', err));
        archive.on('error', (err: Error) => controller.error(err));
        archive.on('data', (data: Buffer) => controller.enqueue(new Uint8Array(data)));
        archive.on('end', () => controller.close());

        (async () => {
          // Storage-backed types
          const storageTypes = ['images', 'audio', 'narration', 'soundfx'] as const;
          for (const t of storageTypes) {
            for (const a of assetsByType[t] || []) {
              if (!a.storagePath) continue;
              const file = bucket.file(a.storagePath);
              const exists = (await file.exists())[0];
              if (!exists) continue;
              const filename = a.name || a.storagePath.split('/').pop() || `${a.id}`;
              archive.append(file.createReadStream(), { name: `${t}/${filename}` });
            }
          }

          // Videos: include MP4s AND build a TSV manifest for YouTube links
          const ytRows: string[] = [];
          for (const a of assetsByType['videos'] || []) {
            if (a.source === 'storage' && a.storagePath) {
              const file = bucket.file(a.storagePath);
              const exists = (await file.exists())[0];
              if (!exists) continue;
              const filename = a.name || a.storagePath.split('/').pop() || `${a.id}.mp4`;
              archive.append(file.createReadStream(), { name: `videos/${filename}` });
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
              `# generated: ${new Date().toISOString()}`,
              'sceneIndex\tpageNumber\tkind\tname\tyoutubeUrl',
            ].join('\n');
            const manifest = header + '\n' + ytRows.join('\n') + '\n';

            // 1) include inside the zip
            archive.append(manifest, { name: 'videos/YOUTUBE_LINKS.txt' });

            // 2) optionally persist a copy to Cloud Storage + Firestore asset doc
            if (persist) {
              const manifestPath = `users/${ownerUid}/stories/${storyId}/videos/YOUTUBE_LINKS.txt`;
              await bucket.file(manifestPath).save(manifest, { contentType: 'text/plain' });

              await db.doc(
                `users/${ownerUid}/assetIndex/default/stories/${storyId}/storyAssets/default/videos/manifest`
              ).set(
                {
                  id: 'manifest',
                  name: 'YOUTUBE_LINKS.txt',
                  kind: 'manifest',
                  assetType: 'videos',
                  source: 'storage',
                  storagePath: manifestPath,
                  mimeType: 'text/plain',
                  bytes: Buffer.byteLength(manifest),
                  createdAt: Date.now(),
                  ownerUid: ownerUid,
                  storyId: storyId,
                  tags: ['manifest', 'youtube'],
                },
                { merge: true }
              );
            }
          }

          await archive.finalize();
        })().catch((e: unknown) => controller.error(e as any));
      },
    });

    return new NextResponse(body, {
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
