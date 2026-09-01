import test from 'node:test';
import assert from 'node:assert/strict';

function parseQuery(raw) {
  const normalizeToken = (token) => token.trim().replace(/^INS\s*/i, '').replace(/[()\[\]]/g, '').trim();
  const matches = String(raw || '').match(/(?:INS\s*)?\d{2,4}(?:\s*\([ivx]+\)|[a-z])?/gi) || [];
  return [...new Set(matches.map(normalizeToken).filter(Boolean))];
}

test('comma-separated INS values', () => assert.deepEqual(parseQuery('300, 406, 491'), ['300','406','491']));
test('accepts INS prefix and whitespace', () => assert.deepEqual(parseQuery('INS 300 INS406\n491'), ['300','406','491']));
test('deduplicates values', () => assert.deepEqual(parseQuery('300,300, INS 300'), ['300']));
