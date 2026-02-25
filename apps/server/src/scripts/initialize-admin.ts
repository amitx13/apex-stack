// apps/server/src/scripts/initialize-admin.ts

import { createAdminWallet } from '../services/wallet.service';
import { prisma } from '@repo/db';

/**
 * One-time script to initialize admin account
 * Run this ONCE before starting the application
 */
export async function initializeAdmin() {
  console.log('\n🔧 Initializing Admin Account...\n');

  // 1. Create or find admin user
  const adminPhone = process.env.ADMIN_PHONE || '9999999999';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1';

  let admin = await prisma.user.findUnique({
    where: { phone: adminPhone },
  });

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: 'System Admin',
        phone: adminPhone,
        code: 'ADMIN1',
        gasConsumerNumber: 'ADMIN_GAS_001',
        role: 'ADMIN',
        isActive: true,
        isRegistrationPayment: true,
        password: adminPassword,
      },
    });

    console.log(`✅ Admin user created: ${admin.name} (${admin.phone})`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${admin.name} (${admin.phone})`);
  }

  // 2. Create admin's UserAccount at position 0 (root)
  let adminAccount = await prisma.userAccount.findFirst({
    where: {
      userId: admin.id,
      matrixPosition: 0,
    },
  });

  if (!adminAccount) {
    adminAccount = await prisma.userAccount.create({
      data: {
        userId: admin.id,
        matrixPosition: 0,
        parentAccountId: null,
        entryType: 'REGISTRATION',
      },
    });

    console.log(`✅ Admin account created at position 0 (ROOT)`);
  } else {
    console.log(`ℹ️  Admin account already exists at position 0`);
  }

  // 3. Create admin's WITHDRAWAL wallet
  const adminWallet = await prisma.wallet.findUnique({
    where: {
      userId_type: {
        userId: admin.id,
        type: 'WITHDRAWAL',
      },
    },
  });

  if (!adminWallet) {
    await createAdminWallet(admin.id);
  } else {
    console.log(`ℹ️  Admin WITHDRAWAL wallet already exists`);
  }

  console.log('\n✅ Admin initialization complete!\n');
  console.log(`Admin Login Credentials:`);
  console.log(`  Phone: ${adminPhone}`);
  console.log(`  Password: ${adminPassword}`);
  console.log(`\n⚠️  Please change the password after first login!\n`);

  return admin;
}

// Run if called directly
if (require.main === module) {
  initializeAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error initializing admin:', error);
      process.exit(1);
    });
}
