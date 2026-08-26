import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The "Common Indian set". Dates for the 2026 cycle — the movable festivals
// (Holi, Eid, Raksha Bandhan, Diwali) shift each year by the lunar calendar,
// so staff edit these to the correct date annually from the Occasions screen.
// {{name}} interpolates to the client's name at send time.
const OCCASIONS: { name: string; month: number; day: number; messageBody: string }[] = [
  {
    name: 'New Year',
    month: 1,
    day: 1,
    messageBody:
      '🎊 Happy New Year, {{name}}! Thank you for travelling with Holiday Vibez. May this year take you to wonderful new places — we can’t wait to help you plan them. ✈️',
  },
  {
    name: 'Holi',
    month: 3,
    day: 3,
    messageBody:
      '🌸 Happy Holi, {{name}}! Wishing you a year as colourful as your journeys. From all of us at Holiday Vibez — celebrate joyfully! 🎨',
  },
  {
    name: 'Eid',
    month: 3,
    day: 20,
    messageBody:
      '🌙 Eid Mubarak, {{name}}! Warm wishes from the Holiday Vibez family. May your celebrations be filled with joy — and your year with memorable travels. ✨',
  },
  {
    name: 'Independence Day',
    month: 8,
    day: 15,
    messageBody:
      '🇮🇳 Happy Independence Day, {{name}}! Celebrate the spirit of freedom — perhaps with a getaway. Holiday Vibez is here whenever you’re ready to explore. ✈️',
  },
  {
    name: 'Raksha Bandhan',
    month: 8,
    day: 28,
    messageBody:
      '🎀 Happy Raksha Bandhan, {{name}}! Wishing you and your family togetherness and joy. A trip together makes the bond even sweeter — we’d love to help. ✈️',
  },
  {
    name: 'Diwali',
    month: 11,
    day: 8,
    messageBody:
      '🪔 Happy Diwali, {{name}}! May this festival of lights bring you happiness and prosperity. From everyone at Holiday Vibez — here’s to bright new journeys ahead. ✨',
  },
  {
    name: 'Christmas',
    month: 12,
    day: 25,
    messageBody:
      '🎄 Merry Christmas, {{name}}! Warm wishes from the Holiday Vibez family. May your holidays be joyful — and your next adventure just around the corner. ✈️',
  },
];

async function main() {
  let created = 0;
  for (const o of OCCASIONS) {
    const existing = await prisma.marketingOccasion.findFirst({ where: { name: o.name } });
    if (existing) continue;
    await prisma.marketingOccasion.create({
      data: { name: o.name, month: o.month, day: o.day, messageBody: o.messageBody, active: true, createdBy: 'seed' },
    });
    created++;
  }
  console.log(`Marketing occasions seeded: ${created} created, ${OCCASIONS.length - created} already present.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
