// Destination training content for travel consultants — one course per
// market, each with lessons covering attractions/costs/practical tips and a
// 5-question exam. Shared between prisma/seed.ts (fresh-DB path) and
// prisma/seed-lms-destinations.ts (idempotent script for an already-seeded DB).

export interface DestinationCourseSeed {
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  lessons: { title: string; content: string }[];
  quiz: { text: string; options: string[]; correctIndex: number }[];
}

export const DESTINATION_COURSES: DestinationCourseSeed[] = [
  {
    title: 'Selling Dubai & the UAE',
    category: 'Dubai & UAE',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Burj_Khalifa_%28worlds_tallest_building%29_and_the_Dubai_skyline_%2825781049892%29.jpg/960px-Burj_Khalifa_%28worlds_tallest_building%29_and_the_Dubai_skyline_%2825781049892%29.jpg',
    description:
      "Everything a consultant needs to sell Dubai & the UAE — desert safaris, luxury shopping, and the region's best short-haul appeal for Indian travelers.",
    lessons: [
      {
        title: 'Overview & Best Time to Visit',
        content:
          'Dubai is the UAE\'s most-visited emirate; Abu Dhabi is the capital. Best season: November–March (25–32°C) — avoid June–August (peak heat, 45°C+). Visa: visa-on-arrival for many Indian passport holders with a valid US/UK/Schengen visa or green card; otherwise a UAE e-visa is needed in advance (3–5 working days). Currency: UAE Dirham (AED), roughly ₹1 ≈ AED 0.044. Flight time from India: ~3.5 hours from Mumbai/Delhi.',
      },
      {
        title: 'Top Tourist Attractions',
        content:
          'Burj Khalifa (At the Top observation deck), Dubai Mall & Dubai Fountain, Desert Safari with dune bashing and a BBQ dinner, Palm Jumeirah & Atlantis Aquaventure, Dubai Marina & JBR Beach, an Abu Dhabi day trip (Sheikh Zayed Grand Mosque, Ferrari World), and Global Village (seasonal, Nov–April).',
      },
      {
        title: 'Flights & Indicative Costs',
        content:
          'Mumbai–Dubai round trip: ₹14,000–₹22,000. Delhi–Dubai: ₹16,000–₹24,000. Bengaluru–Dubai: ₹15,000–₹23,000. A 4-night package with a 3-star hotel, desert safari, and city tour runs ₹35,000–₹45,000 per person; a 5-star package with Burj Khalifa entry and an Abu Dhabi day trip runs ₹65,000–₹85,000. Prices spike 40–60% during Dec 20–Jan 5 and Global Village season.',
      },
      {
        title: 'Practical Tips for Consultants',
        content:
          'Alcohol is only served in licensed hotels/restaurants, not in public. Modest dress is expected at malls and religious/government sites. Friday is a partial holiday. Dubai is a strong "quick international" upsell for first-time flyers. Ramadan dates shift yearly and restrict public dining hours during that period.',
      },
    ],
    quiz: [
      { text: 'What is the peak/best season to visit Dubai?', options: ['June–August', 'November–March', 'All year, no difference', 'Only during Ramadan'], correctIndex: 1 },
      { text: 'Which observation deck is inside the Burj Khalifa?', options: ['Sky View', 'At the Top', 'Cloud Nine', 'Summit Deck'], correctIndex: 1 },
      { text: 'Approximate one-way flight time from Mumbai to Dubai?', options: ['~1.5 hours', '~3.5 hours', '~7 hours', '~10 hours'], correctIndex: 1 },
      { text: 'Where can visitors legally consume alcohol in Dubai?', options: ['Anywhere in public', 'Licensed hotels/restaurants only', 'Only at the airport', 'It is fully banned'], correctIndex: 1 },
      { text: 'What seasonal event runs roughly Nov–April in Dubai?', options: ['Global Village', 'Songkran', 'Oktoberfest', 'Diwali Mela'], correctIndex: 0 },
    ],
  },
  {
    title: 'Selling Thailand',
    category: 'Thailand',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/KohPhiPhi.JPG/960px-KohPhiPhi.JPG',
    description:
      "Thailand's mix of beaches, temples, and budget-friendly packages makes it one of the agency's top sellers — covers Bangkok, Pattaya, Phuket, and Krabi.",
    lessons: [
      {
        title: 'Overview & Best Time to Visit',
        content:
          'Best season: November–February (cool, dry) — avoid the monsoon June–October on the Andaman coast. Visa: Indian passport holders are visa-exempt for stays up to 30 days. Currency: Thai Baht (THB), roughly ₹1 ≈ THB 0.40. Flight time from India: ~4 hours direct to Bangkok/Phuket from major metros.',
      },
      {
        title: 'Top Tourist Attractions',
        content:
          'Bangkok: Grand Palace, Wat Arun, Chatuchak Market, rooftop bars. Pattaya: Coral Island, the Alcazar cabaret show, Nong Nooch Garden. Phuket: Patong Beach, a Phi Phi Islands day trip, the Big Buddha. Krabi: Railay Beach, the Four Islands tour, Emerald Pool. Chiang Mai in the north (growing demand): elephant sanctuaries and temples.',
      },
      {
        title: 'Flights & Indicative Costs',
        content:
          'Mumbai/Delhi–Bangkok round trip: ₹18,000–₹28,000. Chennai/Bengaluru–Bangkok: ₹16,000–₹24,000. A 5N/6D Pattaya + Bangkok 3-star package runs ₹32,000–₹42,000; a 6N/7D Phuket + Krabi 4-star package with island hopping runs ₹55,000–₹70,000. Add-ons: Alcazar show ₹1,500, Coral Island trip ₹2,000, Phi Phi day tour ₹3,500.',
      },
      {
        title: 'Practical Tips for Consultants',
        content:
          'Thailand is the go-to budget beach + nightlife combo for both first-timers and honeymooners — segment the pitch accordingly. Tipping is customary but not mandatory (10% at restaurants is generous). Songkran (Thai New Year, mid-April) causes major price surges — sell early. Domestic flights (Bangkok–Phuket/Krabi) are often cheaper than long transfers.',
      },
    ],
    quiz: [
      { text: 'Are Indian passport holders visa-exempt for short stays in Thailand?', options: ['No, always need a visa', 'Yes, up to 30 days', 'Only for Bangkok', 'Only with a group tour'], correctIndex: 1 },
      { text: 'Which city is known for the Grand Palace and Wat Arun?', options: ['Phuket', 'Bangkok', 'Krabi', 'Chiang Mai'], correctIndex: 1 },
      { text: 'Which islands are typically visited as a day trip from Phuket?', options: ['Phi Phi Islands', 'Nusa Penida', 'Langkawi', 'Boracay'], correctIndex: 0 },
      { text: 'What is the best season to visit Thailand?', options: ['June–October', 'November–February', 'Only April', 'No seasonal difference'], correctIndex: 1 },
      { text: 'What festival in mid-April causes major price surges in Thailand?', options: ['Diwali', 'Songkran', 'Loi Krathong', 'Chinese New Year'], correctIndex: 1 },
    ],
  },
  {
    title: 'Selling Singapore',
    category: 'Singapore',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Marina_Bay_Sands_%28I%29.jpg/960px-Marina_Bay_Sands_%28I%29.jpg',
    description:
      'A premium, family-friendly, ultra-safe short-haul destination — strong for corporate travelers and families wanting a hassle-free trip.',
    lessons: [
      {
        title: 'Overview & Best Time to Visit',
        content:
          'Singapore is a year-round destination (tropical climate, no strong "bad season"); Dec–Jun is marginally drier. Visa: an e-Visa is required for Indian passport holders, typically processed in 3–5 working days. Currency: Singapore Dollar (SGD), roughly ₹1 ≈ SGD 0.016. Flight time from India: ~5.5 hours direct from major metros.',
      },
      {
        title: 'Top Tourist Attractions',
        content:
          'Marina Bay Sands SkyPark & infinity pool (pool is guests-only). Gardens by the Bay (Supertree Grove, Cloud Forest, Flower Dome). Universal Studios Singapore and S.E.A. Aquarium on Sentosa Island. Singapore Zoo & Night Safari. Merlion Park and Clarke Quay for riverside dining and nightlife.',
      },
      {
        title: 'Flights & Indicative Costs',
        content:
          'Mumbai/Delhi–Singapore round trip: ₹22,000–₹32,000. Chennai/Bengaluru–Singapore: ₹18,000–₹26,000. A 4N/5D 3-star package covering the city and Sentosa runs ₹48,000–₹58,000; a 4-star package adding Universal Studios and Night Safari runs ₹65,000–₹80,000. A Universal Studios Singapore ticket costs roughly ₹4,500 per person.',
      },
      {
        title: 'Practical Tips for Consultants',
        content:
          'Singapore is strict on littering, chewing-gum import, and jaywalking fines — mention this to clients as a "very clean, very safe" selling point. It combines well with Malaysia (Kuala Lumpur, Genting) for longer itineraries. English is widely spoken, so there is no language barrier. GST (9%) applies to most purchases, and a tourist refund scheme exists at the airport.',
      },
    ],
    quiz: [
      { text: 'Which iconic garden attraction features the Supertree Grove?', options: ['Sentosa Island', 'Gardens by the Bay', 'Marina Bay Sands', 'Clarke Quay'], correctIndex: 1 },
      { text: 'What theme park is located on Sentosa Island?', options: ['Universal Studios Singapore', 'Disneyland', 'Legoland', 'Ocean Park'], correctIndex: 0 },
      { text: 'Do Indian passport holders need a visa for Singapore?', options: ['No visa needed', 'Yes, an e-Visa', 'Visa-on-arrival only', 'Only for stays over 90 days'], correctIndex: 1 },
      { text: 'Which two countries are commonly combined into one package with Singapore?', options: ['Singapore + Thailand', 'Singapore + Malaysia', 'Singapore + Vietnam', 'Singapore + Indonesia'], correctIndex: 1 },
      { text: 'What is famously banned from import into Singapore?', options: ['Chewing gum', 'Chocolate', 'Bottled water', 'Sunscreen'], correctIndex: 0 },
    ],
  },
  {
    title: 'Selling Bali & Indonesia',
    category: 'Bali & Indonesia',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Pura_Luhur_Uluwatu_2017-08-17_%2834%29.jpg/960px-Pura_Luhur_Uluwatu_2017-08-17_%2834%29.jpg',
    description:
      "Bali's blend of beaches, culture, and honeymoon appeal makes it a fast-growing seller — covers Kuta, Seminyak, Ubud, and Nusa Penida.",
    lessons: [
      {
        title: 'Overview & Best Time to Visit',
        content:
          'Dry season (best): April–October. Wet season: November–March — still visitable, with short afternoon showers. Visa: visa-on-arrival for Indian passport holders (about USD 35, valid 30 days, extendable once). Currency: Indonesian Rupiah (IDR) has very high denominations — brief clients on this (roughly IDR 1,000,000 ≈ ₹5,200). Flight time from India: no direct flights from most Indian cities — typically one stop via Singapore/Kuala Lumpur/Jakarta, ~9–11 hours total.',
      },
      {
        title: 'Top Tourist Attractions',
        content:
          'Uluwatu Temple and the sunset Kecak Fire Dance. Ubud: Tegalalang Rice Terrace, Monkey Forest, Ubud Palace. Tanah Lot Temple. A Nusa Penida day trip covering Kelingking Beach and Angel\'s Billabong. Seminyak and Kuta beaches and beach clubs. Mount Batur sunrise trek for adventure-focused clients.',
      },
      {
        title: 'Flights & Indicative Costs',
        content:
          'Mumbai/Delhi–Bali (via Singapore/KL) round trip: ₹28,000–₹40,000. Bengaluru/Chennai–Bali: ₹26,000–₹38,000. A 5N/6D 3-star package covering Kuta + Ubud runs ₹45,000–₹58,000; a 6N/7D 4-star package adding Seminyak + Nusa Penida runs ₹70,000–₹90,000. A Nusa Penida day tour (private car + boat) costs roughly ₹4,000 per person.',
      },
      {
        title: 'Practical Tips for Consultants',
        content:
          'Bali is Hindu-majority, unlike the rest of Muslim-majority Indonesia — a strong emotional/cultural talking point for Indian clients. There are no direct flights, so always quote connecting itineraries and flag layover time clearly. Bali has a strong honeymoon and destination-wedding market; villas with private pools are a common premium upsell. The Rupiah\'s high denominations confuse first-time travelers — advise carrying a currency conversion card/app.',
      },
    ],
    quiz: [
      { text: "What is Bali's dry (best) season?", options: ['November–March', 'April–October', 'Only December', 'No dry season'], correctIndex: 1 },
      { text: 'Which temple is famous for its sunset Kecak Fire Dance?', options: ['Tanah Lot Temple', 'Uluwatu Temple', 'Ubud Palace', 'Borobudur'], correctIndex: 1 },
      { text: 'Do Indian travelers get visa-on-arrival in Bali?', options: ['No, e-Visa only in advance', 'Yes', 'No visa needed at all', 'Only for business travel'], correctIndex: 1 },
      { text: 'Is Bali predominantly Hindu or Muslim?', options: ['Hindu-majority', 'Muslim-majority', 'Buddhist-majority', 'Christian-majority'], correctIndex: 0 },
      { text: 'Do any Indian cities have direct flights to Bali?', options: ['Yes, from Mumbai and Delhi', 'No, connecting flights only', 'Yes, from all metros', 'Only seasonal charters'], correctIndex: 1 },
    ],
  },
  {
    title: 'Selling Vietnam',
    category: 'Vietnam',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Ha_Long_Bay_in_2019.jpg/960px-Ha_Long_Bay_in_2019.jpg',
    description:
      'An emerging, high-value destination for Indian travelers — covers Hanoi, Ha Long Bay, Da Nang/Hoi An, and Ho Chi Minh City.',
    lessons: [
      {
        title: 'Overview & Best Time to Visit',
        content:
          'Best time: the north (Hanoi/Ha Long) is best Oct–Apr (cool/dry); the south (Ho Chi Minh) is best Dec–Apr (dry season). Vietnam spans multiple climate zones — always ask which cities the client is visiting before advising dates. Visa: an e-Visa is required for Indian passport holders, valid up to 90 days, processed in 3 working days. Currency: Vietnamese Dong (VND), very high denominations (roughly ₹1 ≈ VND 290). Flight time from India: ~5–6 hours, often via Bangkok/Singapore/KL, though some seasonal direct charters exist from Delhi/Mumbai.',
      },
      {
        title: 'Top Tourist Attractions',
        content:
          'Ha Long Bay overnight cruise, a UNESCO World Heritage site of limestone karsts. Hanoi Old Quarter, Hoan Kiem Lake, and the water puppet show. Hoi An Ancient Town, known for its lantern festival and tailor shops. Da Nang: the Golden Bridge at Ba Na Hills, My Khe Beach. Ho Chi Minh City: the War Remnants Museum, Cu Chi Tunnels, Ben Thanh Market.',
      },
      {
        title: 'Flights & Indicative Costs',
        content:
          'Mumbai/Delhi–Hanoi/Ho Chi Minh round trip: ₹24,000–₹35,000. A 5N/6D Hanoi + Ha Long Bay cruise 3-star package runs ₹48,000–₹60,000; a 6N/7D Da Nang + Hoi An + Ho Chi Minh 4-star package runs ₹65,000–₹82,000. A Ha Long Bay overnight cruise add-on costs roughly ₹6,000–₹9,000 per person.',
      },
      {
        title: 'Practical Tips for Consultants',
        content:
          'Vietnam is priced noticeably lower than Thailand/Bali for similar quality — a good pitch for value-conscious clients wanting "something different." The Cu Chi Tunnels and War Remnants Museum are historically heavy — flag this for clients traveling with young children. Ba Na Hills\' Golden Bridge is one of the most photographed spots in Southeast Asia right now — a strong pull for younger, social-media-active travelers. Always confirm north vs. south itinerary before quoting weather or dates.',
      },
    ],
    quiz: [
      { text: 'Which UNESCO site near Hanoi is famous for limestone karst cruises?', options: ['Ha Long Bay', 'Hoi An', 'Cu Chi Tunnels', 'Mekong Delta'], correctIndex: 0 },
      { text: 'What structure at Ba Na Hills (Da Nang) is a major photo attraction?', options: ['The Golden Bridge', 'The Glass Bridge', 'The Dragon Bridge', 'The Rainbow Bridge'], correctIndex: 0 },
      { text: 'How long is a Vietnam e-Visa typically valid for?', options: ['Up to 15 days', 'Up to 30 days', 'Up to 90 days', 'Up to 1 year'], correctIndex: 2 },
      { text: 'Which ancient town is known for lantern festivals and tailor shops?', options: ['Hoi An', 'Hue', 'Da Nang', 'Nha Trang'], correctIndex: 0 },
      { text: 'Is Vietnam generally priced higher or lower than Thailand/Bali?', options: ['Higher', 'Lower', 'Exactly the same', 'Not comparable'], correctIndex: 1 },
    ],
  },
  {
    title: 'Selling Europe (Multi-Country Highlights)',
    category: 'Europe',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Sphinx_et_Jungfrau_-_img_06980.jpg/960px-Sphinx_et_Jungfrau_-_img_06980.jpg',
    description:
      'Covers the classic Indian-traveler European circuit — France, Switzerland, and Italy — plus the Schengen visa fundamentals every consultant must know cold.',
    lessons: [
      {
        title: 'Overview & Best Time to Visit',
        content:
          'Best time: April–June and September–October (mild weather, fewer crowds). July–August is peak season — hot, crowded, and the most expensive. Visa: a Schengen visa is required, applied for through the country of primary entry or longest stay; processing typically takes 15 working days, so book 4–6 weeks ahead. Currency: Euro (EUR) for most of the circuit; Swiss Franc (CHF) in Switzerland, which is not in the Eurozone. Flight time from India: ~8–9 hours direct to major hubs (Paris, Zurich, Frankfurt) from Delhi/Mumbai.',
      },
      {
        title: 'Top Tourist Attractions',
        content:
          'Paris: the Eiffel Tower, the Louvre Museum, a Seine river cruise, Disneyland Paris. Switzerland: Jungfraujoch ("Top of Europe"), Mount Titlis, Lucerne, Interlaken. Italy: the Colosseum and Vatican City in Rome, a Venice gondola ride, the Leaning Tower of Pisa. Optional add-ons: Amsterdam canals, the Austrian Alps around Innsbruck.',
      },
      {
        title: 'Flights & Indicative Costs',
        content:
          'Mumbai/Delhi–Paris/Zurich round trip: ₹45,000–₹65,000, varying heavily by season. An 8N/9D France + Switzerland + Italy coach tour on a 3-star basis runs ₹1,40,000–₹1,80,000 per person; a 10N/11D 4-star version with more free time runs ₹1,90,000–₹2,40,000. The Jungfraujoch train excursion costs roughly ₹9,000–₹11,000 per person, and the Schengen visa fee is around ₹7,000 including service charges.',
      },
      {
        title: 'Practical Tips for Consultants',
        content:
          'Always confirm the Schengen "country of first entry" or "longest stay" rule when advising which embassy to apply through. Peak summer (Jul–Aug) pricing can be 50–80% higher than shoulder season — push April–June or September bookings for budget-conscious clients. Switzerland uses the Swiss Franc, not the Euro — brief clients so they don\'t assume Euro works everywhere. Multi-country escorted coach tours remain the most-booked format for first-time European travelers from India; independent (FIT) itineraries are a premium upsell.',
      },
    ],
    quiz: [
      { text: 'What visa is required to visit France, Switzerland, and Italy on this circuit?', options: ['Schengen visa', 'UK visa', 'Individual visas per country', 'No visa needed'], correctIndex: 0 },
      { text: 'Which currency does Switzerland use?', options: ['Euro', 'Swiss Franc (CHF)', 'Swiss Euro', 'British Pound'], correctIndex: 1 },
      { text: 'What is the best shoulder season to visit Europe for good weather and lower prices?', options: ['July–August', 'Dec–Feb', 'Apr–Jun / Sep–Oct', 'No shoulder season exists'], correctIndex: 2 },
      { text: 'What is the Swiss mountain excursion sometimes called "Top of Europe"?', options: ['Mount Titlis', 'Jungfraujoch', 'Matterhorn', 'Mont Blanc'], correctIndex: 1 },
      { text: 'What booking format is most common for first-time Indian travelers to Europe?', options: ['Independent (FIT) itineraries', 'Escorted coach tours', 'Cruise-only packages', 'Backpacking hostels'], correctIndex: 1 },
    ],
  },
];
