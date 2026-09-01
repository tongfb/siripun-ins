import fs from 'node:fs/promises';

const pairs = [
  ['../data/ins.json', '../public/ins-assets/data/ins.json'],
  ['../data/research.json', '../public/ins-assets/data/research.json']
];

for (const [from, to] of pairs) {
  const input = new URL(from, import.meta.url);
  const output = new URL(to, import.meta.url);
  await fs.copyFile(input, output);
  console.log(`Synced ${from} -> ${to}`);
}

console.log('Source registry remains backend-only in data/sources.json.');
