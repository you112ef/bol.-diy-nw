// Global setup for Vitest tests
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import '@testing-library/jest-dom'; // For extended matchers

// Ensure import.meta.hot and import.meta.hot.data are defined for tests.
if (typeof import.meta.hot === 'object' && import.meta.hot !== null) {
  // @ts-ignore: Allow assigning to data even if not explicitly in type
  if (typeof import.meta.hot.data === 'undefined') {
    // @ts-ignore
    import.meta.hot.data = {};
  }
} else {
  Object.defineProperty(globalThis, 'import.meta', {
    value: {
      hot: {
        data: {},
        accept: () => {},
        dispose: () => {},
      },
    },
    configurable: true,
    writable: true,
  });
}

console.log('Vitest global setup: fake-indexeddb, jest-dom, import.meta.hot.data shimmed. Webcontainer to be mocked in-spec.');
