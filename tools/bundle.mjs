/**
 * CYBER BBS — Standalone Bundle & Synchronization Utility
 *
 * Bundles modular files in assets/js/ into index.html and copies to cyber-bbs.html.
 */
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const templatePath = path.join(rootDir, 'tools', 'template-header.html');
const indexPath = path.join(rootDir, 'index.html');
const copyPath = path.join(rootDir, 'cyber-bbs.html');

const moduleOrder = [
  'assets/js/audio.js',
  'assets/js/store.js',
  'assets/js/net.js',
  'assets/js/ansi.js',
  'assets/js/term.js',
  'assets/js/games.js',
  'assets/js/doors.js',
  'assets/js/app.js'
];

console.log('Bundling CYBER BBS standalone single-file...');
const header = fs.readFileSync(templatePath, 'utf-8');

let bundle = header;
for (const mod of moduleOrder) {
  const modPath = path.join(rootDir, mod);
  if (!fs.existsSync(modPath)) {
    throw new Error(`Missing module: ${mod}`);
  }
  const code = fs.readFileSync(modPath, 'utf-8');
  bundle += `/* --- ${mod} --- */\n` + code.trim() + '\n\n';
}

bundle += '  </script>\n</body>\n</html>\n';

fs.writeFileSync(indexPath, bundle, 'utf-8');
fs.writeFileSync(copyPath, bundle, 'utf-8');

const stats = fs.statSync(indexPath);
console.log(`Success! Generated index.html and cyber-bbs.html (${Math.round(stats.size / 1024)} KB)`);
