/**
 * Client for the share service that gives posted links a real preview image.
 *
 * GitHub Pages serves static files only, so it cannot produce a per-card Open
 * Graph tag — crawlers do not run JavaScript, and a query parameter would never
 * reach them. A small serverless companion stores the PNG and serves a page
 * whose `og:image` points at that exact card.
 *
 * The service is optional. When it is not configured or is unreachable, the app
 * falls back to attaching or downloading the image, so the flow never dead-ends.
 */

/** Injected at build time; empty until the share service is deployed. */
const SHARE_ORIGIN = (import.meta.env.VITE_SHARE_ORIGIN ?? '').replace(/\/+$/, '');

/** Cards above this are rejected client-side rather than wasting an upload. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const UPLOAD_TIMEOUT_MS = 12_000;

export function shareServiceConfigured(): boolean {
  return SHARE_ORIGIN.length > 0;
}

/**
 * Uploads the card and returns the shareable URL.
 *
 * Throws on any failure; callers treat that as "share without a link" rather
 * than surfacing an error, because the user still has their image.
 */
export async function uploadCard(blob: Blob): Promise<string> {
  if (!shareServiceConfigured()) throw new Error('share service not configured');
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error('card too large to share by link');

  // A hung upload must not leave the user staring at a spinner; the abort keeps
  // the worst case bounded and the caller falls back to the download path.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(`${SHARE_ORIGIN}/api/card`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: blob,
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`share service responded ${response.status}`);

    const payload = (await response.json()) as { url?: string; id?: string };
    if (payload.url) return payload.url;
    if (payload.id) return `${SHARE_ORIGIN}/c/${payload.id}`;
    throw new Error('share service returned no url');
  } finally {
    clearTimeout(timeout);
  }
}
