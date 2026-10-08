import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const directories = ['frontend/js', 'scripts', 'tests', 'pb/pb_migrations'];
const files = ['server.js', ...directories.flatMap(dir => fs.readdirSync(dir).filter(name => name.endsWith('.js')).map(name => path.join(dir, name)))];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
}
for (const file of ['frontend/css/app.css', 'frontend/css/studio.css', 'frontend/js/bootstrap.js', 'frontend/env.js']) {
  if (!fs.existsSync(file)) throw new Error('Missing frontend asset: ' + file);
}
console.log(`Checked ${files.length} JavaScript files and frontend entry assets.`);
