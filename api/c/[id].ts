/**
 * The shareable card page.
 *
 * Server-rendered on purpose: this is the whole reason the share service exists.
 * Social crawlers fetch the URL once and read the HTML without executing any
 * JavaScript, so the `og:image` tag must be present in the response body. A
 * static host cannot do this per card, which is why the link path routes here.
 *
 * Humans who open the link see the card and a route back to the builder.
 */

import { head } from '@vercel/blob';

export const config = { runtime: 'nodejs' };

const BUILDER_URL = 'https://roshan5619.github.io/HH_Goa2k26_ID_Builder/';

export default async function handler(request: Request): Promise<Response> {
  const id = new URL(request.url).pathname.split('/').filter(Boolean).pop() ?? '';

  // Ids are hex from the upload endpoint; rejecting anything else keeps
  // arbitrary paths from reaching blob storage.
  if (!/^[0-9a-f]{18}$/.test(id)) {
    return html(notFoundPage(), 404);
  }

  const origin = new URL(request.url).origin;
  const imageUrl = await resolveImage(id);
  if (!imageUrl) return html(notFoundPage(), 404);

  return html(cardPage({ id, imageUrl, pageUrl: `${origin}/c/${id}` }), 200);
}

/** Confirms the card exists and returns its public blob URL. */
async function resolveImage(id: string): Promise<string | null> {
  try {
    const blob = await head(`cards/${id}.png`);
    return blob.url;
  } catch {
    return null;
  }
}

function cardPage({
  id,
  imageUrl,
  pageUrl,
}: {
  id: string;
  imageUrl: string;
  pageUrl: string;
}): string {
  const title = 'My Hacker House Goa 2026 builder ID';
  const description = 'Hacker House Goa 2026 · 28–31 Oct · Goa, India · #FrameInGoa';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">

<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHtml(pageUrl)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:image:width" content="1080">
<meta property="og:image:height" content="1620">
<meta property="og:image:alt" content="${escapeHtml(title)}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">

<style>
  :root { color-scheme: dark; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; gap: 22px;
    padding: 28px 18px; background: #042C12; color: #FAECD5;
    font-family: 'Helvetica Neue', Arial, sans-serif; text-align: center;
  }
  img { width: min(380px, 86vw); height: auto; border-radius: 14px; display: block; }
  h1 { font-size: 1.15rem; font-weight: 800; margin: 0; letter-spacing: .01em; }
  p  { margin: 0; color: rgba(250,236,213,.7); font-size: .9rem; line-height: 1.5; }
  a.cta {
    display: inline-block; padding: 13px 24px; border-radius: 999px;
    background: #F5C419; color: #042C12; font-weight: 800; text-decoration: none;
  }
  a.dl { color: #F5C419; font-size: .82rem; }
</style>
</head>
<body>
  <h1>Hacker House Goa 2026 · Builder ID</h1>
  <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" width="1080" height="1620">
  <p>28–31 Oct · Goa, India<br>#FrameInGoa</p>
  <a class="cta" href="${BUILDER_URL}">Build your own</a>
  <a class="dl" href="${escapeHtml(imageUrl)}" download="hh-goa-2026-${escapeHtml(id)}.png">Download this card</a>
</body>
</html>`;
}

function notFoundPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Card not found</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; gap:18px;
    background:#042C12; color:#FAECD5; font-family:'Helvetica Neue',Arial,sans-serif;
    text-align:center; padding:24px; }
  a { display:inline-block; padding:13px 24px; border-radius:999px;
    background:#F5C419; color:#042C12; font-weight:800; text-decoration:none; }
</style>
</head>
<body>
  <div>
    <h1>That card has expired</h1>
    <p>Shared cards are kept for 30 days. Make a fresh one — it takes a few seconds.</p>
    <a href="${BUILDER_URL}">Build your builder ID</a>
  </div>
</body>
</html>`;
}

function html(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Crawlers and humans can both cache this; the card never changes.
      'Cache-Control': status === 200 ? 'public, max-age=3600, s-maxage=86400' : 'no-store',
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
