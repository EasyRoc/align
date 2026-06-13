import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(path: string): string {
  return readFileSync(resolve(__dirname, '..', path), 'utf8');
}

describe('UI regressions', () => {
  it('keeps the stats heatmap as compact cells with theme-aware empty color', () => {
    const source = readSource('src/components/TrendChart.tsx');

    expect(source).toContain('grid-cols-[repeat(10,1.5rem)]');
    expect(source).toContain('var(--color-heat-empty)');
  });

  it('does not render duplicated Settings button text in Dashboard', () => {
    const source = readSource('src/pages/Dashboard.tsx');

    expect(source).not.toContain('设置\\n                设置');
  });
});
