import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom in Node 22+ does not expose localStorage by default.
// Provide a minimal localStorage polyfill for the test environment.
if (typeof localStorage === 'undefined' || localStorage === null) {
  const store = {};
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem:    (k)      => store[k] ?? null,
      setItem:    (k, v)   => { store[k] = String(v); },
      removeItem: (k)      => { delete store[k]; },
      clear:      ()       => { Object.keys(store).forEach((k) => delete store[k]); },
      get length()         { return Object.keys(store).length; },
      key:        (i)      => Object.keys(store)[i] ?? null,
    },
    writable: true,
  });
}

// In-memory mock for idb-keyval in Node test environment
const idbStore = new Map();
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key) => idbStore.get(key) ?? null),
  set: vi.fn(async (key, val) => { idbStore.set(key, val); }),
  del: vi.fn(async (key) => { idbStore.delete(key); }),
  clear: vi.fn(async () => { idbStore.clear(); }),
}));
