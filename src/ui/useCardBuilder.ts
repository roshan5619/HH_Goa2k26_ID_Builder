/**
 * The application's single piece of state.
 *
 * Holds the form fields, the decoded photo and its crop transform, and keeps a
 * canvas rendered in step with all of them. Kept in one hook because every
 * value here feeds the same canvas — splitting it across contexts would only
 * add indirection and re-render churn on a screen this small.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { decodePhoto, detectFace, PhotoError, type DecodedPhoto } from '../card/decode';
import {
  clampTransform,
  IDENTITY_TRANSFORM,
  transformForFace,
  type Transform,
} from '../card/geometry';
import { deriveBuilderClass, mintBuilderId } from '../card/builderClass';
import { renderCard, waitForFonts, type CardData } from '../card/renderCard';
import { qrMatrix } from '../card/qr';
import { CARD } from '../brand/tokens';

/**
 * The frame size the crop transform is expressed against.
 *
 * Matches the longer edge of the passport photo panel in renderCard, which is
 * what the cover-fit maths is applied to.
 */
const FRAME = CARD.height * 0.24;

export interface Fields {
  name: string;
  role: string;
  shipping: string;
}

export interface CardBuilder {
  fields: Fields;
  setField: <K extends keyof Fields>(key: K, value: Fields[K]) => void;

  photo: DecodedPhoto | null;
  photoBusy: boolean;
  /** User-facing problem with the last upload, if any. */
  error: string | null;
  /** Non-blocking notes, e.g. a low-resolution photo. */
  warnings: string[];
  dismissError: () => void;
  acceptFile: (file: File | Blob) => Promise<void>;
  clearPhoto: () => void;

  transform: Transform;
  nudgeTransform: (delta: { dx?: number; dy?: number; dzoom?: number }) => void;
  setZoom: (zoom: number) => void;
  resetTransform: () => void;

  identity: { builderClass: string; builderId: string };
  rerollClass: () => void;
  /** Issues a brand new passport number for the current card. */
  reissueId: () => void;

  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** True once fonts are ready and the first paint has happened. */
  ready: boolean;
  cardData: CardData;
}

export function useCardBuilder(): CardBuilder {
  const [fields, setFields] = useState<Fields>({ name: '', role: '', shipping: '' });

  const [photo, setPhoto] = useState<DecodedPhoto | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [transform, setTransform] = useState<Transform>(IDENTITY_TRANSFORM);
  const [variant, setVariant] = useState(0);
  // Every card issued is its own document, so the number is minted per card
  // rather than derived from the name: two builders called the same thing get
  // different passports, as do two visits by the same person.
  const [builderId, setBuilderId] = useState(mintBuilderId);
  const [fontsReady, setFontsReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Tracks the bitmap currently on screen so the previous one can be released
  // when it is replaced; phones run out of memory quickly otherwise.
  const previousBitmap = useRef<ImageBitmap | null>(null);

  useEffect(() => {
    let cancelled = false;
    void waitForFonts().then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Release the final bitmap when the app unmounts.
  useEffect(
    () => () => {
      previousBitmap.current?.close();
    },
    [],
  );

  const identity = useMemo(
    () => ({ builderClass: deriveBuilderClass(fields.name, variant), builderId }),
    [fields.name, variant, builderId],
  );

  const cardData = useMemo<CardData>(
    () => ({
      name: fields.name,
      role: fields.role,
      shipping: fields.shipping,
      ...identity,
    }),
    [fields, identity],
  );

  const qr = useMemo(() => qrMatrix(window.location.href.split('?')[0]), []);

  // Repaint whenever anything the card depends on changes. Rendering is a few
  // milliseconds, so this can run synchronously on every keystroke without a
  // debounce — the preview tracking the form exactly is worth more than the
  // handful of frames a debounce would save.
  useEffect(() => {
    if (!fontsReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderCard(ctx, { data: cardData, photo: photo?.bitmap ?? null, transform, qr });
  }, [cardData, photo, transform, qr, fontsReady]);

  const setField = useCallback(<K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
  }, []);

  const acceptFile = useCallback(async (file: File | Blob) => {
    setPhotoBusy(true);
    setError(null);
    setWarnings([]);

    try {
      const decoded = await decodePhoto(file);

      // Centre on the subject's face where the browser can find one; otherwise
      // the centred cover crop already handles the common case.
      let initial = IDENTITY_TRANSFORM;
      const face = await detectFace(decoded.bitmap);
      if (face) initial = transformForFace(decoded.size, FRAME, face);

      previousBitmap.current?.close();
      previousBitmap.current = decoded.bitmap;

      // A new photo means a new card, so it is issued a new number.
      setBuilderId(mintBuilderId());
      setPhoto(decoded);
      setWarnings(decoded.warnings);
      setTransform(initial);
    } catch (cause) {
      // Expected, actionable problems carry their own message; anything else
      // gets a generic one rather than leaking an internal error string.
      setError(
        cause instanceof PhotoError
          ? cause.message
          : "That photo couldn't be used. Try a different one.",
      );
    } finally {
      setPhotoBusy(false);
    }
  }, []);

  const clearPhoto = useCallback(() => {
    previousBitmap.current?.close();
    previousBitmap.current = null;
    setPhoto(null);
    setWarnings([]);
    setTransform(IDENTITY_TRANSFORM);
  }, []);

  const nudgeTransform = useCallback(
    ({ dx = 0, dy = 0, dzoom = 0 }: { dx?: number; dy?: number; dzoom?: number }) => {
      setTransform((current) => {
        if (!photo) return current;
        return clampTransform(photo.size, FRAME, {
          zoom: current.zoom + dzoom,
          offsetX: current.offsetX + dx,
          offsetY: current.offsetY + dy,
        });
      });
    },
    [photo],
  );

  const setZoom = useCallback(
    (zoom: number) => {
      setTransform((current) => {
        if (!photo) return current;
        return clampTransform(photo.size, FRAME, { ...current, zoom });
      });
    },
    [photo],
  );

  const resetTransform = useCallback(() => setTransform(IDENTITY_TRANSFORM), []);
  const rerollClass = useCallback(() => setVariant((v) => v + 1), []);
  const reissueId = useCallback(() => setBuilderId(mintBuilderId()), []);
  const dismissError = useCallback(() => setError(null), []);

  return {
    fields,
    setField,
    photo,
    photoBusy,
    error,
    warnings,
    dismissError,
    acceptFile,
    clearPhoto,
    transform,
    nudgeTransform,
    setZoom,
    resetTransform,
    identity,
    rerollClass,
    reissueId,
    canvasRef,
    ready: fontsReady,
    cardData,
  };
}

/** The crop frame size, exported so gesture handlers can scale their deltas. */
export const CROP_FRAME = FRAME;
