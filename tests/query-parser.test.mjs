import test from 'node:test';
import assert from 'node:assert/strict';

const normalizeToken = (token) => token.trim().replace(/^INS\s*/i, '').replace(/\s+/g, '').trim();
const lookupKey = (value) => String(value ?? '').toLowerCase().replace(/\s+/g, '').replace(/[()\[\]]/g, '');

function parseQuery(raw) {
  const matches = String(raw || '').match(/(?:INS\s*)?\d{2,4}(?:\s*\([ivx]+\)|[a-z])?/gi) || [];
  const seen = new Set();
  const tokens = [];
  for (const match of matches) {
    const token = normalizeToken(match);
    const key = lookupKey(token);
    if (!token || !key || seen.has(key)) continue;
    seen.add(key);
    tokens.push(token);
  }
  return tokens;
}

test('comma-separated INS values', () => assert.deepEqual(parseQuery('300, 406, 491'), ['300','406','491']));
test('accepts INS prefix and whitespace', () => assert.deepEqual(parseQuery('INS 300 INS406\n491'), ['300','406','491']));
test('deduplicates values', () => assert.deepEqual(parseQuery('300,300, INS 300'), ['300']));
test('preserves parenthesized INS number', () => assert.deepEqual(parseQuery('100(i)'), ['100(i)']));
test('normalizes spacing around parenthesized INS number', () => assert.deepEqual(parseQuery('INS 100 (i)'), ['100(i)']));
test('deduplicates equivalent parenthesized lookup forms', () => assert.deepEqual(parseQuery('100(i), 100 (i), 100i'), ['100(i)']));
test('lookup key matches official and compact forms', () => assert.equal(lookupKey('100(i)'), lookupKey('100i')));
