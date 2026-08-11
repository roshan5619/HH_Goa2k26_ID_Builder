/**
 * Sharing the finished card to X.
 *
 * Two paths, chosen by capability rather than by sniffing the user agent:
 *
 * 1. Where the browser can share files (most phones), the PNG is handed to the
 *    native share sheet and lands in the X composer as a genuine attachment.
 *    No link preview is involved, so nothing can render a blank thumbnail.
 * 2. Otherwise the card is uploaded to the share service, which serves a page
 *    carrying real Open Graph tags, and the composer opens with that link. The
 *    PNG is downloaded at the same time so the user can attach it directly if
 *    they would rather not post a link.
 */

import { buildCaption, composerUrl } from './caption';
import { downloadBlob, pngToFile } from '../card/export';
import { uploadCard, shareServiceConfigured } from './linkShare';

export type ShareOutcome =
  | { kind: 'shared' }
  | { kind: 'cancelled' }
  | { kind: 'composer-opened'; downloaded: boolean }
  | { kind: 'failed'; message: string };

/** Whether this browser can attach the PNG to a native share. */
export function canShareFile(file: File): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function' &&
    navigator.canShare({ files: [file] })
  );
}

export interface ShareInput {
  blob: Blob;
  filename: string;
  builderClass: string;
}

/** Shares the card, preferring a direct image attachment. */
export async function shareCard({ blob, filename, builderClass }: ShareInput): Promise<ShareOutcome> {
  const caption = buildCaption(builderClass);
  const file = pngToFile(blob, filename);

  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], text: caption });
      return { kind: 'shared' };
    } catch (error) {
      // A dismissed share sheet is a normal user action, not a failure. Chrome
      // and Safari both report it as AbortError.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { kind: 'cancelled' };
      }
      // Anything else (NotAllowedError, an unexpected rejection) falls through
      // to the link path so the user is never left without a way to post.
    }
  }

  return shareViaLink({ blob, filename, caption });
}

/**
 * Fallback: upload for a previewable link, open the composer, and download the
 * PNG so the user has the file either way.
 */
async function shareViaLink({
  blob,
  filename,
  caption,
}: {
  blob: Blob;
  filename: string;
  caption: string;
}): Promise<ShareOutcome> {
  let link: string | undefined;

  if (shareServiceConfigured()) {
    try {
      link = await uploadCard(blob);
    } catch {
      // Offline, blocked, or the service is down. The composer still opens with
      // the caption, and the download below means the user can attach manually.
    }
  }

  // The download happens before the popup so a blocked popup still leaves the
  // user holding their card.
  let downloaded = false;
  try {
    downloadBlob(blob, filename);
    downloaded = true;
  } catch {
    downloaded = false;
  }

  const opened = window.open(composerUrl(caption, link), '_blank', 'noopener,noreferrer');
  if (!opened) {
    return {
      kind: 'failed',
      message: downloaded
        ? 'Your card downloaded, but the browser blocked the X window. Allow popups and try Share again.'
        : 'The browser blocked the X window. Allow popups and try again.',
    };
  }

  return { kind: 'composer-opened', downloaded };
}
