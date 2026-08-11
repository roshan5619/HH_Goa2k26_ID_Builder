/// <reference types="vite/client" />

/** Injected by Vite at build time (see vite.config.ts). */
declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;

/**
 * Shape API — available in Chromium behind a flag and on some Android builds.
 * Declared here because it is not in the standard DOM lib; every use site
 * treats it as optional and falls back when absent.
 */
interface FaceDetectorResult {
  boundingBox: DOMRectReadOnly;
}
declare class FaceDetector {
  constructor(options?: { fastMode?: boolean; maxDetectedFaces?: number });
  detect(image: ImageBitmapSource): Promise<FaceDetectorResult[]>;
}
