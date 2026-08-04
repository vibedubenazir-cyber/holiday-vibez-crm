import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BRANCH_NAMES = [
  { name: 'Mumbai', city: 'Mumbai' },
  { name: 'Delhi', city: 'Delhi' },
  { name: 'Bengaluru', city: 'Bengaluru' },
  { name: 'Pune', city: 'Pune' },
  { name: 'Ahmedabad', city: 'Ahmedabad' },
];

const DEFAULT_PASSWORD = 'Password@123';

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const director = await prisma.user.create({
    data: {
      name: 'Holiday Vibez Director',
      email: 'director@holidayvibez.com',
      phone: '9000000001',
      passwordHash,
      role: Role.DIRECTOR,
      status: 'ACTIVE',
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@holidayvibez.com',
      phone: '9000000002',
      passwordHash,
      role: Role.ADMIN,
      status: 'ACTIVE',
    },
  });

  let phoneCounter = 9000001000;

  for (const b of BRANCH_NAMES) {
    const branch = await prisma.branch.create({
      data: {
        name: b.name,
        city: b.city,
        monthlyTarget: 2500000,
        quarterlyTarget: 7500000,
      },
    });

    const manager = await prisma.user.create({
      data: {
        name: `${b.name} Branch Manager`,
        email: `manager.${b.name.toLowerCase()}@holidayvibez.com`,
        phone: String(phoneCounter++),
        passwordHash,
        role: Role.BRANCH_MANAGER,
        branchId: branch.id,
        status: 'ACTIVE',
      },
    });

    await prisma.branch.update({
      where: { id: branch.id },
      data: { managerId: manager.id },
    });

    for (let i = 1; i <= 2; i++) {
      await prisma.user.create({
        data: {
          name: `${b.name} Consultant ${i}`,
          email: `consultant${i}.${b.name.toLowerCase()}@holidayvibez.com`,
          phone: String(phoneCounter++),
          passwordHash,
          role: Role.TRAVEL_CONSULTANT,
          branchId: branch.id,
          status: 'ACTIVE',
        },
      });
    }
  }

  const baliDmc = await prisma.supplier.create({
    data: {
      name: 'Bali Sunrise DMC',
      type: 'DMC',
      contactName: 'Wayan Surya',
      phone: '+62-812-3456-7890',
      email: 'ops@balisunrisedmc.example',
      destination: 'Bali',
      paymentTerms: 'Net 15',
    },
  });

  await prisma.supplier.create({
    data: {
      name: 'SkyLink Flight Consolidator',
      type: 'FLIGHT',
      contactName: 'Ramesh Iyer',
      phone: '+91-98765-43210',
      email: 'bookings@skylink.example',
      paymentTerms: 'Prepaid',
    },
  });

  const hotelRate = await prisma.rateCard.create({
    data: {
      type: 'HOTEL',
      destination: 'Bali',
      name: 'Ubud Resort - Deluxe Room',
      baseCost: 4500,
      taxPct: 12,
      currency: 'INR',
      source: 'MANUAL',
      createdBy: admin.id,
      supplierId: baliDmc.id,
    },
  });

  const activityRate = await prisma.rateCard.create({
    data: {
      type: 'ACTIVITY',
      destination: 'Bali',
      name: 'Ubud Rice Terrace & Temple Tour',
      baseCost: 1800,
      taxPct: 5,
      currency: 'INR',
      source: 'MANUAL',
      createdBy: admin.id,
      supplierId: baliDmc.id,
    },
  });

  const flightRate = await prisma.rateCard.create({
    data: {
      type: 'FLIGHT',
      destination: 'Bali',
      name: 'Mumbai - Denpasar Round Trip (Economy)',
      baseCost: 32000,
      taxPct: 8,
      currency: 'INR',
      source: 'MANUAL',
      createdBy: admin.id,
    },
  });

  const baliPackage = await prisma.package.create({
    data: {
      name: 'Bali Bliss — 4N/5D',
      destination: 'Bali',
      theme: 'Honeymoon',
      durationDays: 5,
      basePrice: 45000,
      currency: 'INR',
      createdBy: admin.id,
    },
  });

  await prisma.packageItem.createMany({
    data: [
      { packageId: baliPackage.id, rateCardId: flightRate.id, dayNumber: 1, description: 'Round-trip flight to Denpasar', quantity: 2 },
      { packageId: baliPackage.id, rateCardId: hotelRate.id, dayNumber: 1, description: '4 nights at Ubud Resort', quantity: 4 },
      { packageId: baliPackage.id, rateCardId: activityRate.id, dayNumber: 2, description: 'Rice terrace & temple day tour', quantity: 2 },
    ],
  });

  console.log('Seed complete.');
  console.log(`Director:   director@holidayvibez.com / ${DEFAULT_PASSWORD}`);
  console.log(`Admin:      admin@holidayvibez.com / ${DEFAULT_PASSWORD}`);
  console.log(`Managers/Consultants: manager.<branch>@holidayvibez.com, consultant1.<branch>@holidayvibez.com etc, same password.`);
  console.log(`Branches: ${BRANCH_NAMES.map((b) => b.name).join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
