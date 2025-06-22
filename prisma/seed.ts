import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  // Use `upsert` to create or update, preventing duplicates.
  // This makes the script safe to run multiple times.

  // 1. Create Permissions
  // Action: what can you do? (create, read, update, delete)
  // Entity: what are you doing it to? (user, post, invoice)
  // Access: whose can you affect? (own, any)
  const permissions = [
    // User Permissions
    { action: 'create', entity: 'user', access: 'any' },
    { action: 'read', entity: 'user', access: 'any' },
    { action: 'update', entity: 'user', access: 'own' },
    { action: 'update', entity: 'user', access: 'any' },
    { action: 'delete', entity: 'user', access: 'any' },
    // Add any other models you have...
    // { action: 'create', entity: 'post', access: 'own' },
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

  // 2. Create Roles
  await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: 'The admin has all permissions' },
  });

  await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'The basic user has limited permissions',
    },
  });

  // 3. Connect Roles to Permissions
  // Admin gets all permissions
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
        // Add other basic user permissions here, e.g.:
        // { action: 'create', entity: 'post', access: 'own' },
      ],
    },
    select: { id: true },
  });
  await prisma.role.update({
    where: { name: 'user' },
    data: { permissions: { set: userPermissions } },
  });

  console.log('🌱 Database has been seeded');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
