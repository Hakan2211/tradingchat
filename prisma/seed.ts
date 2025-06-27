import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding...');
  // 1. Create Permissions
  const permissions = [
    // User Permissions (from your original file)
    { action: 'create', entity: 'user', access: 'any' },
    { action: 'read', entity: 'user', access: 'any' },
    { action: 'update', entity: 'user', access: 'own' },
    { action: 'update', entity: 'user', access: 'any' },
    { action: 'delete', entity: 'user', access: 'own' },
    { action: 'delete', entity: 'user', access: 'any' },

    // --- ADD MESSAGE PERMISSIONS ---
    { action: 'delete', entity: 'message', access: 'own' },
    { action: 'delete', entity: 'message', access: 'any' },
    // We'll add edit permissions now to be ready for the next step
    { action: 'update', entity: 'message', access: 'own' },
    { action: 'update', entity: 'message', access: 'any' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        action_entity_access: {
          action: permission.action,
          entity: permission.entity,
          access: permission.access,
        },
      },
      update: {},
      create: permission,
    });
  }

  // 2. Create Roles (no changes needed)
  await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });
  await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: { name: 'user' },
  });

  // 3. Connect Roles to Permissions
  // Admin gets all permissions (your existing code handles this perfectly)
  const allPermissions = await prisma.permission.findMany({
    select: { id: true },
  });
  await prisma.role.update({
    where: { name: 'admin' },
    data: { permissions: { set: allPermissions } },
  });

  // User gets specific, limited permissions
  const userPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { action: 'update', entity: 'user', access: 'own' },
        // --- GRANT USER THE "OWN" MESSAGE PERMISSIONS ---
        { action: 'delete', entity: 'message', access: 'own' },
        { action: 'update', entity: 'message', access: 'own' },
      ],
    },
    select: { id: true },
  });
  await prisma.role.update({
    where: { name: 'user' },
    data: { permissions: { set: userPermissions } },
  });

  console.log('✅ Database has been seeded');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
