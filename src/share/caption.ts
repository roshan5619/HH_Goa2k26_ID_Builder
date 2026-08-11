/**
 * The pre-filled post text.
 *
 * `#FrameInGoa` is required by the event brief and must survive every path,
 * so it is appended here rather than at each call site.
 */

const REQUIRED_HASHTAG = '#FrameInGoa';
const SUPPORTING_HASHTAGS = ['#HackerHouse', '#Goa2026'];

/** Builds the caption that pre-fills the composer. */
export function buildCaption(builderClass: string): string {
  const title = builderClass.trim();
  const lead = title
    ? `Just minted my Hacker House Goa 2026 builder ID — certified ${title}. 🌴`
    : 'Just minted my Hacker House Goa 2026 builder ID. 🌴';

  return [lead, '28–31 Oct · Goa, India', [REQUIRED_HASHTAG, ...SUPPORTING_HASHTAGS].join(' ')].join(
    '\n\n',
  );
}

/**
 * The X composer URL.
 *
 * `url` is omitted when sharing the image directly, since X would otherwise
 * render a link card alongside the attached picture.
 */
export function composerUrl(caption: string, url?: string): string {
  const params = new URLSearchParams({ text: caption });
  if (url) params.set('url', url);
  return `https://x.com/intent/post?${params.toString()}`;
}
