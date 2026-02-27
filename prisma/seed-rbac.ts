/**
 * Seed default roles and permissions for R0.1 RBAC.
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-rbac.ts
 * Or add to package.json: "prisma": { "seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed-rbac.ts" }
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: 'cases.view', description: 'Lihat perkara' },
  { key: 'cases.create', description: 'Buat perkara' },
  { key: 'cases.update', description: 'Edit perkara' },
  { key: 'cases.delete', description: 'Hapus perkara' },
  { key: 'cases.approve', description: 'Approve perkara' },
  { key: 'cases.export', description: 'Export perkara' },
  { key: 'tasks.view', description: 'Lihat task' },
  { key: 'tasks.create', description: 'Buat task' },
  { key: 'tasks.update', description: 'Edit task' },
  { key: 'tasks.delete', description: 'Hapus task' },
  { key: 'documents.view', description: 'Lihat dokumen' },
  { key: 'documents.create', description: 'Upload dokumen' },
  { key: 'documents.update', description: 'Edit dokumen' },
  { key: 'documents.delete', description: 'Hapus dokumen' },
  { key: 'billing.view', description: 'Lihat billing' },
  { key: 'billing.create', description: 'Buat invoice' },
  { key: 'billing.update', description: 'Edit invoice' },
  { key: 'billing.approve', description: 'Approve invoice' },
  { key: 'billing.pay', description: 'Tandai bayar' },
  { key: 'billing.export', description: 'Export billing' },
  { key: 'users.view', description: 'Lihat user' },
  { key: 'users.create', description: 'Tambah user' },
  { key: 'users.update', description: 'Edit user' },
  { key: 'users.delete', description: 'Hapus user' },
  { key: 'reports.view', description: 'Lihat laporan' },
  { key: 'reports.export', description: 'Export laporan' },
  { key: 'audit.view', description: 'Lihat audit log' },
  { key: 'audit.export', description: 'Export audit' },
  { key: 'settings.view', description: 'Lihat pengaturan' },
  { key: 'settings.update', description: 'Ubah pengaturan' },
  { key: 'roles.view', description: 'Lihat roles' },
  { key: 'roles.manage', description: 'Kelola roles & permissions' },
  { key: 'admin.see_all', description: 'Akses semua data (override row-level)' },
] as const;

async function main() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: p,
      update: { description: p.description },
    });
  }
  console.log(`Upserted ${PERMISSIONS.length} permissions`);

  const allPerms = await prisma.permission.findMany({ select: { id: true, key: true } });
  const allKeys = allPerms.map((x) => x.key);

  const defaultFirm = await prisma.firm.upsert({
    where: { slug: 'default' },
    create: { name: 'Default Firm', slug: 'default' },
    update: {},
  });
  const firmId = defaultFirm.id;

  const adminRole = await prisma.role.upsert({
    where: { firmId_name: { firmId, name: 'admin' } },
    create: { firmId, name: 'admin' },
    update: {},
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPerms.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
  });
  console.log('Role admin: all permissions');

  const lawyerPermKeys = allKeys.filter(
    (k) =>
      !k.startsWith('users.') &&
      !k.startsWith('roles.') &&
      k !== 'admin.see_all' &&
      (k.startsWith('cases.') || k.startsWith('tasks.') || k.startsWith('documents.') || k.startsWith('billing.') || k.startsWith('reports.view') || k.startsWith('audit.view'))
  );
  const lawyerRole = await prisma.role.upsert({
    where: { firmId_name: { firmId, name: 'lawyer' } },
    create: { firmId, name: 'lawyer' },
    update: {},
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: lawyerRole.id } });
  await prisma.rolePermission.createMany({
    data: lawyerPermKeys.flatMap((key) => {
      const p = allPerms.find((x) => x.key === key);
      return p ? [{ roleId: lawyerRole.id, permissionId: p.id }] : [];
    }),
  });
  console.log('Role lawyer:', lawyerPermKeys.length, 'permissions');

  const staffPermKeys = allKeys.filter(
    (k) =>
      k.startsWith('cases.') ||
      k.startsWith('tasks.') ||
      k.startsWith('documents.') ||
      k === 'billing.view' ||
      k === 'reports.view'
  );
  const staffRole = await prisma.role.upsert({
    where: { firmId_name: { firmId, name: 'staff' } },
    create: { firmId, name: 'staff' },
    update: {},
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: staffRole.id } });
  await prisma.rolePermission.createMany({
    data: staffPermKeys.flatMap((key) => {
      const p = allPerms.find((x) => x.key === key);
      return p ? [{ roleId: staffRole.id, permissionId: p.id }] : [];
    }),
  });
  console.log('Role staff:', staffPermKeys.length, 'permissions');

  const clientPermKeys = ['cases.view', 'documents.view', 'billing.view'].filter((k) => allKeys.includes(k));
  const clientRole = await prisma.role.upsert({
    where: { firmId_name: { firmId, name: 'client' } },
    create: { firmId, name: 'client' },
    update: {},
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: clientRole.id } });
  await prisma.rolePermission.createMany({
    data: clientPermKeys.flatMap((key) => {
      const p = allPerms.find((x) => x.key === key);
      return p ? [{ roleId: clientRole.id, permissionId: p.id }] : [];
    }),
  });
  console.log('Role client:', clientPermKeys.length, 'permissions');

  // Assign roleId to existing users by role name
  const roleByName = await prisma.role.findMany().then((rows) => Object.fromEntries(rows.map((r) => [r.name, r.id])));
  const users = await prisma.user.findMany({ where: { deletedAt: null, roleId: null }, select: { id: true, role: true } });
  for (const u of users) {
    const roleId = roleByName[u.role] ?? roleByName['staff'];
    if (roleId) await prisma.user.update({ where: { id: u.id }, data: { roleId } }).catch(() => {});
  }
  console.log('Synced roleId for', users.length, 'users');

  console.log('RBAC seed done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
