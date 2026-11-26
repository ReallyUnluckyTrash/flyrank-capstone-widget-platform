import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.stubEnv('VITE_PUBLIC_APP_URL', 'http://localhost:3000');
