/**
 * The badge fields.
 *
 * Kept to three text inputs plus a chip picker: the brief asks for a couple of
 * quick fields, and every extra input is friction between upload and download.
 * The builder class is generated rather than typed, so it costs nothing to fill
 * in but still feels personal.
 */

import { BEACH_BAG_OPTIONS, type Fields } from './useCardBuilder';

interface Props {
  fields: Fields;
  setField: <K extends keyof Fields>(key: K, value: Fields[K]) => void;
  toggleBagItem: (item: string) => void;
  builderClass: string;
  onReroll: () => void;
}

/** Long enough for real names, short enough that the banner stays readable. */
const LIMITS = { name: 28, role: 30, shipping: 34 };

export function BuilderForm({ fields, setField, toggleBagItem, builderClass, onReroll }: Props) {
  return (
    <div className="form">
      <label className="field">
        <span className="field__label">Your name</span>
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
        <span className="field__label">Currently shipping</span>
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

      <fieldset className="field field--chips">
        <legend className="field__label">Beach bag — pick up to three</legend>
        <div className="chips">
          {BEACH_BAG_OPTIONS.map((item) => {
            const chosen = fields.beachBag.includes(item);
            return (
              <button
                key={item}
                type="button"
                className={`chip${chosen ? ' chip--on' : ''}`}
                aria-pressed={chosen}
                onClick={() => toggleBagItem(item)}
              >
                {item}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
