/**
 * Single-screen builder: upload, fill, download, share. No routing, no gate.
 *
 * The card renders continuously from the first paint, so there is never a
 * "generating…" step — by the time someone has typed their name the image is
 * already finished and the download is a local canvas export.
 */

import { useCallback, useState } from 'react';
import { BuilderForm } from './ui/BuilderForm';
import { CardPreview } from './ui/CardPreview';
import { Uploader } from './ui/Uploader';
import { useCardBuilder } from './ui/useCardBuilder';
import { canvasToPng, cardFilename, downloadBlob } from './card/export';
import { shareCard } from './share/share';
import { EVENT } from './brand/tokens';

type Status = { tone: 'info' | 'error'; message: string } | null;

export default function App() {
  const builder = useCardBuilder();
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);

  /** Exports the current canvas, or reports why it could not. */
  const exportPng = useCallback(async () => {
    const canvas = builder.canvasRef.current;
    if (!canvas) throw new Error('The card is not ready yet. Give it a moment.');
    return canvasToPng(canvas);
  }, [builder.canvasRef]);

  const handleDownload = useCallback(async () => {
    setBusy('download');
    setStatus(null);
    try {
      const blob = await exportPng();
      downloadBlob(blob, cardFilename(builder.fields.name));
      setStatus({ tone: 'info', message: 'Saved. Check your downloads.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Could not save the card.',
      });
    } finally {
      setBusy(null);
    }
  }, [builder.fields.name, exportPng]);

  const handleShare = useCallback(async () => {
    setBusy('share');
    setStatus(null);
    try {
      const blob = await exportPng();
      const outcome = await shareCard({
        blob,
        filename: cardFilename(builder.fields.name),
        builderClass: builder.identity.builderClass,
      });

      if (outcome.kind === 'failed') {
        setStatus({ tone: 'error', message: outcome.message });
      } else if (outcome.kind === 'composer-opened') {
        setStatus({
          tone: 'info',
          message: outcome.downloaded
            ? 'X is open with your caption. Your card also downloaded — attach it to the post.'
            : 'X is open with your caption ready.',
        });
      } else if (outcome.kind === 'shared') {
        setStatus({ tone: 'info', message: 'Shared. See you in Goa.' });
      }
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Could not share the card.',
      });
    } finally {
      setBusy(null);
    }
  }, [builder.fields.name, builder.identity.builderClass, exportPng]);

  return (
    <div className="app">
      <header className="masthead">
        <p className="masthead__kicker">{EVENT.city} · {EVENT.dates}</p>
        <h1 className="masthead__title">
          Build your <span className="masthead__accent">builder ID</span>
        </h1>
        <p className="masthead__lede">
          Upload a photo, add two lines, and post it. No account, no waiting — the card is made on
          your device.
        </p>
      </header>

      <main className="layout">
        <section className="layout__preview" aria-label="Your card">
          <CardPreview
            canvasRef={builder.canvasRef}
            hasPhoto={Boolean(builder.photo)}
            zoom={builder.transform.zoom}
            onNudge={builder.nudgeTransform}
            onZoom={builder.setZoom}
            onReset={builder.resetTransform}
          />
        </section>

        <section className="layout__controls" aria-label="Card details">
          <Uploader
            onFile={(file) => void builder.acceptFile(file)}
            busy={builder.photoBusy}
            hasPhoto={Boolean(builder.photo)}
            onReplace={builder.clearPhoto}
          />

          {builder.error && (
            <p className="notice notice--error" role="alert">
              {builder.error}
              <button type="button" className="notice__dismiss" onClick={builder.dismissError}>
                Dismiss
              </button>
            </p>
          )}

          {builder.warnings.map((warning) => (
            <p key={warning} className="notice notice--warn">
              {warning}
            </p>
          ))}

          <BuilderForm
            fields={builder.fields}
            setField={builder.setField}
            toggleBagItem={builder.toggleBagItem}
            builderClass={builder.identity.builderClass}
            onReroll={builder.rerollClass}
          />

          <div className="actions">
            <button
              type="button"
              className="button button--primary button--wide"
              onClick={() => void handleDownload()}
              disabled={!builder.ready || busy !== null}
            >
              {busy === 'download' ? 'Saving…' : 'Download card'}
            </button>
            <button
              type="button"
              className="button button--x button--wide"
              onClick={() => void handleShare()}
              disabled={!builder.ready || busy !== null}
            >
              {busy === 'share' ? 'Opening…' : 'Share to X'}
            </button>
          </div>

          {status && (
            <p
              className={`notice notice--${status.tone === 'error' ? 'error' : 'ok'}`}
              role="status"
            >
              {status.message}
            </p>
          )}

          <p className="fineprint">
            Your photo is processed on your device and never uploaded when you download. Sharing a
            link uploads only the finished card so the preview works.
          </p>
        </section>
      </main>

      <footer className="footer">
        <span>
          {EVENT.name} · {EVENT.organiser}
        </span>
        <span className="footer__build">
          v{__APP_VERSION__} · {__APP_COMMIT__}
        </span>
      </footer>
    </div>
  );
}
