import '@testing-library/jest-dom';

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
