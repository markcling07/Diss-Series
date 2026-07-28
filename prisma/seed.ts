import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const superAdminPassword = await bcrypt.hash('admin123', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@app.com' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      username: 'SuperAdmin',
      email: 'superadmin@app.com',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
    },
  });

  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@app.com' },
    update: { role: 'ADMIN' },
    create: {
      username: 'Admin',
      email: 'admin@app.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('Seeded users:');
  console.log('SuperAdmin:', superAdmin.email);
  console.log('Admin:', admin.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
