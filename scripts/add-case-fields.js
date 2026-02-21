/**
 * Add new fields to cases table: case_number and description
 * This script adds the missing columns that were added to Prisma schema
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Load .env atau .env.local
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
  console.error('Copy .env.example ke .env.local dan isi DATABASE_URL yang benar.');
  process.exit(1);
}

async function runMigration() {
  let client;
  try {
    const { Client } = require('pg');
    client = new Client({ connectionString: databaseUrl });
    await client.connect();

    // Check if columns already exist
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' 
      AND column_name IN ('case_number', 'description')
    `);
    
    const existingColumns = checkResult.rows.map(row => row.column_name);
    
    if (existingColumns.includes('case_number') && existingColumns.includes('description')) {
      console.log('✅ Kolom case_number dan description sudah ada.');
      return;
    }

    // Add missing columns
    if (!existingColumns.includes('case_number')) {
      await client.query(`ALTER TABLE "cases" ADD COLUMN "case_number" VARCHAR(100)`);
      console.log('✅ Kolom case_number ditambahkan.');
    }

    if (!existingColumns.includes('description')) {
      await client.query(`ALTER TABLE "cases" ADD COLUMN "description" TEXT`);
      console.log('✅ Kolom description ditambahkan.');
    }

    console.log('🎉 Migration selesai! Database sekarang support case_number dan description.');
    
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  } finally {
    if (client) await client.end();
  }
}

runMigration();
