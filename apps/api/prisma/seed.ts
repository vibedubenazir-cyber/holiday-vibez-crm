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

  await prisma.rateCard.createMany({
    data: [
      {
        type: 'HOTEL',
        destination: 'Bali',
        name: 'Ubud Resort - Deluxe Room',
        baseCost: 4500,
        taxPct: 12,
        currency: 'INR',
        source: 'MANUAL',
        createdBy: admin.id,
      },
      {
        type: 'ACTIVITY',
        destination: 'Bali',
        name: 'Ubud Rice Terrace & Temple Tour',
        baseCost: 1800,
        taxPct: 5,
        currency: 'INR',
        source: 'MANUAL',
        createdBy: admin.id,
      },
      {
        type: 'FLIGHT',
        destination: 'Bali',
        name: 'Mumbai - Denpasar Round Trip (Economy)',
        baseCost: 32000,
        taxPct: 8,
        currency: 'INR',
        source: 'MANUAL',
        createdBy: admin.id,
      },
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
