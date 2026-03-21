/**
 * In-memory cache for backend property images (`GET /api/property/image-file/{id}`).
 *
 * Listing JSON only contains URLs — not raw image bytes. Browsers still load images separately;
 * this module dedupes loads in the SPA: first consumer fetches once, others reuse the same blob: URL.
 *
 * External URLs (e.g. Unsplash) are not cached here — the browser handles those.
 */

const IMAGE_FILE_PATH = /\/api\/property\/image-file\/(\d+)/i;

/** Stable cache key from any resolved absolute URL pointing at our image-file endpoint */
export function getPropertyImageFileCacheKey(resolvedUrl: string): string | null {
  const m = resolvedUrl.trim().match(IMAGE_FILE_PATH);
  return m ? `property-image-file:${m[1]}` : null;
}

export function isBackendPropertyImageUrl(url: string): boolean {
  return Boolean(url && IMAGE_FILE_PATH.test(url));
}

const blobUrlByKey = new Map<string, string>();
const inflightByKey = new Map<string, Promise<string>>();

export function peekCachedPropertyImageBlobUrl(resolvedUrl: string): string | undefined {
  const key = getPropertyImageFileCacheKey(resolvedUrl);
  if (!key) return undefined;
  return blobUrlByKey.get(key);
}

/**
 * Returns a displayable URL: cached blob URL, or fetches once and caches.
 * For non–image-file URLs, returns {@code resolvedUrl} unchanged.
 */
export function ensureCachedPropertyImageBlobUrl(resolvedUrl: string): Promise<string> {
  if (!resolvedUrl?.trim()) return Promise.resolve(resolvedUrl);
  const key = getPropertyImageFileCacheKey(resolvedUrl);
  if (!key) return Promise.resolve(resolvedUrl);

  const hit = blobUrlByKey.get(key);
  if (hit) return Promise.resolve(hit);

  const existing = inflightByKey.get(key);
  if (existing) return existing;

  const p = fetch(resolvedUrl, { credentials: "include", mode: "cors" })
    .then((res) => {
      if (!res.ok) throw new Error(`Image ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      blobUrlByKey.set(key, objectUrl);
      inflightByKey.delete(key);
      return objectUrl;
    })
    .catch(() => {
      inflightByKey.delete(key);
      throw new Error("Failed to load property image");
    });

  inflightByKey.set(key, p);
  return p;
}

/** Optional: clear blob URLs (e.g. after logout). */
export function revokeAllCachedPropertyImageBlobs() {
  for (const url of blobUrlByKey.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
  blobUrlByKey.clear();
  inflightByKey.clear();
}
