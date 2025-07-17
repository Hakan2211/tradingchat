// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding...');
  console.time('DB has been seeded');

  // 1. Create Permissions (no changes needed here, your existing permissions are good)
  const permissions = [
    { action: 'create', entity: 'user', access: 'any' },
    { action: 'read', entity: 'user', access: 'any' },
    { action: 'update', entity: 'user', access: 'own' },
    { action: 'update', entity: 'user', access: 'any' },
    { action: 'delete', entity: 'user', access: 'own' },
    { action: 'delete', entity: 'user', access: 'any' },
    { action: 'delete', entity: 'message', access: 'own' },
    { action: 'delete', entity: 'message', access: 'any' },
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
  console.log('✅ Permissions seeded');

  // 2. Create Roles
  await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });
  // --- ADD THE MODERATOR ROLE ---
  await prisma.role.upsert({
    where: { name: 'moderator' },
    update: {},
    create: { name: 'moderator' },
  });
  await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: { name: 'user' },
  });
  console.log('✅ Roles seeded');

  // 3. Connect Roles to Permissions
  const allPermissions = await prisma.permission.findMany({
    select: { id: true },
  });
  await prisma.role.update({
    where: { name: 'admin' },
    data: { permissions: { set: allPermissions } },
  });

  // --- SET PERMISSIONS FOR THE NEW MODERATOR ROLE ---
  const moderatorPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { action: 'update', entity: 'user', access: 'own' }, // Can edit their own profile
        { action: 'delete', entity: 'message', access: 'any' }, // Can delete ANY message
        { action: 'update', entity: 'message', access: 'any' }, // Can edit ANY message
      ],
    },
    select: { id: true },
  });
  await prisma.role.update({
    where: { name: 'moderator' },
    data: { permissions: { set: moderatorPermissions } },
  });

  // --- SET PERMISSIONS FOR THE USER ROLE ---
  const userPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { action: 'update', entity: 'user', access: 'own' },
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

  console.log('✅ Roles connected to permissions');

  console.log('🌱 Seeding default rooms...');
  const defaultRooms = [
    { name: 'Main', icon: 'MessageCircleMore' },
    { name: 'Watchlist', icon: 'Eye' },
    { name: 'Announcements', icon: 'Megaphone' },
    { name: 'Introductions', icon: 'Handshake' },
    { name: 'Support', icon: 'CircleHelp' },
  ];

  for (const room of defaultRooms) {
    await prisma.room.upsert({
      where: { name: room.name }, // Use the unique name to find the room
      update: {}, // Don't update it if it already exists
      create: {
        // Create it if it doesn't exist
        name: room.name,
        icon: room.icon,
      },
    });
  }
  console.log('✅ Default rooms seeded');

  console.timeEnd('DB has been seeded');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
