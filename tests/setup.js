import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.dbAPI
window.dbAPI = {
  invoke: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

// Mock window.confirm
window.confirm = vi.fn(() => true);
