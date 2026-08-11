/**
 * The live card preview, with drag-to-pan and pinch-to-zoom over the portrait.
 *
 * Pointer events cover mouse, touch and pen with one code path. Gesture deltas
 * are converted from screen pixels into card pixels before being applied, so
 * dragging feels the same regardless of how large the preview is rendered.
 */

import { useCallback, useEffect, useRef } from 'react';
import { CARD } from '../brand/tokens';
import { MAX_ZOOM, MIN_ZOOM } from '../card/geometry';

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  hasPhoto: boolean;
  zoom: number;
  onNudge: (delta: { dx?: number; dy?: number }) => void;
  onZoom: (zoom: number) => void;
  onReset: () => void;
}

export function CardPreview({ canvasRef, hasPhoto, zoom, onNudge, onZoom, onReset }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // Active pointers, keyed by id, so a two-finger pinch can be distinguished
  // from two independent drags.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);

  /** Screen pixels to card pixels. */
  const scaleFactor = useCallback(() => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 1;
    return CARD.width / rect.width;
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!hasPhoto) return;
      (event.target as Element).setPointerCapture?.(event.pointerId);
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    },
    [hasPhoto],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!hasPhoto) return;
      const previous = pointers.current.get(event.pointerId);
      if (!previous) return;

      const current = { x: event.clientX, y: event.clientY };
      pointers.current.set(event.pointerId, current);

      const points = [...pointers.current.values()];

      if (points.length >= 2) {
        // Pinch: drive zoom from the change in distance between two fingers.
        const [a, b] = points;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (!pinchStart.current) {
          pinchStart.current = { distance, zoom };
        } else if (pinchStart.current.distance > 0) {
          const ratio = distance / pinchStart.current.distance;
          onZoom(pinchStart.current.zoom * ratio);
        }
        return;
      }

      pinchStart.current = null;
      const factor = scaleFactor();
      onNudge({ dx: (current.x - previous.x) * factor, dy: (current.y - previous.y) * factor });
    },
    [hasPhoto, onNudge, onZoom, scaleFactor, zoom],
  );

  const endPointer = useCallback((event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  }, []);

  // A non-passive wheel listener is required to zoom without scrolling the page;
  // React's onWheel is registered passively and cannot call preventDefault.
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      if (!hasPhoto) return;
      event.preventDefault();
      onZoom(zoom * (event.deltaY > 0 ? 0.94 : 1.06));
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [hasPhoto, onZoom, zoom]);

  return (
    <div className="preview">
      <div
        ref={wrapRef}
        className={`preview__stage${hasPhoto ? ' preview__stage--interactive' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
      >
        <canvas
          ref={canvasRef}
          width={CARD.width}
          height={CARD.height}
          className="preview__canvas"
          role="img"
          aria-label="Live preview of your Hacker House Goa 2026 builder ID card"
        />
      </div>

      {hasPhoto && (
        <div className="preview__controls">
          <label className="preview__zoom">
            <span className="preview__zoomLabel">Zoom</span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => onZoom(Number(event.target.value))}
              aria-label="Zoom the photo inside the frame"
            />
          </label>
          <button type="button" className="button button--ghost button--small" onClick={onReset}>
            Recentre
          </button>
        </div>
      )}

      <p className="preview__hint">
        {hasPhoto ? 'Drag the card to reposition your photo · pinch or scroll to zoom' : ' '}
      </p>
    </div>
  );
}
