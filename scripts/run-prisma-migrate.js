/**
 * Jalankan Prisma migrate deploy (pakai .env.local / .env untuk DATABASE_URL).
 * Dari folder admin-web: npm run db:migrate:prisma
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');

function loadEnvFile() {
  if (process.env.DATABASE_URL) return;
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
    break;
  }
}

loadEnvFile();

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL tidak diset. Set di .env atau .env.local');
  process.exit(1);
}

const [cmd, ...args] = process.argv.slice(2);
const prismaCmd = cmd === 'resolve' && args[0]
  ? `npx prisma migrate resolve --applied "${args[0]}"`
  : 'npx prisma migrate deploy';

execSync(prismaCmd, {
  stdio: 'inherit',
  env: process.env,
  cwd: root,
});
