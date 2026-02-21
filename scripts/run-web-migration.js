/**
 * Jalankan migrasi DB ke PostgreSQL: base (users, cases) lalu tabel web.
 * Butuh: DATABASE_URL di env atau di file .env / .env.local.
 * Urutan: docs/schema-base.sql → docs/schema-web-tables.sql
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Load .env atau .env.local jika DATABASE_URL belum diset
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

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL tidak diset.');
  console.error('Set di env, atau buat file .env / .env.local dengan isi:');
  console.error('  DATABASE_URL=postgresql://user:password@host:5432/railway');
  process.exit(1);
}

if (databaseUrl.includes('railway.internal')) {
  console.error('ERROR: DATABASE_URL memakai host internal Railway (postgres.railway.internal).');
  console.error('Host itu hanya bisa diakses dari dalam Railway, bukan dari PC kamu.');
  console.error('');
  console.error('Untuk migrasi dari lokal, pakai URL PUBLIK:');
  console.error('  Railway → PostgreSQL service → Connect → "Public URL" / TCP Proxy');
  console.error('  Copy connection string yang pakai host seperti *.railway.app atau *.proxy.rlwy.net');
  console.error('  Ganti di .env.local lalu jalankan lagi: npm run db:migrate');
  process.exit(1);
}

const basePath = path.join(root, 'docs', 'schema-base.sql');
const webPath = path.join(root, 'docs', 'schema-web-tables.sql');
const mobilePath = path.join(root, 'docs', 'schema-mobile-tables.sql');
const seedAdminPath = path.join(root, 'docs', 'schema-seed-admin.sql');

if (!fs.existsSync(basePath)) {
  console.error('ERROR: File tidak ditemukan:', basePath);
  process.exit(1);
}
if (!fs.existsSync(webPath)) {
  console.error('ERROR: File tidak ditemukan:', webPath);
  process.exit(1);
}
if (!fs.existsSync(mobilePath)) {
  console.error('ERROR: File tidak ditemukan:', mobilePath);
  process.exit(1);
}
if (!fs.existsSync(seedAdminPath)) {
  console.error('ERROR: File tidak ditemukan:', seedAdminPath);
  process.exit(1);
}

async function run() {
  let client;
  try {
    const { Client } = require('pg');
    client = new Client({ connectionString: databaseUrl });
    await client.connect();

    const baseSql = fs.readFileSync(basePath, 'utf8');
    await client.query(baseSql);
    console.log('OK: schema-base.sql (users, cases) selesai.');

    const webSql = fs.readFileSync(webPath, 'utf8');
    await client.query(webSql);
    console.log('OK: schema-web-tables.sql selesai.');

    const mobileSql = fs.readFileSync(mobilePath, 'utf8');
    await client.query(mobileSql);
    console.log('OK: schema-mobile-tables.sql selesai.');

    const seedAdminSql = fs.readFileSync(seedAdminPath, 'utf8');
    await client.query(seedAdminSql);
    console.log('OK: schema-seed-admin.sql (user admin@firm.com) selesai.');

    console.log('Migrasi selesai. DB siap deploy.');
  } catch (err) {
    console.error('ERROR:', err.message);
    if (err.message && (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) && databaseUrl.includes('railway')) {
      console.error('');
      console.error('Koneksi dari lokal ke Railway butuh URL PUBLIK. Di Railway: PostgreSQL → Connect → Public URL.');
    }
    process.exit(1);
  } finally {
    if (client) await client.end();
  }
}

run();
