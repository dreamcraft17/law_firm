# Database Migration Instructions

## Issue
The database schema is missing the new fields (`case_number`, `description`) that were added to the Prisma schema. This causes errors when the application tries to query these columns.

## Solution
You need to run the database migration to add the missing columns.

### Option 1: Using Prisma Migrate (Recommended)
If you have access to the DATABASE_URL:

```bash
cd admin-web
npx prisma migrate dev --name add-case-fields
```

### Option 2: Manual SQL Migration
If you can't run Prisma migrate, run this SQL directly on your PostgreSQL database:

```sql
ALTER TABLE "cases" 
ADD COLUMN "case_number" VARCHAR(100),
ADD COLUMN "description" TEXT;
```

### Option 3: Using the Migration File
I've created a migration file at:
`prisma/migrations/001_add_case_fields/migration.sql`

You can apply this using:
```bash
psql YOUR_DATABASE_URL < prisma/migrations/001_add_case_fields/migration.sql
```

## After Migration
Once the migration is complete, you can update the code to use the new fields by:

1. Uncommenting the `caseNumber` and `description` fields in the mobile handler
2. Updating the web frontend to include the form fields for case number and description
3. Re-generating Prisma client: `npx prisma generate`

## Current Status
- ✅ Backend code updated to handle new fields (but currently disabled)
- ✅ Web frontend updated to support new fields (but currently simplified) 
- ✅ Build compiles successfully
- ⏳ Database migration needed to enable new fields
- ✅ Migration SQL file created and ready

## Fields Ready to Enable
- `case_number` (VARCHAR(100), optional)
- `description` (TEXT, optional)
- Status values: 'pending', 'aktif'
