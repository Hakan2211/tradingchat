// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// =====================================================================
// ===> CONFIGURE YOUR ADMIN USER HERE
// =====================================================================
const ADMIN_EMAIL = 'admin@yourapp.com';
const ADMIN_USERNAME = 'admin';
// Use a strong password in a real .env file for production seeding
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'password123';
// =====================================================================

async function seed() {
  console.log('🌱 Starting database seed...');

  // 1. Clean up old data to ensure a fresh seed
  await prisma.user.delete({ where: { email: ADMIN_EMAIL } }).catch(() => {
    // Fails if user doesn't exist, which is fine.
  });
  // Note: You might want to clean up other tables like roles/permissions
  // if you change them often, but for now this is fine.

  // 2. Hash the admin password securely
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  console.log('🔑 Admin password hashed.');

  // 3. Create a 'user' role with basic permissions
  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Standard user with basic permissions',
      permissions: {
        create: [
          { action: 'update', entity: 'user', access: 'own' },
          { action: 'delete', entity: 'message', access: 'own' },
        ],
      },
    },
  });
  console.log(`✅ Upserted role: ${userRole.name}`);

  // 4. Create an 'admin' role with full permissions
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Admin with full access to the system',
      permissions: {
        create: [
          { action: 'update', entity: 'user', access: 'any' },
          { action: 'delete', entity: 'user', access: 'any' },
          { action: 'delete', entity: 'message', access: 'any' },
        ],
      },
    },
  });
  console.log(`✅ Upserted role: ${adminRole.name}`);

  // 5. Create the admin user and connect them to the 'admin' role
  const adminUser = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      name: 'App Admin',
      password: {
        create: {
          hash: hashedPassword,
        },
      },
      roles: {
        connect: [{ name: 'admin' }, { name: 'user' }], // Connect to both roles
      },
    },
  });
  console.log(`✅ Created admin user: ${adminUser.email}`);

  console.log('🌱 Database has been successfully seeded!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
