// Gen2 Storage indexer — ONLY index under users/{uid}/assetIndex/(stories|uncategorized)/{category}/...

import * as functions from "firebase-functions";
import { db, Timestamp } from "./firebaseAdmin";

/**
 * Valid path:
 * users/{uid}/assetIndex/(stories/{storyId}|uncategorized)/{category}/{filename...}
 */
const NEW_PATH_RE =
  /^users\/([^/]+)\/assetIndex\/(?:(?:stories\/([^/]+))|uncategorized)\/([^/]+)\/(.+)$/;

// Whitelist of categories to avoid indexing unexpected folders
const ALLOWED_CATEGORIES = new Set([
  "covers",
  "avatars",
  "characters",
  "locations",
  "backgrounds",
  "audioNarrations",
  "audioEffects",
  "videos",
  "generatedImages",
  "others",
]);

function inferMediaType(
  contentType?: string | null
): "image" | "audio" | "video" | "other" {
  if (!contentType) return "other";
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("video/")) return "video";
  return "other";
}

export const indexAssetOnFinalize = functions
  .region("us-central1")
  .storage.object()
  .onFinalize(async (obj) => {
    const path = obj.name || "";

    const m = path.match(NEW_PATH_RE);
    if (!m) {
      console.log("[assetsIndex] skip (non-assetIndex path):", path);
      return null;
    }

    const uid = m[1];
    const storyIdFromPath = m[2] || null; // null when uncategorized
    const category = m[3];
    const fileName = m[4];

    if (!ALLOWED_CATEGORIES.has(category)) {
      console.log(
        "[assetsIndex] skip (unknown category):",
        category,
        "path:",
        path
      );
      return null;
    }

    const md = obj.metadata || {};
    const contentType = obj.contentType || null;

    // Allow override via custom metadata; otherwise infer from contentType
    const mediaType =
      (md.mediaType as string) || inferMediaType(contentType as string | null);

    const size = obj.size ? Number(obj.size) : null;

    // Optional source (upload | ai-generated | migrate | etc.)
    const source = md["narratum:source"] || md.source || "upload";

    // createdAt consistent
    const createdAt = obj.timeCreated
      ? Timestamp.fromDate(new Date(obj.timeCreated))
      : Timestamp.now();

    // If metadata has storyId and path has storyId, prefer path (it’s authoritative)
    const mdStoryId = (md["narratum:storyId"] as string | undefined)?.trim() || null;
    const finalStoryId =
      storyIdFromPath ?? mdStoryId ?? null;

    await db.collection("assetsIndex").add({
      uid,
      storyId: finalStoryId, // null if uncategorized
      category, // e.g., covers | characters | ...
      fileName, // relative name inside the category
      path, // full Storage path
      mediaType, // image | audio | video | other
      contentType: contentType || null,
      size,
      source,
      displayName: (md.displayName as string) || null,
      createdAt,
    });

    console.log("[assetsIndex] indexed:", {
      uid,
      storyId: finalStoryId,
      category,
      fileName,
    });
    return null;
  });

export const removeIndexOnDelete = functions
  .region("us-central1")
  .storage.object()
  .onDelete(async (obj) => {
    const path = obj.name || "";

    const m = path.match(NEW_PATH_RE);
    if (!m) {
      console.log("[assetsIndex] delete skip (non-assetIndex path):", path);
      return null;
    }

    const snap = await db.collection("assetsIndex").where("path", "==", path).get();

    if (snap.empty) {
      console.log("[assetsIndex] delete: no index docs for", path);
      return null;
    }

    const batch = db.batch();
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    console.log("[assetsIndex] delete: removed", snap.size, "docs for", path);
    return null;
  });
