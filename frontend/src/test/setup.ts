import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Auto-cleanup does not register itself when vitest globals are disabled
afterEach(() => {
  cleanup();
});
