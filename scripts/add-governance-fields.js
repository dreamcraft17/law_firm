/**
 * Add new fields for Data Governance + Observability features:
 * - cases: archived_at, archived_by, archived_reason
 * - cron_run_logs: duration_ms, details
 * - NEW table: delete_requests
 *
 * From folder admin-web: npm run db:add-governance-fields
 */
const fs = require('fs');
const path = require('path');

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

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL tidak diset. Set di .env atau .env.local');
  process.exit(1);
}

async function runMigration() {
  let client;
  try {
    const { Client } = require('pg');
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
    console.log('Terhubung ke database.\n');

    // ── 1. cases: archived_at, archived_by, archived_reason ────────────────────
    const caseColsResult = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'cases'
      AND column_name IN ('archived_at', 'archived_by', 'archived_reason')
    `);
    const existingCaseCols = caseColsResult.rows.map(r => r.column_name);

    if (!existingCaseCols.includes('archived_at')) {
      await client.query(`ALTER TABLE "cases" ADD COLUMN "archived_at" TIMESTAMPTZ`);
      console.log('✅ cases.archived_at ditambahkan.');
    } else {
      console.log('   cases.archived_at sudah ada.');
    }
    if (!existingCaseCols.includes('archived_by')) {
      await client.query(`ALTER TABLE "cases" ADD COLUMN "archived_by" UUID`);
      console.log('✅ cases.archived_by ditambahkan.');
    } else {
      console.log('   cases.archived_by sudah ada.');
    }
    if (!existingCaseCols.includes('archived_reason')) {
      await client.query(`ALTER TABLE "cases" ADD COLUMN "archived_reason" VARCHAR(500)`);
      console.log('✅ cases.archived_reason ditambahkan.');
    } else {
      console.log('   cases.archived_reason sudah ada.');
    }

    // ── 2. cron_run_logs: duration_ms, details ─────────────────────────────────
    const cronColsResult = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'cron_run_logs'
      AND column_name IN ('duration_ms', 'details')
    `);
    const existingCronCols = cronColsResult.rows.map(r => r.column_name);

    // Check if cron_run_logs table exists at all
    const cronTableResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'cron_run_logs'
    `);

    if (cronTableResult.rows.length === 0) {
      console.log('   Tabel cron_run_logs belum ada, lewati.');
    } else {
      if (!existingCronCols.includes('duration_ms')) {
        await client.query(`ALTER TABLE "cron_run_logs" ADD COLUMN "duration_ms" INTEGER`);
        console.log('✅ cron_run_logs.duration_ms ditambahkan.');
      } else {
        console.log('   cron_run_logs.duration_ms sudah ada.');
      }
      if (!existingCronCols.includes('details')) {
        await client.query(`ALTER TABLE "cron_run_logs" ADD COLUMN "details" JSONB`);
        console.log('✅ cron_run_logs.details ditambahkan.');
      } else {
        console.log('   cron_run_logs.details sudah ada.');
      }
    }

    // ── 3. delete_requests (tabel baru) ────────────────────────────────────────
    const delTableResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'delete_requests'
    `);

    if (delTableResult.rows.length === 0) {
      await client.query(`
        CREATE TABLE "delete_requests" (
          "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
          "firm_id"      UUID,
          "entity_type"  VARCHAR(64)  NOT NULL,
          "entity_id"    VARCHAR(255) NOT NULL,
          "entity_title" TEXT,
          "reason"       TEXT,
          "status"       VARCHAR(32)  NOT NULL DEFAULT 'pending',
          "requested_by" UUID         NOT NULL,
          "requested_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
          "reviewed_by"  UUID,
          "reviewed_at"  TIMESTAMPTZ,
          "review_note"  TEXT,
          "executed_at"  TIMESTAMPTZ,
          CONSTRAINT "delete_requests_pkey" PRIMARY KEY ("id")
        )
      `);
      console.log('✅ Tabel delete_requests dibuat.');
    } else {
      console.log('   Tabel delete_requests sudah ada.');
    }

    console.log('\n🎉 Migration selesai! Fitur Data Governance siap digunakan.');
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  } finally {
    if (client) await client.end();
  }
}

runMigration();
