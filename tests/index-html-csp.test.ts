import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('index.html CSP', () => {
  it('allows local MediaPipe WebAssembly compilation', () => {
    const html = readFileSync(resolve(__dirname, '../src/index.html'), 'utf8');

    expect(html).toContain("script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'");
  });
});
