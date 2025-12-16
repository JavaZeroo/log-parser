/**
 * Generate test log file for browser testing
 * Run with: node scripts/generate-test-file.js [lines]
 * Example: node scripts/generate-test-file.js 100000
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const numLines = parseInt(process.argv[2]) || 100000;

console.log(`\n📝 Generating test file with ${numLines.toLocaleString()} lines...`);

const lines = [];
for (let i = 0; i < numLines; i++) {
  const step = i;
  const loss = Math.random() * 2 + Math.exp(-i / 10000);
  const gradNorm = Math.random() * 0.5 + 0.1;
  lines.push(`step: ${step} | loss: ${loss.toFixed(6)} | grad_norm: ${gradNorm.toFixed(6)}`);
}

const content = lines.join('\n');
const outputPath = path.join(__dirname, `test-${numLines}.log`);

fs.writeFileSync(outputPath, content);

const stats = fs.statSync(outputPath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log(`✓ Created: ${outputPath}`);
console.log(`✓ Size: ${sizeMB} MB`);
console.log(`\n📌 Drag this file into the Log Analyzer to test!`);
