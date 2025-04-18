import Image, { ImageProps } from "next/image";
import { getSafeImageUrl, shouldUseUnoptimizedImage } from "@/utils/imageUtils";
import { useState } from "react";

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  fallbackSrc?: string;
  onImageError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * A wrapper around Next.js Image component that handles unconfigured hosts
 * and provides graceful fallbacks
 */
export default function SafeImage({
  src,
  alt,
  fallbackSrc = "/logo.png",
  onImageError,
  unoptimized,
  ...rest
}: SafeImageProps) {
  const [error, setError] = useState(false);
  
  // Process the source to ensure it's safe
  const safeSrc = error ? fallbackSrc : getSafeImageUrl(src as string, fallbackSrc);
  
  // Determine if unoptimized should be used
  const shouldUseUnoptimized = unoptimized || shouldUseUnoptimizedImage(src as string);
  
  // Handle errors
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.warn(`Image load error for: ${src}`);
    setError(true);
    
    if (onImageError) {
      onImageError(e);
    }
  };

  return (
    <Image
      src={safeSrc}
      alt={alt || "Image"}
      unoptimized={shouldUseUnoptimized}
      onError={handleError}
      {...rest}
    />
  );
} 