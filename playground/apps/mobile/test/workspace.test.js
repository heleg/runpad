import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSlug, sumPrices } from '../src/index.js';

test('normalizeSlug trims punctuation and normalizes case', () => {
  assert.equal(normalizeSlug('  Hello, World!  '), 'hello-world');
  assert.equal(normalizeSlug('---'), '');
});

test('sumPrices totals integer cents and rejects invalid prices', () => {
  assert.equal(sumPrices([125, 250, 99]), 474);
  assert.equal(sumPrices([]), 0);
  assert.throws(() => sumPrices([1.5]), TypeError);
  assert.throws(() => sumPrices([-1]), TypeError);
});
