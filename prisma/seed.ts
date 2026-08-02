import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// These accounts hold the two roles that can act on other people's data, so the
// password cannot be a constant in a public repository. Locally it stays
// `admin123` to keep the existing workflow; in production the seed refuses to
// run without an explicit value rather than creating a known-password
// SUPER_ADMIN on a reachable host.
function adminPassword(variable: string): string {
  const value = process.env[variable];
  if (value) return value;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${variable} is not set. Refusing to seed a production database with a ` +
        `default admin password. Generate one with: ` +
        `node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"`
    );
  }

  return 'admin123';
}

async function main() {
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@app.com' },
    // Deliberately does not reset the password on an existing row — re-running
    // the seed after a deploy must not silently roll a rotated password back to
    // whatever the environment currently says.
    update: { role: 'SUPER_ADMIN' },
    create: {
      username: 'SuperAdmin',
      email: 'superadmin@app.com',
      password: await bcrypt.hash(adminPassword('SEED_SUPERADMIN_PASSWORD'), 10),
      role: 'SUPER_ADMIN',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@app.com' },
    update: { role: 'ADMIN' },
    create: {
      username: 'Admin',
      email: 'admin@app.com',
      password: await bcrypt.hash(adminPassword('SEED_ADMIN_PASSWORD'), 10),
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
