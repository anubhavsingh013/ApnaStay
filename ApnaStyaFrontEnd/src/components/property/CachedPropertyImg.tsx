import { useState } from "react";
import { usePropertyImageSrc } from "@/hooks/usePropertyImageSrc";
import { DEFAULT_PROPERTY_IMAGE } from "@/constants/properties";
type CachedPropertyImgProps = {
  src: string;
  alt: string;
  className?: string;
};

/**
 * Uses {@link usePropertyImageSrc} so backend image-file URLs share one fetch per id in the SPA.
 */
export function CachedPropertyImg({ src, alt, className }: CachedPropertyImgProps) {
  const displaySrc = usePropertyImageSrc(src?.trim() ? src : DEFAULT_PROPERTY_IMAGE, DEFAULT_PROPERTY_IMAGE);
  const [broken, setBroken] = useState(false);
  const finalSrc = broken ? DEFAULT_PROPERTY_IMAGE : displaySrc;

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      onError={() => setBroken(true)}
    />
  );
}
