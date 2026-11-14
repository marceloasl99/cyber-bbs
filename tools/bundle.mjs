/**
 * CYBER BBS — Standalone synchronization utility
 *
 * The current product entry point is already self-contained. This command
 * keeps the historical `cyber-bbs.html` copy identical to `index.html`.
 */
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, 'index.html');
const outputPath = path.join(rootDir, 'cyber-bbs.html');

console.log('Synchronizing CYBER BBS standalone entry points...');
fs.copyFileSync(sourcePath, outputPath);

const stats = fs.statSync(outputPath);
console.log(`Success! Copied ${sourcePath} to ${outputPath} (${Math.round(stats.size / 1024)} KB)`);
