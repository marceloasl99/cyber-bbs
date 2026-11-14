/**
 * CYBER BBS — Bundler Script
 * Inlines all CSS and JS into a single standalone `cyber-bbs.html` file
 * for instant double-click execution on Windows.
 */
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

console.log('Bundling CYBER BBS into standalone single-file cyber-bbs.html...');

const htmlPath = path.join(rootDir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Inline CSS
const css1 = fs.readFileSync(path.join(rootDir, 'assets/css/terminal.css'), 'utf8');
const css2 = fs.readFileSync(path.join(rootDir, 'assets/css/crt.css'), 'utf8');
const combinedCss = `<style>\n${css1}\n${css2}\n</style>`;

html = html.replace(/<link rel="stylesheet" href="assets\/css\/terminal\.css">\s*<link rel="stylesheet" href="assets\/css\/crt\.css">/, combinedCss);

// Inline JS
const scripts = [
  'assets/js/audio.js',
  'assets/js/store.js',
  'assets/js/net.js',
  'assets/js/ansi.js',
  'assets/js/term.js',
  'assets/js/doors.js',
  'assets/js/app.js'
];

let combinedJs = '<script>\n';
for (const scriptPath of scripts) {
  const content = fs.readFileSync(path.join(rootDir, scriptPath), 'utf8');
  combinedJs += `/* --- ${scriptPath} --- */\n${content}\n\n`;
}
combinedJs += '</script>';

html = html.replace(/<script src="assets\/js\/audio\.js"><\/script>[\s\S]*?<script src="assets\/js\/app\.js"><\/script>/, combinedJs);

const outputPath = path.join(rootDir, 'cyber-bbs.html');
fs.writeFileSync(outputPath, html, 'utf8');

const stats = fs.statSync(outputPath);
console.log(`Success! Created ${outputPath} (${Math.round(stats.size / 1024)} KB)`);
