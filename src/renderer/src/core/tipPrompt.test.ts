import { describe, expect, it } from 'vitest';
import { shouldShowTipPrompt } from './tipPrompt';

function storageFixture(initial: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(initial));

  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, value);
    }
  };
}

describe('tip prompt policy', () => {
  it('always shows the tip prompt on first launch', () => {
    const storage = storageFixture();
    expect(shouldShowTipPrompt(0.99, storage)).toBe(true);
    expect(storage.getItem('text-reader-tip-seen-once')).toBe('true');
  });

  it('shows the tip prompt by probability after first launch', () => {
    const storage = storageFixture({ 'text-reader-tip-seen-once': 'true' });
    expect(shouldShowTipPrompt(0.19, storage)).toBe(true);
    expect(shouldShowTipPrompt(0.2, storage)).toBe(false);
  });
});
