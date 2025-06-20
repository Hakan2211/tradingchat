import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Check if test user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        bio: 'This is a test user for development purposes.',
        password: {
          create: {
            hash: hashedPassword,
          },
        },
      },
    });

    console.log('Created test user:', user);
  } else {
    console.log('Test user already exists:', existingUser);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
