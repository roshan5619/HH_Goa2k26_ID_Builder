/**
 * Photo drop zone and file picker.
 *
 * `accept` is deliberately permissive: iOS reports HEIC files with an empty
 * type, and a narrow accept list silently hides them in the picker. The real
 * validation happens in the decode pipeline, which reads the file's magic bytes.
 */

import { useCallback, useRef, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  busy: boolean;
  hasPhoto: boolean;
  onReplace: () => void;
}

export function Uploader({ onFile, busy, hasPhoto, onReplace }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = useCallback(() => inputRef.current?.click(), []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      className={`uploader${dragging ? ' uploader--dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="uploader__input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          // Reset so picking the same file twice still fires a change event.
          event.target.value = '';
        }}
      />

      <button type="button" className="button button--primary" onClick={pick} disabled={busy}>
        {busy ? 'Reading photo…' : hasPhoto ? 'Change photo' : 'Upload your photo'}
      </button>

      {hasPhoto && !busy && (
        <button type="button" className="button button--ghost" onClick={onReplace}>
          Remove
        </button>
      )}

      <p className="uploader__hint">
        JPG, PNG, WebP or HEIC from your iPhone. Any shape — we crop it for you.
      </p>
    </div>
  );
}
