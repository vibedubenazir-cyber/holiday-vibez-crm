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

  await prisma.template.createMany({
    data: [
      {
        channel: 'WHATSAPP',
        name: 'Booking Confirmation',
        body: 'Hi {{name}}, your Holiday Vibez booking for {{destination}} is confirmed! We will share your vouchers shortly.',
        createdBy: admin.id,
      },
      {
        channel: 'WHATSAPP',
        name: 'Follow Up',
        body: "Hi {{name}}, just checking in on your {{destination}} trip plans — happy to answer any questions!",
        createdBy: admin.id,
      },
      {
        channel: 'EMAIL',
        name: 'Booking Confirmation',
        subject: 'Your Holiday Vibez booking is confirmed',
        body: 'Dear {{name}},\n\nYour booking for {{destination}} is confirmed. Vouchers and invoice will follow shortly.\n\nWarm regards,\nHoliday Vibez',
        createdBy: admin.id,
      },
      {
        channel: 'EMAIL',
        name: 'Follow Up',
        subject: 'Following up on your trip enquiry',
        body: 'Dear {{name}},\n\nJust following up on your {{destination}} enquiry — let us know if you have any questions.\n\nWarm regards,\nHoliday Vibez',
        createdBy: admin.id,
      },
    ],
  });

  await prisma.cmsContent.createMany({
    data: [
      {
        type: 'BLOG',
        title: 'Top 5 Honeymoon Destinations for 2026',
        subtitle: 'Where romance meets adventure',
        body: 'From the beaches of Bali to the mountains of Switzerland, here are our top honeymoon picks for the year...',
        sortOrder: 1,
        publishedAt: new Date(),
        createdBy: admin.id,
      },
      {
        type: 'BLOG',
        title: 'Visa-Free Destinations for Indian Travelers',
        subtitle: 'Pack your bags, skip the paperwork',
        body: 'A roundup of destinations Indian passport holders can visit visa-free or with visa-on-arrival...',
        sortOrder: 2,
        publishedAt: new Date(),
        createdBy: admin.id,
      },
      {
        type: 'BANNER',
        title: 'Summer Sale — Bali Packages',
        subtitle: 'Up to 20% off, limited seats',
        linkUrl: '/packages/bali-bliss',
        sortOrder: 1,
        createdBy: admin.id,
      },
      {
        type: 'BANNER',
        title: 'Honeymoon Specials',
        subtitle: 'Curated romantic getaways',
        sortOrder: 2,
        createdBy: admin.id,
      },
      {
        type: 'DESTINATION',
        title: 'Bali, Indonesia',
        subtitle: 'Beaches, temples & rice terraces',
        sortOrder: 1,
        createdBy: admin.id,
      },
      {
        type: 'DESTINATION',
        title: 'Maldives',
        subtitle: 'Overwater villas & coral reefs',
        sortOrder: 2,
        createdBy: admin.id,
      },
      {
        type: 'TESTIMONIAL',
        title: 'Aisha & Rohan',
        body: 'Holiday Vibez planned our dream honeymoon down to the last detail. Could not have asked for more!',
        rating: 5,
        sortOrder: 1,
        createdBy: admin.id,
      },
      {
        type: 'TESTIMONIAL',
        title: 'Vikram S.',
        body: 'Smooth booking, great support, and an unforgettable Bali trip.',
        rating: 5,
        sortOrder: 2,
        createdBy: admin.id,
      },
    ],
  });

  await prisma.siteSetting.createMany({
    data: [
      { key: 'contact_email', value: 'hello@holidayvibez.com' },
      { key: 'contact_phone', value: '+91-98765-00000' },
      { key: 'instagram_url', value: 'https://instagram.com/holidayvibez' },
      // Consumed by the customer-facing quotation view (apps/web/src/app/quote/[id]) —
      // edit via /cms's Site Settings, same as the contact_* keys above.
      { key: 'company_name', value: 'Holiday Vibez Private Limited' },
      { key: 'company_address', value: '2nd Floor, Anandham Elite, MRTS Road, Velachery, Chennai, Tamil Nadu 600042' },
      { key: 'gst_number', value: '33AAICH2636Q1Z7' },
      // Empty by default — upload an image via /storage, then paste the returned URL
      // into this setting's value from /cms to put a logo on the quotation header.
      { key: 'company_logo_url', value: '' },
    ],
  });

  await prisma.currencyRate.createMany({
    data: [
      { code: 'USD', rateToInr: 83.2, source: 'API' },
      { code: 'EUR', rateToInr: 90.1, source: 'API' },
      { code: 'GBP', rateToInr: 105.4, source: 'API' },
      { code: 'AED', rateToInr: 22.65, source: 'API' },
      { code: 'SGD', rateToInr: 61.8, source: 'API' },
      { code: 'THB', rateToInr: 2.29, source: 'API' },
      { code: 'IDR', rateToInr: 0.0052, source: 'MANUAL' },
      { code: 'AUD', rateToInr: 54.3, source: 'MANUAL' },
      { code: 'NPR', rateToInr: 0.625, source: 'MANUAL' },
    ],
  });

  await prisma.customFieldDefinition.createMany({
    data: [
      { entityType: 'LEAD', label: 'Anniversary Trip?', fieldKey: 'anniversary_trip', fieldType: 'BOOLEAN', sortOrder: 1, createdBy: admin.id },
      { entityType: 'LEAD', label: 'Referred By', fieldKey: 'referred_by', fieldType: 'TEXT', sortOrder: 2, createdBy: admin.id },
      {
        entityType: 'LEAD',
        label: 'Trip Purpose',
        fieldKey: 'trip_purpose',
        fieldType: 'SELECT',
        options: ['Honeymoon', 'Family', 'Business', 'Solo'],
        sortOrder: 3,
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
