import { describe, expect, it } from 'vitest';
import {
  deriveBuilderClass,
  hashString,
  mintBuilderId,
  TITLE_SPACE,
} from '../../src/card/builderClass';

describe('deriveBuilderClass', () => {
  it('is deterministic for the same name', () => {
    expect(deriveBuilderClass('Madhavan Singh')).toEqual(deriveBuilderClass('Madhavan Singh'));
  });

  it('ignores case and surrounding whitespace', () => {
    expect(deriveBuilderClass('  ADA   Lovelace ')).toEqual(deriveBuilderClass('ada lovelace'));
  });

  it('gives different names different classes', () => {
    expect(deriveBuilderClass('Ada Lovelace')).not.toEqual(deriveBuilderClass('Grace Hopper'));
  });

  it('changes on reroll', () => {
    expect(deriveBuilderClass('Ada Lovelace', 1)).not.toEqual(deriveBuilderClass('Ada Lovelace', 0));
  });

  it('falls back to a stable class for a blank name', () => {
    expect(deriveBuilderClass('')).toMatch(/^[A-Z-]+ [A-Z]+$/);
    expect(deriveBuilderClass('   ')).toEqual(deriveBuilderClass(''));
  });

  it('handles emoji and non-Latin names without throwing', () => {
    expect(() => deriveBuilderClass('🌴 सर्वेश 🌊')).not.toThrow();
    expect(deriveBuilderClass('सर्वेश')).toMatch(/^[A-Z-]+ [A-Z]+$/);
  });

  it('spreads classes across a decent share of the space', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 600; i += 1) seen.add(deriveBuilderClass(`builder ${i}`));
    // Collisions are expected from hashing, but a badly mixed hash would
    // collapse to a handful of titles; assert we stay well clear of that.
    expect(seen.size).toBeGreaterThan(300);
    expect(TITLE_SPACE).toBe(1600);
  });
});

describe('mintBuilderId', () => {
  it('is formatted as HH-GOA- plus six unambiguous characters', () => {
    for (let i = 0; i < 50; i += 1) {
      // No I, L, O or U: an id read off a screenshot must be unambiguous.
      expect(mintBuilderId()).toMatch(/^HH-GOA-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
    }
  });

  it('issues a different id every time, so no two cards collide', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i += 1) seen.add(mintBuilderId());
    // 32^6 is about a billion combinations, so 2000 draws colliding even once
    // would indicate the generator is not actually random.
    expect(seen.size).toBe(2000);
  });

  it('does not depend on the name, unlike the builder class', () => {
    expect(mintBuilderId()).not.toEqual(mintBuilderId());
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
