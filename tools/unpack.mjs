import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const indexPath = path.join(rootDir, 'index.html');
const content = fs.readFileSync(indexPath, 'utf-8');

const regex = /\/\* --- (assets\/js\/[a-z0-9_-]+\.js) --- \*\//g;
let match;
const matches = [];
while ((match = regex.exec(content)) !== null) {
  matches.push({ file: match[1], headerEnd: match.index + match[0].length, headerStart: match.index });
}

for (let i = 0; i < matches.length; i++) {
  const relPath = matches[i].file;
  const start = matches[i].headerEnd;
  const end = (i + 1 < matches.length) ? matches[i + 1].headerStart : content.lastIndexOf('</script>');
  const code = content.substring(start, end).replace(/^\r?\n/, '').replace(/\r?\n\s*$/, '\n');
  
  const destPath = path.join(rootDir, relPath);
  fs.writeFileSync(destPath, code, 'utf-8');
  console.log(`Extracted: ${relPath} (${code.split('\n').length} lines)`);
}
