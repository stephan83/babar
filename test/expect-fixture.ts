import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'vitest';

export const fixture = (name: string): string => join(__dirname, 'fixtures', `${name}.txt`);

// A missing fixture fails. UPDATE_FIXTURES=1 writes it, except legacy-* (0.2.3 output).
export function expectFixture(name: string, output: string, rewritable = true): void {
  if (rewritable && !name.startsWith('legacy-') && process.env.UPDATE_FIXTURES === '1') {
    writeFileSync(fixture(name), output);
    return;
  }
  expect(output, name).toBe(readFileSync(fixture(name), 'utf8'));
}
