import { useState, useEffect } from "react";
import {
  isBackendPropertyImageUrl,
  peekCachedPropertyImageBlobUrl,
  ensureCachedPropertyImageBlobUrl,
} from "@/lib/propertyImageBlobCache";

/**
 * Resolves the best `src` for a property image. Backend `/api/property/image-file/{id}` URLs are
 * loaded once per image id in-memory and reused; other URLs pass through for normal browser loading.
 */
export function usePropertyImageSrc(resolvedUrl: string, fallbackUrl: string): string {
  const [src, setSrc] = useState<string>(() => {
    if (!resolvedUrl?.trim()) return fallbackUrl;
    if (!isBackendPropertyImageUrl(resolvedUrl)) return resolvedUrl;
    return peekCachedPropertyImageBlobUrl(resolvedUrl) ?? fallbackUrl;
  });

  useEffect(() => {
    if (!resolvedUrl?.trim()) {
      setSrc(fallbackUrl);
      return;
    }
    if (!isBackendPropertyImageUrl(resolvedUrl)) {
      setSrc(resolvedUrl);
      return;
    }

    const cached = peekCachedPropertyImageBlobUrl(resolvedUrl);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;
    ensureCachedPropertyImageBlobUrl(resolvedUrl)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(fallbackUrl);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedUrl, fallbackUrl]);

  return src;
}
