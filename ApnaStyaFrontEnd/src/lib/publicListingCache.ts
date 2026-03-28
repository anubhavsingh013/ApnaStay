import { mapPropertyDtoToProperty, type Property } from "@/constants/properties";
import { getFeaturedProperties, getPublicProperties, type PublicPropertySearchParams } from "@/lib/api";

function mapResponseToProperties(res: unknown): Property[] {
  const raw = res as { data?: unknown[] };
  const list = Array.isArray(raw?.data) ? raw.data : [];
  return list.map((d) => mapPropertyDtoToProperty(d as Parameters<typeof mapPropertyDtoToProperty>[0]));
}

/* ─── Featured (homepage) — one in-flight request, cached for the session ─── */

let featuredCache: Property[] | null = null;
let featuredInflight: Promise<Property[]> | null = null;

/** Returns null if not cached yet */
export function getFeaturedFromCache(): Property[] | null {
  return featuredCache;
}

export function loadFeaturedPropertiesCached(): Promise<Property[]> {
  if (featuredCache !== null) return Promise.resolve(featuredCache);
  if (featuredInflight) return featuredInflight;

  featuredInflight = getFeaturedProperties()
    .then((res) => {
      const mapped = mapResponseToProperties(res);
      featuredCache = mapped;
      return mapped;
    })
    .catch(() => {
      featuredCache = [];
      return [];
    })
    .finally(() => {
      featuredInflight = null;
    });

  return featuredInflight;
}

export function invalidateFeaturedPropertiesCache() {
  featuredCache = null;
}

/* ─── Public list (/properties) — keyed by search params ─── */

function publicParamsCacheKey(params: PublicPropertySearchParams | undefined): string {
  if (!params) return "";
  return [
    params.city ?? "",
    params.pinCode ?? "",
    params.furnishing ?? "",
    params.minBedrooms != null ? String(params.minBedrooms) : "",
    params.minBathrooms != null ? String(params.minBathrooms) : "",
    params.minPrice != null ? String(params.minPrice) : "",
    params.maxPrice != null ? String(params.maxPrice) : "",
  ].join("|");
}

const publicCache = new Map<string, Property[]>();
const publicInflight = new Map<string, Promise<Property[]>>();

export function getPublicPropertiesFromCache(params: PublicPropertySearchParams | undefined): Property[] | undefined {
  const key = publicParamsCacheKey(params);
  return publicCache.get(key);
}

export function loadPublicPropertiesCached(params: PublicPropertySearchParams | undefined): Promise<Property[]> {
  const key = publicParamsCacheKey(params);
  const hit = publicCache.get(key);
  if (hit) return Promise.resolve(hit);

  const existing = publicInflight.get(key);
  if (existing) return existing;

  const p = getPublicProperties(params)
    .then((res) => {
      const mapped = mapResponseToProperties(res);
      publicCache.set(key, mapped);
      return mapped;
    })
    .catch(() => {
      publicCache.set(key, []);
      return [];
    })
    .finally(() => {
      publicInflight.delete(key);
    });

  publicInflight.set(key, p);
  return p;
}

export function invalidatePublicPropertiesCacheEntry(params: PublicPropertySearchParams | undefined) {
  publicCache.delete(publicParamsCacheKey(params));
}
