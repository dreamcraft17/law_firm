/**
 * Jalankan DDL tabel web (docs/schema-web-tables.sql) ke PostgreSQL.
 * Butuh: DATABASE_URL di env atau di file .env / .env.local.
 * Tabel users & cases harus sudah ada.
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

const sqlPath = path.join(root, 'docs', 'schema-web-tables.sql');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL tidak diset.');
  console.error('Set di env, atau buat file .env / .env.local dengan isi:');
  console.error('  DATABASE_URL=postgresql://user:password@host:5432/railway');
  process.exit(1);
}

if (!fs.existsSync(sqlPath)) {
  console.error('ERROR: File tidak ditemukan:', sqlPath);
  process.exit(1);
}

async function run() {
  let client;
  try {
    const { Client } = require('pg');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query(sql);
    console.log('OK: Migrasi tabel web selesai (docs/schema-web-tables.sql).');
  } catch (err) {
    console.error('ERROR:', err.message);
    if (err.message && err.message.includes('does not exist')) {
      console.error('Pastikan tabel users dan cases sudah ada (migrasi inti dari backend).');
    }
    process.exit(1);
  } finally {
    if (client) await client.end();
  }
}

run();
