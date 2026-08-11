import { describe, expect, it } from 'vitest';
import { deriveIdentity, hashString, TITLE_SPACE } from '../../src/card/builderClass';

describe('deriveIdentity', () => {
  it('is deterministic for the same name', () => {
    expect(deriveIdentity('Madhavan Singh')).toEqual(deriveIdentity('Madhavan Singh'));
  });

  it('ignores case and surrounding whitespace', () => {
    expect(deriveIdentity('  ADA   Lovelace ')).toEqual(deriveIdentity('ada lovelace'));
  });

  it('gives different names different identities', () => {
    const a = deriveIdentity('Ada Lovelace');
    const b = deriveIdentity('Grace Hopper');
    expect(a.builderClass).not.toEqual(b.builderClass);
  });

  it('changes the title on reroll but keeps the builder ID stable', () => {
    const first = deriveIdentity('Ada Lovelace', 0);
    const second = deriveIdentity('Ada Lovelace', 1);
    expect(second.builderClass).not.toEqual(first.builderClass);
    // The ID is the builder's identifier for the event; rerolling the flavour
    // text must not renumber them.
    expect(second.builderId).toEqual(first.builderId);
  });

  it('falls back to a stable identity for a blank name', () => {
    const blank = deriveIdentity('');
    expect(blank.builderClass).toMatch(/^[A-Z-]+ [A-Z]+$/);
    expect(blank).toEqual(deriveIdentity('   '));
  });

  it('formats the builder ID as four padded digits', () => {
    for (const name of ['a', 'Ada', 'Grace Hopper', 'Zaha Hadid', '本田']) {
      expect(deriveIdentity(name).builderId).toMatch(/^#HH-GOA-\d{4}$/);
    }
  });

  it('handles emoji and non-Latin names without throwing', () => {
    expect(() => deriveIdentity('🌴 सर्वेश 🌊')).not.toThrow();
    expect(deriveIdentity('सर्वेश').builderClass).toMatch(/^[A-Z-]+ [A-Z]+$/);
  });

  it('spreads titles across a decent share of the space', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 600; i += 1) seen.add(deriveIdentity(`builder ${i}`).builderClass);
    // Collisions are expected from hashing, but a badly mixed hash would
    // collapse to a handful of titles; assert we stay well clear of that.
    expect(seen.size).toBeGreaterThan(300);
    expect(TITLE_SPACE).toBe(1600);
  });
});

describe('hashString', () => {
  it('returns an unsigned 32-bit integer', () => {
    for (const value of ['', 'a', 'the quick brown fox', '🌴']) {
      const hash = hashString(value);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('is sensitive to order', () => {
    expect(hashString('ab')).not.toBe(hashString('ba'));
  });
});
