/**
 * Utility functions for handling images in the application
 */

// List of configured image domains in next.config.ts
const CONFIGURED_DOMAINS = ['ipfs.io', 'pbs.twimg.com'];

// Default fallback image path
export const DEFAULT_IMAGE_FALLBACK = '/logo.png';

/**
 * Checks if an image URL is from a configured domain
 * @param url The image URL to check
 * @returns boolean indicating if the URL's host is configured
 */
export function isConfiguredImageDomain(url: string): boolean {
  try {
    // Handle empty URLs
    if (!url) return false;
    
    // Handle relative URLs (they're always "configured")
    if (url.startsWith('/')) return true;
    
    // Parse the URL to get the hostname
    const parsedUrl = new URL(url);
    
    // Check if the hostname is in our configured list
    return CONFIGURED_DOMAINS.some(domain => 
      parsedUrl.hostname === domain || 
      parsedUrl.hostname.endsWith(`.${domain}`)
    );
  } catch (_error) {
    // If URL parsing fails, return false
    console.warn(`Invalid URL format: ${url}`);
    return false;
  }
}

/**
 * Get a safe image URL that either:
 * - Returns the original URL if it's from a configured domain
 * - Returns the fallback image if it's from an unconfigured domain
 * 
 * @param url The original image URL
 * @param fallback Optional custom fallback URL (defaults to logo)
 * @returns A safe image URL
 */
export function getSafeImageUrl(url: string, fallback = DEFAULT_IMAGE_FALLBACK): string {
  // If it's a valid, configured URL, return it
  if (url && isConfiguredImageDomain(url)) {
    return url;
  }
  
  // Otherwise return the fallback
  console.warn(`Unconfigured image domain for URL: ${url}, using fallback`);
  return fallback;
}

/**
 * Determine if an image should use the unoptimized attribute
 * For some domains like IPFS, we want to use unoptimized to avoid issues
 * 
 * @param url The image URL
 * @returns boolean indicating if the image should use unoptimized
 */
export function shouldUseUnoptimizedImage(url: string): boolean {
  return url.includes('ipfs.io') || url.includes('pbs.twimg.com');
} 