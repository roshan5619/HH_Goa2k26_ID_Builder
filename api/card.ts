/**
 * Card upload endpoint.
 *
 * Accepts a finished PNG, stores it in blob storage, and returns the URL of a
 * page that carries Open Graph tags pointing at it. This exists only so that
 * links pasted into X, Slack or WhatsApp preview the actual card — GitHub Pages
 * cannot serve per-card metadata, and crawlers do not run JavaScript.
 *
 * Nothing here is required for the core flow: the app downloads and shares the
 * image locally, and treats this service being absent or down as a non-event.
 */

import { put } from '@vercel/blob';

export const config = { runtime: 'nodejs' };

/** Matches the client-side cap; a finished card is ~1MB. */
const MAX_BYTES = 5 * 1024 * 1024;

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Crude per-instance rate limit.
 *
 * Serverless instances are short-lived and not shared, so this cannot enforce a
 * global limit — it is a speed bump against a trivial script, not a security
 * control. Anything stronger would need a shared store and is not worth the
 * complexity for a free tool that stores only images it generated itself.
 */
const recent = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);

  // Keep the map from growing without bound across a warm instance's lifetime.
  if (recent.size > 500) {
    for (const [key, times] of recent) {
      if (times.every((time) => now - time >= WINDOW_MS)) recent.delete(key);
    }
  }

  return hits.length > MAX_PER_WINDOW;
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') ?? '';
  const cors = corsHeaders(origin);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, cors);
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  if (rateLimited(ip)) {
    return json({ error: 'Too many cards. Wait a minute and try again.' }, 429, cors);
  }

  const body = new Uint8Array(await request.arrayBuffer());

  if (body.byteLength === 0) return json({ error: 'Empty body' }, 400, cors);
  if (body.byteLength > MAX_BYTES) return json({ error: 'Card too large' }, 413, cors);

  // Verify the bytes really are a PNG rather than trusting Content-Type, so the
  // endpoint cannot be used to host arbitrary files.
  if (!PNG_MAGIC.every((byte, index) => body[index] === byte)) {
    return json({ error: 'Only PNG cards are accepted' }, 415, cors);
  }

  try {
    const id = randomId();
    const blob = await put(`cards/${id}.png`, Buffer.from(body), {
      access: 'public',
      contentType: 'image/png',
      // Cards are immutable once written; the id is unique per upload.
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });

    const base = new URL(request.url).origin;
    return json({ id, url: `${base}/c/${id}`, image: blob.url }, 200, cors);
  } catch (error) {
    console.error('card upload failed', error);
    return json({ error: 'Could not store the card' }, 500, cors);
  }
}

/** URL-safe id with enough entropy that cards are not enumerable. */
function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Allows the GitHub Pages origin plus any Vercel preview of this project.
 * Everything else is refused, so the endpoint is not a general-purpose host.
 */
function corsHeaders(origin: string): Record<string, string> {
  const allowed =
    origin === 'https://roshan5619.github.io' ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) ||
    /^http:\/\/localhost:\d+$/.test(origin);

  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://roshan5619.github.io',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(payload: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
