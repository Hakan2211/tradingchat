// prisma/adminSeed.ts
//
// Creates (or updates) a local admin user so you can log in without paying.
// Admins bypass the subscription check in `isUserAuthorized`, so no
// Subscription row is needed.
//
// Usage: npm run db:seed:admin
// Re-running is safe: it resets the password and re-connects the roles.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// =====================================================================
// ===> CONFIGURE YOUR ADMIN USER HERE (or via env vars)
// =====================================================================
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL || 'admin@yourapp.com';
const ADMIN_USERNAME = process.env.ADMIN_SEED_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'password123';
// =====================================================================

async function seed() {
  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SEED_PASSWORD) {
    throw new Error(
      'Refusing to seed an admin with the default password in production. Set ADMIN_SEED_PASSWORD.'
    );
  }

  console.log('🌱 Seeding admin user...');

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // Make sure the roles exist. `npm run db:seed` attaches the full permission
  // sets; these bare creates are just a fallback so this script never crashes
  // on an empty database.
  for (const name of ['admin', 'user']) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      roles: { connect: [{ name: 'admin' }, { name: 'user' }] },
      password: {
        upsert: {
          create: { hash: hashedPassword },
          update: { hash: hashedPassword },
        },
      },
    },
    create: {
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      name: 'App Admin',
      password: { create: { hash: hashedPassword } },
      roles: { connect: [{ name: 'admin' }, { name: 'user' }] },
    },
  });

  console.log(`✅ Admin user ready: ${adminUser.email}`);
  console.log(`   Login with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
