/**
 * The document fields.
 *
 * Three text inputs and two generated values. Everything else the card prints —
 * validity, authority, entry clearance, the machine-readable zone — is derived,
 * because every additional input is friction between upload and download.
 */

import type { Fields } from './useCardBuilder';

interface Props {
  fields: Fields;
  setField: <K extends keyof Fields>(key: K, value: Fields[K]) => void;
  builderClass: string;
  builderId: string;
  onReroll: () => void;
  onReissue: () => void;
}

/** Long enough for real entries, short enough that the row stays readable. */
const LIMITS = { name: 26, role: 28, shipping: 30 };

export function BuilderForm({
  fields,
  setField,
  builderClass,
  builderId,
  onReroll,
  onReissue,
}: Props) {
  return (
    <div className="form">
      <label className="field">
        <span className="field__label">Name</span>
        <input
          className="field__input"
          type="text"
          value={fields.name}
          maxLength={LIMITS.name}
          placeholder="Madhavan Singh"
          autoComplete="name"
          enterKeyHint="next"
          onChange={(event) => setField('name', event.target.value)}
        />
      </label>

      <label className="field">
        <span className="field__label">Stack or role</span>
        <input
          className="field__input"
          type="text"
          value={fields.role}
          maxLength={LIMITS.role}
          placeholder="Full stack developer"
          enterKeyHint="next"
          onChange={(event) => setField('role', event.target.value)}
        />
      </label>

      <label className="field">
        <span className="field__label">Now shipping</span>
        <input
          className="field__input"
          type="text"
          value={fields.shipping}
          maxLength={LIMITS.shipping}
          placeholder="Building the future"
          enterKeyHint="done"
          onChange={(event) => setField('shipping', event.target.value)}
        />
      </label>

      <div className="field">
        <span className="field__label">
          Builder class
          <button type="button" className="field__reroll" onClick={onReroll}>
            Reroll
          </button>
        </span>
        <output className="field__generated">{builderClass}</output>
      </div>

      <div className="field">
        <span className="field__label">
          Passport number
          <button type="button" className="field__reroll" onClick={onReissue}>
            Reissue
          </button>
        </span>
        <output className="field__generated field__generated--mono">{builderId}</output>
        <p className="field__note">
          Issued fresh for every card, so no two passports carry the same number.
        </p>
      </div>
    </div>
  );
}
