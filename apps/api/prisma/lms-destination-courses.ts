// Destination training content for travel consultants — one course per
// market, each with in-depth lessons (geography/climate, visa & currency,
// attractions & itinerary, flights & costs, accommodation, culture/safety,
// objection handling) and a scenario-based exam that requires synthesizing
// facts across lessons rather than single-fact recall. Shared between
// prisma/seed.ts (fresh-DB path) and prisma/seed-lms-destinations.ts /
// prisma/upgrade-lms-destinations.ts (scripts for an already-seeded DB).

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
      "A complete, in-depth brief on Dubai & the UAE — geography, visas, attractions, real cost bands, hotel tiers, etiquette, and objection-handling scripts — for consultants who need to sell this route with confidence.",
    lessons: [
      {
        title: 'Geography, Climate & Best Time to Visit',
        content:
          'The UAE is a federation of seven emirates; Dubai is the most-visited, Abu Dhabi is the capital and the largest by area, and Sharjah (adjacent to Dubai, roughly 25 minutes by road) is the cultural/dry emirate with no alcohol at all — worth knowing if a client wants a Sharjah day trip. Climate is desert: Nov–Mar averages 20–32°C with low humidity and is the sweet spot for outdoor activities (desert safaris, Global Village, beach days). Apr and Oct are shoulder months, warm but manageable (32–38°C). Jun–Sep is genuinely harsh (42–48°C, high humidity near the coast) — outdoor daytime activities are impractical then; steer clients toward indoor malls, Aquaventure, or reschedule. Rain is rare and usually brief when it happens (Jan–Feb). Ramadan (dates shift ~11 days earlier each year on the Gregorian calendar) changes daily rhythms — see Lesson 6 for what that means operationally.',
      },
      {
        title: 'Visa, Documentation & Currency',
        content:
          'Entry rules depend on the passport AND on what other visas the traveler already holds. Indian passport holders qualify for visa-on-arrival (14 days, extendable once) only if they already hold a valid US visa, UK visa, EU/Schengen visa, or hold a Green Card — the underlying visa must be used at least once and have at least 6 months validity remaining. Indian passport holders WITHOUT any of those documents must apply for a UAE e-visa in advance (processing 3–5 working days, valid 30 or 90 days depending on type, single or multiple entry). Passport itself needs 6 months validity from the date of travel. Currency is the UAE Dirham (AED), pegged to the USD at roughly 3.67 AED = 1 USD (so it barely moves against USD, but does move against INR as INR/USD moves) — a rough planning rate is ₹1 ≈ AED 0.044, i.e. AED 1 ≈ ₹22.7, but always requote at time of booking. ATMs are everywhere and cards are widely accepted; carrying cash is mainly useful for the Gold Souk, small taxis, and tipping.',
      },
      {
        title: 'Top Attractions & a Sample 4-Day Itinerary',
        content:
          'Marquee sights: Burj Khalifa (book "At the Top" 124/125th floor in advance — sunset slots sell out first), Dubai Mall & the Dubai Fountain show (free, runs every 30 min evenings), Desert Safari (dune bashing + camel ride + BBQ dinner + Tanoura/belly dance show — the single most-booked add-on for first-timers), Palm Jumeirah with Atlantis Aquaventure waterpark, Dubai Marina & JBR beachfront (best for an evening stroll/dinner), Global Village (seasonal, roughly Nov–Apr, a multi-country pavilion + rides, excellent value family evening), and an Abu Dhabi day trip (Sheikh Zayed Grand Mosque — free entry, modest dress required for all genders — plus Ferrari World or Louvre Abu Dhabi if time allows, ~90 min drive each way). Sample 4-day pace for a first-time family: Day 1 arrival + Dubai Marina evening; Day 2 Burj Khalifa + Dubai Mall + Fountain show; Day 3 Desert Safari (afternoon–night) with a relaxed morning at the hotel pool; Day 4 Abu Dhabi day trip or Global Village depending on season, departure that night. Compress to 3 days by dropping the Abu Dhabi trip; expand to 5–6 by adding Palm Jumeirah/Aquaventure and a Sharjah heritage walk.',
      },
      {
        title: 'Flights, Transfers & Indicative Costs',
        content:
          'Direct flight time is ~3.5 hrs from Mumbai/Delhi/Bengaluru; round-trip economy fares run ₹14,000–₹24,000 in normal season but commonly spike to ₹28,000–₹35,000+ around Dec 20–Jan 5, Global Village peak weekends, and Eid holidays — flag this to clients pricing a "quick trip" without checking dates first. Airport transfers: private car ~AED 120–180 (₹2,700–₹4,000) one-way depending on hotel zone; shared/group transfers are cheaper but add pickup time. Package bands (per person, land only, twin-sharing): 4N/5D 3-star with city tour + desert safari runs ₹35,000–₹45,000; 4N/5D 4-star adding Burj Khalifa entry runs ₹50,000–₹60,000; 4N/5D 5-star adding Abu Dhabi day trip + Aquaventure runs ₹65,000–₹85,000. Component add-on costs worth quoting separately: Burj Khalifa "At the Top" ~₹2,500–₹4,000pp (sunset premium), desert safari ~₹3,500–₹5,000pp, Aquaventure day pass ~₹6,000–₹7,500pp, Abu Dhabi day tour ~₹4,500–₹6,000pp. A family of 4 booking the 4-star band at the upper end (₹60,000pp) is looking at roughly ₹2,40,000 land cost before flights — always show this multiplied total, not just the per-person figure, when quoting families.',
      },
      {
        title: 'Accommodation Guide',
        content:
          'Zone matters more than star rating for guest satisfaction. Deira/Bur Dubai (Old Dubai): budget-friendly, close to Gold Souk and Dubai Creek, but far from the beach and newer attractions — good for value-focused, culture-curious clients, not for beach-first families. Downtown Dubai (near Burj Khalifa/Dubai Mall): premium pricing but unbeatable for first-timers who want to walk to the main sights; best for couples and clients on a shorter trip who don\'t want transfer time eating into sightseeing. Dubai Marina/JBR: the beach-and-nightlife zone, strong for younger travelers and families wanting pool + beach + walkable dining; slightly further from Burj Khalifa (20–25 min drive/metro). Palm Jumeirah: resort-style luxury (Atlantis, and others), best for honeymooners and clients explicitly requesting a "resort holiday" rather than a sightseeing-heavy trip — expect a 30–40% premium over comparable Marina hotels. 3-star typically means clean, functional, no-frills — fine for budget travelers who\'ll be out sightseeing all day; 4-star adds pool/gym/better breakfast; 5-star in Dubai often means genuinely distinctive design and service, not just marginally nicer rooms — worth the upsell pitch for anniversaries/honeymoons specifically.',
      },
      {
        title: 'Culture, Safety & Etiquette',
        content:
          'Dubai is safe by most global standards (low street crime), but the UAE enforces strict public-conduct laws that differ sharply from India: public alcohol consumption is illegal (only inside licensed hotels/bars/restaurants), public displays of affection beyond hand-holding can draw police attention, and swearing or rude gestures in public/online (including in disputes) can lead to fines or detention — brief clients explicitly, this catches first-timers off guard. Dress: swimwear is fine at pools/beaches, but modest dress (shoulders/knees covered) is expected at malls, government buildings, and religious sites — mosque visits (e.g. Sheikh Zayed Grand Mosque) require full-length, loose clothing and headscarves for women, available for loan on-site if needed. Friday is the start of the weekend in the traditional sense (Fri–Sat weekend is now common but some government offices still follow older patterns) and midday Friday prayer affects opening hours at some smaller businesses. During Ramadan (dates shift ~11 days earlier yearly), eating, drinking, or smoking in public during daylight hours is prohibited even for non-Muslim visitors — restaurants operate but many are curtained/discreet in the daytime and come alive after sunset (iftar); this is actually a wonderful cultural experience to pitch, not just a constraint. Tipping is customary (not mandatory) at ~10% in restaurants; taxis usually just round up.',
      },
      {
        title: 'Handling Common Client Objections',
        content:
          '"Dubai is just shopping malls, nothing cultural" — counter with Al Fahidi Historical Neighbourhood, an abra (traditional boat) ride across Dubai Creek, the Gold and Spice Souks, and Sharjah\'s heritage museums, all bookable as a half-day "Old Dubai" add-on for ₹1,500–₹2,500pp. "It\'s too expensive for our budget" — reframe with the 3-star + desert safari band (₹35,000–₹45,000pp land) and note Dubai\'s VAT refund scheme (5% VAT reclaimable at the airport on qualifying purchases above AED 250) as a genuine saving lever, not a gimmick. "We\'re worried about the heat" — steer summer travelers (Jun–Sep) toward an itinerary that\'s 70% indoor (malls, Aquaventure\'s covered sections, IMG Worlds of Adventure, Museum of the Future) and schedule the desert safari for late afternoon/evening when temperatures drop. "Is it safe for a solo woman traveler?" — Dubai has one of the lowest crime rates among major global tourist cities and is a genuinely strong pitch for solo female travelers; the real risks are the public-conduct laws in Lesson 6, not personal safety, so brief accordingly. "We don\'t drink, is there still nightlife?" — yes: Dubai Fountain shows, Global Village, Marina Walk dining, and desert safari evening shows are all alcohol-free and genuinely popular, so this is an easy objection to defuse.',
      },
    ],
    quiz: [
      {
        text: 'A client holds an Indian passport with no US/UK/Schengen visa and no Green Card. They want to fly to Dubai in 10 days. What should you tell them about their visa?',
        options: [
          'They qualify for visa-on-arrival automatically as Indian citizens',
          'They must apply for a UAE e-visa in advance; without a qualifying prior visa, on-arrival is not an option',
          'They cannot travel to the UAE at all without a Green Card',
          'They only need a visa if staying more than 30 days',
        ],
        correctIndex: 1,
      },
      {
        text: 'A family of 4 wants the 4-star Dubai package with Burj Khalifa entry, priced at the upper end of the quoted band. What is their approximate total land cost?',
        options: ['₹60,000', '₹1,20,000', '₹2,40,000', '₹3,40,000'],
        correctIndex: 2,
      },
      {
        text: 'A couple wants a genuinely quiet, resort-style honeymoon and explicitly says they don\'t want to spend time commuting to sightseeing. Which zone should you recommend, and why?',
        options: [
          'Deira/Bur Dubai, because it is the most budget-friendly',
          'Palm Jumeirah, because it offers resort-style luxury suited to honeymooners even at a price premium',
          'Dubai Marina, because it has the most nightlife',
          'Downtown Dubai, because it is closest to Burj Khalifa',
        ],
        correctIndex: 1,
      },
      {
        text: 'Which of the following is NOT a valid reason flight prices to Dubai spike?',
        options: ['Dec 20–Jan 5 holiday period', 'Global Village peak weekends', 'Eid holidays', 'The start of Ramadan daytime fasting'],
        correctIndex: 3,
      },
      {
        text: 'A client traveling in July asks for an itinerary heavy on outdoor sightseeing. What is the correct guidance and why?',
        options: [
          'Approve it — Dubai has no real seasonal temperature variation',
          'Redirect toward mostly indoor activities and schedule any desert safari for late afternoon/evening, since Jun–Sep temperatures (42–48°C) make daytime outdoor activity impractical',
          'Tell them Dubai is closed to tourists in summer',
          'Recommend they only visit Abu Dhabi instead, which has a different climate',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client says "I heard alcohol is completely banned in the UAE." What is the accurate correction?',
        options: [
          'Alcohol is fully banned everywhere, including hotels',
          'Alcohol is legal to drink anywhere in public',
          'Alcohol is only legal inside licensed hotels, bars, and restaurants — not in public',
          'Alcohol is legal only during Ramadan',
        ],
        correctIndex: 2,
      },
      {
        text: 'A client wants to visit the Sheikh Zayed Grand Mosque. Which statement about this visit is correct?',
        options: [
          'Entry is free, but full-length, loose clothing and headscarves are required for women (available for loan on-site)',
          'Entry requires a paid ticket booked weeks in advance',
          'It is closed to non-Muslim visitors',
          'Swimwear is acceptable as long as shoulders are covered',
        ],
        correctIndex: 0,
      },
      {
        text: 'A budget-conscious client objects that Dubai is "too expensive." Which two levers from the lessons directly address this objection?',
        options: [
          'Booking only 5-star Palm Jumeirah hotels and skipping the desert safari',
          'The 3-star + desert safari package band and the 5% VAT refund scheme on qualifying purchases',
          'Traveling only during Dec 20–Jan 5 for the best weather',
          'Avoiding all pre-booked add-ons entirely',
        ],
        correctIndex: 1,
      },
      {
        text: 'Which emirate near Dubai should you flag as fully dry (no alcohol at all, unlike Dubai itself) if a client wants to add a day trip there?',
        options: ['Abu Dhabi', 'Sharjah', 'Fujairah', 'Ajman'],
        correctIndex: 1,
      },
      {
        text: 'A solo female traveler asks if Dubai is safe. What is the most accurate, complete answer based on the lessons?',
        options: [
          'It is not recommended for solo women travelers',
          'It has a very high crime rate and should be avoided',
          'It has one of the lowest crime rates among major global tourist cities; the real thing to brief on is the UAE\'s strict public-conduct laws, not personal safety risk',
          'It is safe only if she stays exclusively inside her hotel',
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    title: 'Selling Thailand',
    category: 'Thailand',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/KohPhiPhi.JPG/960px-KohPhiPhi.JPG',
    description:
      'A deep-dive brief on Thailand — Bangkok, Pattaya, Phuket, Krabi, and Chiang Mai — covering visas, real seasonal pricing, hotel zones, safety, and scripts for the objections this route gets most often.',
    lessons: [
      {
        title: 'Geography, Climate & Best Time to Visit',
        content:
          'Thailand has three broad climate patterns: the central plains and Bangkok (hot Mar–May, rainy Jun–Oct, cool/dry Nov–Feb — the best window); the Gulf coast beach towns like Pattaya and Koh Samui (similar pattern, slightly milder rain); and the Andaman coast (Phuket, Krabi) where the SW monsoon (roughly May–Oct) brings rougher seas and frequent rain, making Nov–Apr the clear best window for beach/island itineraries — quoting an Andaman-coast beach package for July without flagging monsoon risk is a common consultant mistake. Chiang Mai in the north has a distinct cool season Nov–Feb (can drop to single digits at night in the surrounding hills) that\'s popular for a different reason: it escapes both the heat and the crowds of the south. Always ask which specific cities/regions a client wants before advising travel dates — "Thailand" is not one climate.',
      },
      {
        title: 'Visa, Documentation & Currency',
        content:
          'Since the 2024 policy change, Indian passport holders are visa-exempt for tourist stays up to 30 days per Thailand entry (previously visa-on-arrival was required) — no advance application needed for standard leisure trips, which is a genuine selling point vs. Vietnam or the UAE. Passport must have 6 months validity remaining. Immigration may ask for proof of onward travel and sufficient funds, though this is rarely enforced strictly for package tourists with confirmed return flights and hotel vouchers — carry printed copies regardless. Currency is the Thai Baht (THB); rough planning rate ₹1 ≈ THB 0.40, i.e. THB 1 ≈ ₹2.5, always requote at booking. Baht is easy to exchange at the airport or in tourist areas (rates vary — city exchange counters like SuperRich typically beat airport counters); cards are widely accepted in Bangkok/Phuket hotels and malls but cash is still king at markets, street food stalls, and smaller islands.',
      },
      {
        title: 'Top Attractions & a Sample 6-Day Itinerary',
        content:
          'Bangkok: Grand Palace & Wat Phra Kaew (strict dress code — no shorts/sleeveless, sarongs available for rent at the gate), Wat Arun ("Temple of Dawn," best at sunset from across the river), Chatuchak Weekend Market (only open Sat–Sun, plan accordingly), and a Chao Phraya river dinner cruise. Pattaya: Coral Island (Koh Larn) day trip for snorkeling/water sports, the Alcazar cabaret show (family-friendly despite the performer lineup — worth clarifying to conservative clients), Nong Nooch Tropical Garden. Phuket: Patong Beach for nightlife/shopping, Big Buddha viewpoint, and — the single most-booked Phuket add-on — a Phi Phi Islands day trip by speedboat (Maya Bay, Monkey Beach). Krabi: Railay Beach (accessible only by longtail boat, no road access — a genuine highlight, not a gimmick), the Four Islands tour, Emerald Pool & Hot Springs. Sample 6N/7D pace: Days 1–2 Bangkok (Grand Palace + river cruise); Days 3–4 fly to Phuket, Phi Phi day trip; Days 5–6 Krabi day trip from Phuket or a short transfer, Railay Beach; Day 7 departure. For Pattaya-first itineraries, swap Phuket/Krabi for a Bangkok–Pattaya loop (2.5-hr drive, easy to combine).',
      },
      {
        title: 'Flights, Transfers & Indicative Costs',
        content:
          'Direct flights from Mumbai/Delhi/Chennai/Bengaluru to Bangkok run ~4 hrs; round-trip economy fares are ₹18,000–₹28,000 in normal season (₹16,000–₹24,000 from South Indian metros, which often have better direct connectivity to Bangkok than to some other SE Asia hubs). Domestic legs (Bangkok–Phuket/Krabi, ~1.5 hrs) typically cost ₹3,000–₹6,000 one-way and are usually cheaper and faster than a long overland transfer — always price the domestic flight option even if the client hasn\'t asked. Package bands (per person, land only, twin-sharing): 5N/6D Bangkok + Pattaya 3-star runs ₹32,000–₹42,000; 6N/7D Phuket + Krabi 4-star with island hopping runs ₹55,000–₹70,000; a premium 7N/8D covering Bangkok + Phuket + Krabi at 4-star can run ₹75,000–₹95,000. Notable add-on costs: Alcazar show ~₹1,500pp, Coral Island trip ~₹2,000pp, Phi Phi day tour ~₹3,000–₹4,500pp depending on boat type (speedboat vs. big boat), Four Islands Krabi tour ~₹2,500–₹3,500pp. A couple booking the Phuket+Krabi 4-star band at the lower end (₹55,000pp) plus a Phi Phi add-on (₹3,500pp) each comes to roughly ₹1,17,000 total land cost for two.',
      },
      {
        title: 'Accommodation Guide',
        content:
          'Bangkok: Sukhumvit is the safest, most convenient area for first-timers (BTS Skytrain access, malls, restaurants); Riverside hotels (near the Chao Phraya) offer a more scenic, slightly quieter stay with river-cruise access but less walkable nightlife. Pattaya: hotels along Beach Road/Walking Street suit nightlife-focused younger travelers; Jomtien Beach (south of central Pattaya) is quieter and better for families. Phuket: Patong is the liveliest and most convenient for nightlife and shopping but can feel chaotic for families; Kata/Karon beaches are calmer, family-friendly alternatives just south of Patong; Bang Tao/Laguna area hosts the higher-end resort cluster, best for honeymooners wanting a quieter luxury base. Krabi: Ao Nang is the main tourist hub with easy longtail-boat access to Railay and nearby islands — most clients should base here rather than in Krabi Town itself, which is more of a local commercial center with less direct beach/boat access. As with Dubai, star rating matters less than zone fit — a 5-star hotel in the wrong area still means unhappy clients if their priority (nightlife vs. quiet vs. beach access) doesn\'t match the location.',
      },
      {
        title: 'Culture, Safety & Etiquette',
        content:
          'Thailand is very tourist-friendly and generally safe, but standard precautions apply: avoid unlicensed taxis at tourist hotspots (agree on a fare or insist on the meter), be cautious of the classic "temple is closed today, let me take you elsewhere" tuk-tuk scam near major temples, and never leave drinks unattended in nightlife areas. Respect for the monarchy is a serious legal matter — public criticism of the royal family, defacing currency (which bears the King\'s image), or disrespecting royal portraits can lead to serious legal consequences even for tourists; this is worth a direct, matter-of-fact mention rather than skipping it. Temple etiquette: modest dress (shoulders and knees covered) is required at most temples, shoes must be removed before entering temple buildings, and it\'s considered disrespectful to point your feet at a Buddha image or touch a monk (women especially should avoid any physical contact with monks). Tipping is appreciated but not obligatory — rounding up or ~10% at restaurants is generous; hotel porters/housekeeping ~THB 20–40 per service is customary. Songkran (Thai New Year, mid-April, nationwide water-fight festival) is genuinely fun to experience but causes major price surges and can disrupt sightseeing (many attractions see reduced hours) — sell this as an experience in its own right, not a "normal" travel week.',
      },
      {
        title: 'Handling Common Client Objections',
        content:
          '"Thailand feels like it\'s only for young backpackers/nightlife" — counter with the Grand Palace, Chiang Mai\'s temples and elephant sanctuaries, and Krabi\'s Railay Beach as genuinely family- and culture-friendly alternatives; segment the pitch by asking what the client actually wants before assuming nightlife is the draw. "Is it safe for families with young kids?" — yes, broadly; the main precautions are transport scams and standard beach/water safety at less-supervised beaches, not violent crime; recommend Kata/Karon over Patong for families specifically. "We want beaches but are traveling in July" — be direct: the Andaman coast (Phuket/Krabi) is in monsoon season then, so either shift to Pattaya/Koh Samui (Gulf coast, milder rain pattern) or move the dates; don\'t sell a July Phuket beach package without this caveat. "Why Thailand over Bali or Vietnam?" — Thailand\'s visa-free entry (no advance application), direct flight availability from more Indian cities, and the widest range of experience types (beaches + culture + nightlife + nature) in one country make it the easiest "first international beach trip" to sell with the fewest logistics objections. "Is the Alcazar/cabaret show appropriate for our family?" — yes, it\'s a stage performance suitable for family audiences; clarify this proactively since the premise (transgender performers) sometimes causes hesitation before clients realize the show itself is mainstream family entertainment.',
      },
    ],
    quiz: [
      {
        text: 'A client wants a Phuket beach holiday in late July. What should you tell them?',
        options: [
          'July is peak season in Phuket, book immediately',
          'The Andaman coast is in monsoon season (roughly May–Oct) in July, so rough seas and rain are likely — suggest Pattaya/Koh Samui instead or shift the dates',
          'Thailand has no seasonal weather variation, any month works',
          'Phuket is closed to tourists during July',
        ],
        correctIndex: 1,
      },
      {
        text: 'Under the current policy, what do Indian passport holders need to enter Thailand for a 20-day leisure trip?',
        options: [
          'A visa-on-arrival application at the airport',
          'An e-visa applied for at least a month in advance',
          'Nothing beyond a valid passport with 6 months validity — visa-exempt for stays up to 30 days',
          'A letter of invitation from a Thai resident',
        ],
        correctIndex: 2,
      },
      {
        text: 'A couple books the Phuket + Krabi 4-star package at ₹55,000pp plus a Phi Phi Islands add-on at ₹3,500pp each. What is their approximate total land cost for two?',
        options: ['₹58,500', '₹1,17,000', '₹1,50,000', '₹2,10,000'],
        correctIndex: 1,
      },
      {
        text: 'A family with young children wants a Phuket base. Which area should you recommend and why?',
        options: [
          'Patong, because it has the most restaurants',
          'Kata/Karon, because they are calmer and more family-friendly than the livelier Patong area',
          'Krabi Town, because it is the most central',
          'Bang Tao, because it is the cheapest option',
        ],
        correctIndex: 1,
      },
      {
        text: 'Which of these is a genuinely serious legal risk for tourists in Thailand, distinct from ordinary travel scams?',
        options: [
          'Wearing shorts at the beach',
          'Public criticism of the monarchy or disrespecting royal imagery/currency',
          'Taking a licensed metered taxi',
          'Eating street food',
        ],
        correctIndex: 1,
      },
      {
        text: 'Railay Beach in Krabi has a notable access characteristic consultants should mention when quoting it. What is it?',
        options: [
          'It is only accessible by longtail boat — there is no road access',
          'It requires a full-day hike to reach',
          'It is closed to foreign tourists',
          'It can only be visited as part of an overnight cruise',
        ],
        correctIndex: 0,
      },
      {
        text: 'A client asks why Thailand is easier to sell than Vietnam for a first-time client with tight logistics tolerance. What is the strongest, most accurate reason from the lessons?',
        options: [
          'Thailand is always cheaper than Vietnam',
          'Thailand has visa-free entry for Indian tourists (no advance application) plus wider direct flight availability, reducing logistics friction',
          'Vietnam has no beaches at all',
          'Thailand has no monsoon season anywhere',
        ],
        correctIndex: 1,
      },
      {
        text: 'A conservative family hesitates about booking the Alcazar cabaret show in Pattaya. What is the accurate, reassuring clarification?',
        options: [
          'The show is adults-only and inappropriate for families',
          'It is a stage performance suitable for family audiences, despite the transgender performer lineup causing initial hesitation',
          'It is not available to book for foreign tourists',
          'It only runs during Songkran',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client wants to visit the Grand Palace and Chatuchak Market on the same day, arriving on a Tuesday. What is the issue with this plan?',
        options: [
          'There is no issue, both are open every day',
          'The Grand Palace requires a week of advance booking',
          'Chatuchak Weekend Market is only open Saturday–Sunday, so it will be closed on a Tuesday',
          'Chatuchak Market has been permanently closed',
        ],
        correctIndex: 2,
      },
      {
        text: 'Why should a consultant proactively price a domestic Bangkok–Phuket flight rather than assume overland transfer, even if the client hasn\'t asked?',
        options: [
          'Overland transfer is always faster',
          'The domestic flight (~1.5 hrs) is usually cheaper and faster than the long overland alternative',
          'Domestic flights within Thailand are not available to tourists',
          'It is legally required to fly between these cities',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    title: 'Selling Singapore',
    category: 'Singapore',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Marina_Bay_Sands_%28I%29.jpg/960px-Marina_Bay_Sands_%28I%29.jpg',
    description:
      'An in-depth brief on Singapore — visas, real cost bands, hotel zones, the Malaysia combo pitch, strict local laws, and objection-handling — for consultants selling this premium, hassle-free short-haul route.',
    lessons: [
      {
        title: 'Geography, Climate & Best Time to Visit',
        content:
          'Singapore is a compact city-state (roughly the size of a mid-sized Indian city) with a tropical rainforest climate — hot and humid year-round (26–32°C), with no true "off season" in temperature terms. It does NOT have a dry season the way SE Asia beach destinations do; short, heavy afternoon showers can happen in any month, though Nov–Jan (the Northeast Monsoon) brings the most consistent rain and Feb–Apr tends to be marginally drier and sunnier. Because of this, Singapore is genuinely a year-round sell — there\'s no strong seasonal reason to avoid any particular month, which is a useful pitch point when a client\'s preferred travel window doesn\'t suit a beach destination.',
      },
      {
        title: 'Visa, Documentation & Currency',
        content:
          'Indian passport holders require an e-visa for Singapore, applied for in advance (processing typically 3–5 working days; some agents can expedite). This is a firm requirement — unlike Thailand, there is no visa-exempt or on-arrival option for Indian passports. Passport needs 6 months validity from date of entry. Singapore immigration is efficient but strict about compliance (correct visa type, matching entry/exit dates) — always double-check the visa validity window against the actual travel dates before departure. Currency is the Singapore Dollar (SGD); rough planning rate ₹1 ≈ SGD 0.016, i.e. SGD 1 ≈ ₹62–65, always requote at booking. Cards are near-universally accepted (Singapore is one of the most cashless societies in the region); cash is mainly useful for hawker centres and small purchases. GST is 9% and is included in most posted prices; tourists can claim a GST refund at the airport on qualifying purchases via the eTRS system.',
      },
      {
        title: 'Top Attractions & a Sample 4-Day Itinerary',
        content:
          'Marina Bay Sands (MBS): the SkyPark observation deck is open to all ticket-holders, but the famous infinity pool is strictly hotel-guests-only — a common client misconception worth correcting upfront. Gardens by the Bay: Supertree Grove (free to walk through, paid for the OCBC Skyway), Cloud Forest and Flower Dome (paid, indoor climate-controlled biomes — good rainy-day options given Lesson 1\'s climate note). Sentosa Island: Universal Studios Singapore, S.E.A. Aquarium, plus beaches and a cable car link from the mainland — effectively a full-day destination on its own. Singapore Zoo & Night Safari (best combined as an evening after a rest day, since Night Safari only operates after dark). Merlion Park (quick 30–45 min photo stop) and Clarke Quay (riverside dining/nightlife, good for an evening). Sample 4N/5D pace: Day 1 arrival + Marina Bay evening (Fountain/light show at Gardens by the Bay); Day 2 full-day Sentosa (Universal Studios); Day 3 Gardens by the Bay (day) + Singapore Zoo/Night Safari (evening); Day 4 city sights (Merlion, Clarke Quay, shopping on Orchard Road) or a Malaysia day trip if extending; Day 5 departure.',
      },
      {
        title: 'Flights, Transfers & Indicative Costs',
        content:
          'Direct flights from Mumbai/Delhi run ~5.5 hrs; round-trip economy fares are ₹22,000–₹32,000 in normal season. Chennai/Bengaluru often have better direct connectivity and slightly lower fares (₹18,000–₹26,000) than northern metros — worth checking both origin cities if the client has flexibility. Airport (Changi) to city transfers are efficient: MRT (metro) is cheap and fast (~SGD 2–3, ~30 min to most central areas), taxis/ride-hail run SGD 25–40 depending on destination and time of day. Package bands (per person, land only, twin-sharing): 4N/5D 3-star covering city + Sentosa runs ₹48,000–₹58,000; 4N/5D 4-star adding Universal Studios + Night Safari runs ₹65,000–₹80,000. Notable add-on costs: Universal Studios Singapore ticket ~₹4,500pp, S.E.A. Aquarium ~₹3,000pp, Night Safari ~₹3,500pp, Gardens by the Bay Cloud Forest + Flower Dome combo ~₹2,000pp. Because Singapore itself has no "cheap tier," it consistently prices higher than Thailand/Bali/Vietnam for a comparable trip length — always set this expectation early with budget-sensitive clients rather than let sticker shock surface mid-quote.',
      },
      {
        title: 'Accommodation Guide',
        content:
          'Marina Bay/Downtown Core (including Marina Bay Sands itself): premium pricing, unbeatable for first-timers wanting to walk to Gardens by the Bay and the main skyline sights; best for couples and shorter trips. Orchard Road: the main shopping district, very convenient MRT access, good mid-to-premium range, suits shopping-focused clients and families who want a central, walkable base. Sentosa Island resorts (Resorts World Sentosa, etc.): best for families prioritizing Universal Studios/beach access who don\'t mind being slightly removed from the main city sights (20–30 min to Downtown). Bugis/Chinatown/Little India: more budget-friendly, culturally rich areas with good MRT connectivity — solid choice for value-conscious clients who still want reasonable central access. Given how compact and MRT-connected Singapore is, zone choice matters less here than in Dubai/Thailand for overall trip logistics — but it still meaningfully affects evening walkability and the "vibe" of a stay, so match it to what the client says they want (shopping, skyline views, family resort, budget).',
      },
      {
        title: 'Culture, Safety & Etiquette',
        content:
          'Singapore has an extremely low crime rate and is frequently cited as one of the safest cities in the world for tourists, including solo and family travelers — a strong, simple selling point. That safety is backed by genuinely strict laws that differ sharply from most of Asia: littering carries real fines (SGD 300+ for a first offense, escalating for repeat offenses), importing or selling chewing gum is banned (a well-known but accurate fact — bring enough for the trip if a client needs it), jaywalking is finable, smoking is banned in most public/indoor areas except designated zones, and vandalism/graffiti carries serious penalties including caning for severe cases. None of this should alarm clients — frame it as "very clean, very orderly, and very safe as a direct result," which is exactly the pitch that resonates with first-time-abroad families and older travelers. English is an official language and the default language of business/tourism signage, so there is genuinely no language-barrier concern to manage, unlike most other SE Asia routes.',
      },
      {
        title: 'Handling Common Client Objections',
        content:
          '"Singapore feels too expensive for what it is" — be upfront that Singapore has no true budget tier the way Thailand/Vietnam do, but strengthen the value case with: (a) the GST refund scheme on qualifying purchases, (b) combining with a Malaysia extension (Kuala Lumpur or Genting Highlands are 4–5 hrs by road, or a short flight) to spread cost across a longer, more varied trip, and (c) noting that unlike beach destinations, there\'s zero weather risk to plan around, reducing the chance of a wasted day. "Four days feels too short for the cost" — pitch the Malaysia combo explicitly: a 4N Singapore + 3N Kuala Lumpur/Genting package amortizes flights and gives noticeably more variety (theme parks, cooler hill-station climate at Genting, different food culture) for a moderate cost increase. "Is it worth it with young kids?" — yes, strongly: Universal Studios, the Zoo/Night Safari, and Gardens by the Bay are all built for family engagement, and Singapore\'s safety/cleanliness profile (Lesson 6) specifically reduces the anxiety factor for parents traveling with young children compared to less orderly destinations. "We\'ve heard the laws are very strict, will we accidentally break one?" — reassure that ordinary tourist behavior (not littering, not jaywalking, not smoking outside designated areas) keeps clients well clear of any issue; the laws target genuinely disruptive or destructive behavior, not routine sightseeing.',
      },
    ],
    quiz: [
      {
        text: 'A client wants to know the best month to avoid rain in Singapore. What is the accurate answer?',
        options: [
          'December, because it is the driest month',
          'There is no strong dry season — Feb–Apr is marginally drier, but short showers can occur year-round, including during the Nov–Jan Northeast Monsoon which brings the most consistent rain',
          'June–August is guaranteed rain-free',
          'Singapore has zero rainfall any time of year',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client assumes they can enter Singapore visa-free like they can with Thailand. What is the correct correction?',
        options: [
          'Correct, Indian passport holders are visa-exempt for Singapore too',
          'Incorrect — Indian passport holders require an e-visa applied for in advance; there is no visa-exempt or on-arrival option',
          'Correct, but only for stays under 7 days',
          'Incorrect — Indian passport holders are banned from entering Singapore',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client wants to swim in the Marina Bay Sands infinity pool they saw in photos, without staying at the hotel. What should you tell them?',
        options: [
          'They can buy a day pass to the pool separately',
          'The infinity pool is strictly for MBS hotel guests only — the SkyPark observation deck is open to all ticket-holders, but not the pool',
          'The pool is open to all visitors for free',
          'The pool has been permanently closed',
        ],
        correctIndex: 1,
      },
      {
        text: 'A family books the 4-star Singapore package (Universal Studios + Night Safari) at ₹65,000pp and adds an S.E.A. Aquarium ticket at ₹3,000pp each, for 2 adults and 2 children (assume child price = adult price for this calculation). What is their approximate total land cost?',
        options: ['₹68,000', '₹1,36,000', '₹2,72,000', '₹4,08,000'],
        correctIndex: 2,
      },
      {
        text: 'A budget-conscious client objects that "4 days in Singapore feels expensive for what it is." What is the strongest lesson-based counter?',
        options: [
          'Tell them Singapore is actually the cheapest SE Asia destination',
          'Pitch a Singapore + Malaysia (Kuala Lumpur/Genting) combo to amortize flight cost and add variety, alongside the GST refund scheme',
          'Recommend they skip Singapore entirely',
          'Suggest they stay in a hostel with no other changes'
        ],
        correctIndex: 1,
      },
      {
        text: 'Why does Singapore consistently price higher than Thailand, Bali, or Vietnam for a comparable trip length?',
        options: [
          'Flights to Singapore are always more expensive',
          'Singapore has no true budget accommodation/dining tier the way those other destinations do',
          'Singapore charges tourists a special entry tax',
          'Singapore packages always include 5-star hotels only',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client is nervous about "accidentally breaking a law" in Singapore given its strict reputation. What is the accurate reassurance?',
        options: [
          'They should avoid leaving their hotel to be safe',
          'The strict laws target genuinely disruptive behavior (littering, jaywalking, smoking outside designated areas); ordinary tourist conduct keeps them well clear of any issue',
          'Tourists are exempt from all Singapore laws',
          'Only Singapore citizens are subject to these laws',
        ],
        correctIndex: 1,
      },
      {
        text: 'Which of these is an accurate, real consequence under Singapore law that a consultant should mention when briefing clients?',
        options: [
          'Littering can carry fines of SGD 300 or more for a first offense',
          'Wearing shorts in public is illegal',
          'Speaking English in public spaces is discouraged',
          'Taking photos of Marina Bay Sands is prohibited',
        ],
        correctIndex: 0,
      },
      {
        text: 'A family with young children asks whether Singapore is a good fit. What is the best evidence-based answer from the lessons?',
        options: [
          'No, Singapore has nothing built for children',
          'Yes — Universal Studios, the Zoo/Night Safari, and Gardens by the Bay are built for family engagement, and Singapore\'s safety/orderliness specifically reduces parental anxiety compared to less orderly destinations',
          'Only if they stay exclusively at Marina Bay Sands',
          'No, Singapore is only suitable for business travelers',
        ],
        correctIndex: 1,
      },
      {
        text: 'Which area should a consultant recommend for a shopping-focused family that also wants good MRT access to other sights?',
        options: ['Sentosa Island resorts', 'Orchard Road', 'Chinatown only', 'Changi Airport hotels'],
        correctIndex: 1,
      },
    ],
  },
  {
    title: 'Selling Bali & Indonesia',
    category: 'Bali & Indonesia',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Pura_Luhur_Uluwatu_2017-08-17_%2834%29.jpg/960px-Pura_Luhur_Uluwatu_2017-08-17_%2834%29.jpg',
    description:
      "A thorough brief on Bali — visas, connecting-flight logistics, real cost bands by zone, cultural depth, safety, and objection-handling — for consultants selling the agency's fastest-growing honeymoon and culture destination.",
    lessons: [
      {
        title: 'Geography, Climate & Best Time to Visit',
        content:
          'Bali has two seasons, not four: dry season (Apr–Oct, the clear best window — lower humidity, more reliable sunshine, calmer seas for water activities) and wet season (Nov–Mar, still fully visitable but with short, heavy afternoon downpours rather than all-day rain — many clients over-worry about this). Within dry season, Jul–Aug is peak international tourist season (higher prices, busier sights); Apr–Jun and Sep–Oct are shoulder months with dry-season weather but noticeably fewer crowds and better rates — actively steer price-sensitive or crowd-averse clients toward these months rather than Jul–Aug by default. Regional microclimates matter: Ubud (inland, higher elevation) is noticeably cooler and greener than the beach zones (Kuta/Seminyak/Nusa Dua); consultants should mention this when a client asks "what should I pack."',
      },
      {
        title: 'Visa, Documentation & Currency',
        content:
          'Indian passport holders receive visa-on-arrival (VOA) at Bali\'s airport, currently priced at roughly USD 35 (payable in local currency or by card at the airport), valid 30 days and extendable once for a further 30 days via a visit to an immigration office in Bali — worth mentioning to clients considering a longer stay. Passport needs 6 months validity from date of entry. Currency is the Indonesian Rupiah (IDR), notable for very high denominations — a rough planning rate is IDR 1,000,000 ≈ ₹5,200 (i.e., ₹1 ≈ IDR 190–195, always requote at booking) — first-time visitors regularly get confused handling six-figure and seven-figure bills, so proactively briefing this (and suggesting a currency-conversion app) meaningfully improves the client experience. ATMs are widely available in tourist areas; cards are accepted at hotels/restaurants in Kuta/Seminyak/Ubud but cash is still essential for markets, warungs (local eateries), and temple donation boxes.',
      },
      {
        title: 'Top Attractions & a Sample 6-Day Itinerary',
        content:
          'Uluwatu Temple: a clifftop temple famous for its sunset Kecak Fire Dance performance — book the performance separately from general temple entry, and arrive early for sunset seating. Ubud: Tegalalang Rice Terrace (best early morning for photos before tour-bus crowds), the Sacred Monkey Forest Sanctuary (advise clients to secure loose items — the monkeys are genuinely opportunistic), and Ubud Palace/Ubud Market for culture and shopping. Tanah Lot: an iconic sea temple on a rock formation, another strong sunset spot (very crowded at peak sunset time — set expectations). Nusa Penida day trip: Kelingking Beach (the famous "T-Rex"-shaped cliff viewpoint) and Angel\'s Billabong — this requires an early-morning fast-boat crossing (rougher in wet season) and is a genuinely full, tiring day, not a relaxed add-on. Seminyak/Kuta beaches and beach clubs for sunset drinks/dining. Mount Batur sunrise trek: a 2–3 hr predawn climb, physically demanding, only for clients who explicitly want an adventure/trekking element. Sample 6N/7D pace: Days 1–2 Seminyak/Kuta (arrival, beach, Tanah Lot sunset); Days 3–4 Ubud (rice terraces, Monkey Forest, Ubud Palace); Day 5 Uluwatu (temple + Kecak dance in the evening); Day 6 Nusa Penida day trip (only if the client confirms they\'re comfortable with an early, physically active day); Day 7 departure.',
      },
      {
        title: 'Flights, Transfers & Indicative Costs',
        content:
          'There are no direct flights from any Indian city to Bali — every itinerary routes through a connecting hub, most commonly Singapore, Kuala Lumpur, or Jakarta, adding a layover of typically 2–5 hrs each way; total journey time from Mumbai/Delhi is usually 9–11 hrs door-to-door including the layover. This is the single most important expectation to set upfront — clients who assume a direct flight (as with Dubai or Thailand) are consistently surprised, so state connecting-flight time explicitly in every quote, not just the flight duration. Round-trip fares run ₹28,000–₹40,000 from Mumbai/Delhi and ₹26,000–₹38,000 from Bengaluru/Chennai (routing via Kuala Lumpur is often cheapest from South Indian cities). Package bands (per person, land only, twin-sharing): 5N/6D 3-star Kuta + Ubud runs ₹45,000–₹58,000; 6N/7D 4-star Seminyak + Ubud + Nusa Penida runs ₹70,000–₹90,000. Notable add-on costs: Nusa Penida day tour (private car + fast boat) ~₹4,000pp, Uluwatu Kecak Fire Dance ticket ~₹800–₹1,200pp, Mount Batur sunrise trek (guide + transport) ~₹2,500–₹3,500pp. A couple booking the 4-star band at ₹80,000pp plus a Nusa Penida add-on comes to roughly ₹1,68,000 total land cost for two — always show connecting-flight cost/time alongside this land figure.',
      },
      {
        title: 'Accommodation Guide',
        content:
          'Kuta: the original, budget-friendly tourist hub — busy, close to the airport, strong for younger travelers on a tighter budget, but not the most relaxing base for families or honeymooners. Seminyak: an upscale evolution of Kuta — beach clubs, boutique shopping, higher-end dining — the default recommendation for couples and honeymooners wanting beach access with a more polished feel. Ubud: inland, cultural and wellness-focused (yoga retreats, rice-terrace views, art markets) — best for clients who explicitly want a slower, nature/culture-forward trip rather than a beach-first one; note the drive from Ubud to the beach zones is 60–90 min, so don\'t combine an Ubud base with daily beach trips without setting that expectation. Nusa Dua: a gated, resort-heavy enclave — calmer, family-friendly, good for clients wanting an all-inclusive-style resort stay without much independent exploring. Canggu: a newer, trendier beach area popular with younger/digital-nomad-type travelers for its cafes and surf culture — a good alternative to Kuta/Seminyak for clients wanting a more "local-cool" vibe. Villas with private pools (widely available even at moderate price points in Bali, unlike most of SE Asia) are a strong, genuinely differentiated upsell for honeymoon and destination-wedding clients specifically.',
      },
      {
        title: 'Culture, Safety & Etiquette',
        content:
          'Bali is Hindu-majority, a striking exception within Muslim-majority Indonesia, and this is worth leading with for Indian clients — many temples, daily offering rituals (canang sari, small palm-leaf offerings placed on the ground), and festivals (notably Nyepi, the Balinese "Day of Silence," when the entire island shuts down — no flights in/out, no leaving hotels — a genuinely unique but disruptive date to be aware of when quoting) will feel culturally resonant. Temple etiquette: a sarong and sash are required at most temples (usually provided/rentable on-site), women who are menstruating are traditionally asked not to enter inner temple areas (a real local custom, worth mentioning respectfully rather than letting a client be surprised), and stepping over offerings on the ground should be avoided. Standard safety precautions apply: scooter/motorbike rentals are extremely common among younger tourists but carry real accident risk on Bali\'s often-chaotic roads — a valid international driving permit is technically required and increasingly enforced; petty theft (bag snatching, especially near beaches/nightlife areas) is a bigger risk than violent crime. Tipping is appreciated (~10% at restaurants, small amounts for guides/drivers) but not obligatory.',
      },
      {
        title: 'Handling Common Client Objections',
        content:
          '"We assumed there was a direct flight" — address this immediately and honestly at the quoting stage (see Lesson 4), then reframe: most Bali itineraries route via Singapore or Kuala Lumpur, both of which can be sold as a worthwhile short stopover/mini-extension rather than a pure inconvenience, especially for clients with some date flexibility. "Isn\'t Bali just for honeymoons?" — no; pitch Ubud specifically for culture/wellness-focused clients and families, and Nusa Dua for resort-style family stays; Bali\'s range (temples, rice terraces, beaches, surf culture, cliff-top viewpoints) genuinely spans multiple traveler types. "We\'re worried about the currency confusion" — proactively offer to write out a quick reference card (e.g., "IDR 100,000 ≈ ₹520") and recommend a currency-conversion app; this small gesture meaningfully improves first-time-visitor confidence. "Is it respectful for us to visit as non-Hindus?" — yes, Balinese Hindu culture is generally very welcoming to respectful visitors; the key is following basic temple etiquette (sarong, sash, awareness around offerings) covered in Lesson 6, not any exclusion of outsiders. "We want an all-inclusive resort experience" — steer this client toward Nusa Dua rather than Ubud or Kuta/Seminyak, since Nusa Dua\'s resort-cluster format is the closest fit to that expectation within Bali.',
      },
    ],
    quiz: [
      {
        text: 'A client assumes there is a direct flight from Delhi to Bali. What is the accurate correction?',
        options: [
          'Correct, there are several direct flights daily',
          'Incorrect — there are no direct flights from any Indian city to Bali; itineraries route via a hub like Singapore, Kuala Lumpur, or Jakarta, adding a layover',
          'Correct, but only from Mumbai',
          'Incorrect — Bali cannot be reached by air from India at all',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client wants the best weather for a Nusa Penida boat trip and a beach-heavy itinerary. What months should you recommend, and why?',
        options: [
          'Nov–Mar, because it is the coolest period',
          'Apr–Oct (dry season), specifically the shoulder months Apr–Jun or Sep–Oct for dry-season weather with fewer crowds than Jul–Aug peak',
          'Any month, since Bali has no seasonal weather variation',
          'Only during Nyepi, for the cultural experience',
        ],
        correctIndex: 1,
      },
      {
        text: 'A couple wants a base for daily beach access without giving up cultural sightseeing, and prefers a polished, upscale feel over budget backpacker energy. Which zone fits best?',
        options: ['Kuta', 'Seminyak', 'Ubud', 'Nusa Dua'],
        correctIndex: 1,
      },
      {
        text: 'A client insists on basing in Ubud but also wants to visit the beach every day without long drives. What should you tell them?',
        options: [
          'This works perfectly, Ubud is right on the beach',
          'Ubud is inland; the drive to the beach zones is 60–90 minutes each way, so daily beach trips from an Ubud base are impractical — recommend splitting the stay or choosing a beach-zone base instead',
          'Daily beach access from Ubud takes only 10 minutes',
          'Ubud has its own private beach reserved for hotel guests',
        ],
        correctIndex: 1,
      },
      {
        text: 'What is Nyepi, and why does it matter for trip planning?',
        options: [
          'A local market day with extra crowds, otherwise no impact',
          'The Balinese "Day of Silence" — the entire island shuts down, with no flights in or out and no leaving hotels, so it is a critical date to flag when quoting travel near it',
          'A public holiday that only affects government offices',
          'A festival celebrated only in Ubud',
        ],
        correctIndex: 1,
      },
      {
        text: 'A couple books the 4-star Seminyak + Ubud + Nusa Penida package at ₹80,000pp and adds the Nusa Penida day tour at ₹4,000pp each. What is their approximate total land cost for two?',
        options: ['₹84,000', '₹1,68,000', '₹2,40,000', '₹3,20,000'],
        correctIndex: 1,
      },
      {
        text: 'A client says "I heard Bali is Muslim like the rest of Indonesia." What is the accurate correction, and why is it relevant to trip planning?',
        options: [
          'Correct, and it has no bearing on the trip',
          'Incorrect — Bali is Hindu-majority, a notable exception within Muslim-majority Indonesia, which shapes temple etiquette (sarong, sash, awareness around floor offerings) that consultants should brief clients on',
          'Incorrect — Bali is Buddhist-majority',
          'Correct, and this means alcohol is banned island-wide',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client planning a Nusa Penida day trip in wet season (Dec) asks if anything changes. What is the accurate answer?',
        options: [
          'Nothing changes, the boat crossing is identical year-round',
          'The fast-boat crossing to Nusa Penida can be rougher in wet season, which is worth flagging alongside the fact that the day is already physically demanding',
          'Nusa Penida is completely closed during wet season',
          'The trip becomes free during wet season',
        ],
        correctIndex: 1,
      },
      {
        text: 'A family wants an all-inclusive-style resort stay without much independent exploring. Which zone should you recommend?',
        options: ['Kuta', 'Canggu', 'Nusa Dua', 'Ubud'],
        correctIndex: 2,
      },
      {
        text: 'What is the single most important expectation to set explicitly at the quoting stage for every Bali itinerary, based on the lessons?',
        options: [
          'That alcohol is banned',
          'That there is no direct flight from India — every route connects via a hub, adding a layover',
          'That Bali has only one hotel zone',
          'That the Indonesian Rupiah cannot be exchanged in India',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    title: 'Selling Vietnam',
    category: 'Vietnam',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Ha_Long_Bay_in_2019.jpg/960px-Ha_Long_Bay_in_2019.jpg',
    description:
      'A detailed brief on Vietnam — Hanoi, Ha Long Bay, Da Nang/Hoi An, and Ho Chi Minh City — covering visas, north/south climate differences, real cost bands, and objection-handling for this fast-growing, high-value emerging route.',
    lessons: [
      {
        title: 'Geography, Climate & Best Time to Visit',
        content:
          'Vietnam is long and thin, spanning roughly 15 degrees of latitude, which means it genuinely has three separate climate zones — treating it as one destination with one "best time to visit" is a common and consequential consultant mistake. North (Hanoi, Ha Long Bay): four seasons, with a cool/dry winter (Oct–Apr, best for sightseeing, though Jan–Feb can be quite cold and misty) and a hot/humid, rain-prone summer (May–Sep). Central (Da Nang, Hoi An, Hue): best Feb–May (dry, warm, before summer heat); Sep–Dec brings a real risk of typhoons and heavy rain, which can disrupt Ha Long Bay-style boat activities and Hoi An\'s riverside areas (which have flooded in past years) — actively avoid recommending this window for central Vietnam. South (Ho Chi Minh City, Mekong Delta): tropical, with a dry season Dec–Apr (best) and a wet season May–Nov (afternoon showers, similar pattern to Bali/Thailand\'s Andaman coast). Always ask which specific cities are on the itinerary before advising dates.',
      },
      {
        title: 'Visa, Documentation & Currency',
        content:
          'Indian passport holders require an e-visa for Vietnam, applied for in advance (processing is officially 3 working days, though building in a buffer of 5–7 days is safer for peace of mind), valid up to 90 days and available as single or multiple entry depending on the application type. Unlike Thailand\'s visa-exempt policy, this is a firm advance-application requirement — set the expectation early so clients don\'t assume on-arrival processing. Passport needs 6 months validity from date of entry, and note that Vietnam immigration has occasionally been strict about passport damage/condition, so advise clients with visibly worn passports to consider renewal before travel. Currency is the Vietnamese Dong (VND), with very high denominations similar to the Indonesian Rupiah — rough planning rate ₹1 ≈ VND 290–295 (i.e., VND 1,000,000 ≈ ₹3,400), always requote at booking. Cards are accepted in hotels and larger restaurants in Hanoi/Ho Chi Minh City, but cash is essential in Hoi An\'s old town, local markets, and smaller towns; USD is also informally accepted in many tourist transactions but change is typically given in VND.',
      },
      {
        title: 'Top Attractions & a Sample 7-Day Itinerary',
        content:
          'Ha Long Bay: a UNESCO World Heritage site of limestone karst islands, best experienced via an overnight cruise (day-trip-only visits feel rushed given the ~3.5-hr drive/transfer each way from Hanoi) — cruise cabin quality varies enormously by operator, so this is a genuine area to upsell a better boat rather than the cheapest option. Hanoi: the Old Quarter (dense, walkable, famous for street food and the "train street" phenomenon), Hoan Kiem Lake, and the Thang Long Water Puppet Theatre (a genuinely unique, family-friendly traditional performance). Hoi An: a UNESCO-listed ancient trading-port town, famous for its lantern-lit old town (especially magical after dark) and same-day custom tailoring (a well-known local specialty — many clients specifically want to order clothing here, so mention fitting/pickup timing needs at least a full extra day in Hoi An). Da Nang: the Golden Bridge at Ba Na Hills (held up by giant stone "hands," one of the most photographed spots in SE Asia currently) and My Khe Beach. Ho Chi Minh City: the War Remnants Museum and Cu Chi Tunnels (both historically heavy — flag for families with young children, see Lesson 7), Ben Thanh Market. Sample 7N/8D pace: Days 1–2 Hanoi (Old Quarter, Water Puppet Theatre); Days 3–4 Ha Long Bay overnight cruise (return to Hanoi or fly onward); Days 5–6 Da Nang/Hoi An (Golden Bridge, lantern old town, tailoring); Day 7 Ho Chi Minh City (War Remnants Museum or Cu Chi Tunnels, Ben Thanh Market); Day 8 departure.',
      },
      {
        title: 'Flights, Transfers & Indicative Costs',
        content:
          'Flight time from India is ~5–6 hrs; most itineraries connect via Bangkok, Singapore, or Kuala Lumpur, though some seasonal direct charters have run from Delhi/Mumbai to Hanoi/Ho Chi Minh City — always check current direct availability rather than assuming a connection is required. Round-trip fares run ₹24,000–₹35,000. Domestic flights within Vietnam (e.g., Hanoi–Da Nang, Da Nang–Ho Chi Minh City) are the standard way to cover the country\'s length efficiently — overland travel between north and central/south is a multi-day proposition and not realistic for a standard leisure itinerary. Package bands (per person, land only, twin-sharing): 5N/6D Hanoi + Ha Long Bay cruise 3-star runs ₹48,000–₹60,000; 6N/7D Da Nang + Hoi An + Ho Chi Minh City 4-star runs ₹65,000–₹82,000. Notable add-on costs: Ha Long Bay overnight cruise upgrade (better cabin/boat) ~₹6,000–₹9,000pp over the base package, Cu Chi Tunnels half-day tour ~₹1,500–₹2,000pp, Hoi An custom tailoring (2–3 garments, budgeting for the client\'s own purchase, not a package inclusion) commonly runs USD 50–150 depending on garment type and fabric. Vietnam is consistently priced 15–25% below Thailand/Bali for a comparable multi-city itinerary, a genuine differentiator worth leading with for value-conscious clients.',
      },
      {
        title: 'Accommodation Guide',
        content:
          'Hanoi Old Quarter: dense, atmospheric, walkable to most sights, but rooms tend to be smaller and streets can be noisy — good for clients prioritizing atmosphere and street-food access over quiet/space. French Quarter (Hanoi): calmer, colonial-era architecture, slightly more spacious hotels, a good alternative for clients wanting comfort without losing central access. Ha Long Bay: accommodation is the cruise boat itself for the overnight portion — cabin categories vary from basic to genuinely luxurious, and this is where consultants should actively probe budget flexibility, since the boat experience defines the whole Ha Long segment. Hoi An Old Town vs. An Bang Beach: Old Town puts clients steps from the lantern-lit streets and tailors but is very touristy and can feel crowded in the evening; An Bang Beach (a short bike/taxi ride away) offers a quieter, beach-adjacent alternative for clients who want Hoi An\'s charm without staying in the busiest part of it. Ho Chi Minh City District 1: the central business/tourist district, most convenient for War Remnants Museum, Ben Thanh Market, and nightlife — the default recommendation for most clients unless they have a specific reason to base elsewhere.',
      },
      {
        title: 'Culture, Safety & Etiquette',
        content:
          'Vietnam is generally safe for tourists, with the most common issues being petty theft (bag snatching by motorbike, especially in Ho Chi Minh City and Hanoi\'s busier streets) and traffic — Vietnamese cities have extremely dense motorbike traffic, and crossing the street requires a specific technique (walk at a slow, steady, predictable pace and let motorbikes flow around you; stopping suddenly is more dangerous than continuing) that is worth explicitly demonstrating or describing to first-time visitors, since it feels counterintuitive. Temple/pagoda etiquette follows similar norms to the rest of SE Asia (modest dress, shoes off where indicated, quiet respectful behavior). The War Remnants Museum and Cu Chi Tunnels are historically and emotionally heavy sites covering the Vietnam War from the Vietnamese perspective — genuinely worthwhile for many travelers, but flag content intensity clearly for families with young children or clients sensitive to graphic historical material, and offer the alternative of skipping these in favor of a purely scenic/cultural itinerary if preferred. Bargaining is expected and normal at markets (not at fixed-price shops or restaurants) — a friendly, good-humored approach works far better than aggressive haggling.',
      },
      {
        title: 'Handling Common Client Objections',
        content:
          '"Isn\'t Vietnam just a war-history destination?" — reframe firmly: Ha Long Bay\'s natural scenery, Hoi An\'s lantern-lit old town and tailoring, and Da Nang\'s Golden Bridge are the current headline draws for most leisure travelers, with the war-history sites (Cu Chi Tunnels, War Remnants Museum) as optional additions rather than the core of the trip — this reframe alone resolves most hesitation. "We want value without feeling like we\'re compromising on quality" — lead with the 15–25% price advantage over Thailand/Bali for a comparable multi-city itinerary (Lesson 4), and note that the Ha Long Bay cruise upgrade is where extra budget is best spent for visible quality improvement. "Is it appropriate to bring young children to the War Remnants Museum?" — no strong opinion required; simply flag the content intensity honestly (Lesson 6) and offer to substitute a family-friendly alternative like the Cu Chi Tunnels\' shorter, less graphic sections or skip war-history sites in favor of Ben Thanh Market and the Golden Bridge instead. "The traffic looks terrifying in photos/videos" — acknowledge it\'s a real adjustment, then explain the "walk steady, let bikes flow around you" crossing technique from Lesson 6 — most first-time visitors adapt within a day and find it far more manageable in person than it appears on video. "We want to combine Vietnam with another country" — Vietnam pairs naturally with Thailand or Cambodia (Angkor Wat) for clients with 10+ days, both reachable via short regional flights from Ho Chi Minh City or Hanoi.',
      },
    ],
    quiz: [
      {
        text: 'A client wants to visit Hoi An in October for the best weather. What should you tell them?',
        options: [
          'October is the ideal month for central Vietnam',
          'Sep–Dec brings real typhoon and heavy-rain risk to central Vietnam (including Hoi An), which has caused past flooding — recommend Feb–May instead',
          'Vietnam has no seasonal weather risk anywhere',
          'October is only a problem in northern Vietnam, not central',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client assumes Vietnam has the same visa-free entry as Thailand. What is the correct correction?',
        options: [
          'Correct, both countries are visa-free for Indian passport holders',
          'Incorrect — Vietnam requires an e-visa applied for in advance; there is no visa-exempt option, unlike Thailand',
          'Correct, but only Vietnam requires payment on arrival',
          'Incorrect — Vietnam does not permit Indian tourists at all',
        ],
        correctIndex: 1,
      },
      {
        text: 'A family wants to combine Ha Long Bay with a relaxed pace, avoiding a rushed day trip. What is the correct recommendation and why?',
        options: [
          'A day trip from Hanoi is sufficient and faster',
          'An overnight cruise is recommended, since a day-trip-only visit feels rushed given the ~3.5-hr transfer each way',
          'Ha Long Bay cannot be visited from Hanoi at all',
          'Ha Long Bay requires a minimum 5-night stay',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client with young children is deciding between the War Remnants Museum and an alternative activity. What is the most appropriate guidance?',
        options: [
          'Insist they visit the War Remnants Museum regardless',
          'Flag that the site is historically and emotionally heavy, and offer Ben Thanh Market or the Golden Bridge as a family-friendlier alternative',
          'Tell them children are legally barred from the museum',
          'Recommend skipping Vietnam entirely',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client wants custom tailoring completed in Hoi An within a same-day layover. What should you advise?',
        options: [
          'This is fine, tailoring is always same-day with no extra time needed',
          'Fitting and pickup for custom tailoring typically needs at least a full extra day in Hoi An, so a same-day layover is too tight',
          'Tailoring is not available in Hoi An',
          'Tailoring can only be arranged from Hanoi',
        ],
        correctIndex: 1,
      },
      {
        text: 'What is the correct technique to advise first-time visitors for crossing streets in Vietnamese cities?',
        options: [
          'Run quickly across to avoid oncoming traffic',
          'Walk at a slow, steady, predictable pace and let motorbikes flow around you; stopping suddenly is more dangerous',
          'Wait for a complete gap in traffic before crossing',
          'Only cross at marked pedestrian crossings, which exist on every street',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client objects that "Vietnam is just a war-history destination." What is the most effective reframe from the lessons?',
        options: [
          'Agree, and suggest they skip Vietnam',
          'Point out that Ha Long Bay\'s scenery, Hoi An\'s lantern-lit old town and tailoring, and the Golden Bridge are the current headline draws, with war-history sites as optional additions',
          'Tell them all Vietnam tours are mandatory war-history tours',
          'Suggest they visit only Cambodia instead',
        ],
        correctIndex: 1,
      },
      {
        text: 'A value-conscious client is comparing Vietnam to Thailand for a similar multi-city itinerary. What is the accurate pricing comparison from the lessons?',
        options: [
          'Vietnam is typically 15–25% more expensive than Thailand',
          'Vietnam is typically priced 15–25% below Thailand/Bali for a comparable itinerary',
          'The two destinations are always identical in price',
          'Thailand is always cheaper regardless of itinerary',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client wants to travel efficiently from Hanoi to Ho Chi Minh City to cover both ends of the country in one trip. What is the correct guidance?',
        options: [
          'Overland travel is the fastest and standard option',
          'A domestic flight is the standard way to cover this distance efficiently — overland travel between these regions is a multi-day proposition, not realistic for a standard leisure itinerary',
          'These two cities cannot both be visited on one trip',
          'A direct international flight is required between them',
        ],
        correctIndex: 1,
      },
      {
        text: 'What should a consultant actively probe when quoting the Ha Long Bay portion of a trip, based on the lessons?',
        options: [
          'The client\'s preferred lunch menu',
          'Budget flexibility for the cruise boat/cabin category, since the boat experience defines the whole Ha Long segment and quality varies enormously by operator',
          'Whether the client owns a passport',
          'The client\'s shoe size for temple visits',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    title: 'Selling Europe (Multi-Country Highlights)',
    category: 'Europe',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Sphinx_et_Jungfrau_-_img_06980.jpg/960px-Sphinx_et_Jungfrau_-_img_06980.jpg',
    description:
      'A comprehensive brief on the classic France–Switzerland–Italy circuit — Schengen visa mechanics, seasonal pricing, hotel/tour formats, currency nuances, and objection-handling — for consultants selling this premium, high-ticket route.',
    lessons: [
      {
        title: 'Geography, Climate & Best Time to Visit',
        content:
          'The classic circuit spans three countries with genuinely different terrain and microclimates: France (Paris, temperate, four distinct seasons), Switzerland (mountainous, with alpine weather that can shift rapidly and differs sharply between lowland cities like Lucerne/Interlaken and high-altitude excursions like Jungfraujoch, where snow is possible even in summer), and Italy (Rome/Venice, Mediterranean-influenced, hotter and drier than France/Switzerland in summer). Overall best windows: Apr–Jun and Sep–Oct (mild temperatures, blooming/autumn scenery, meaningfully thinner crowds and lower prices than peak season). Jul–Aug is peak season — hot (Rome can exceed 35°C), crowded at every major sight (expect queues even with pre-booked tickets), and the most expensive time to travel, sometimes 50–80% above shoulder-season pricing. Winter (Nov–Mar) is a different, niche sell — Christmas markets in France/Switzerland and lower crowds, but some high-altitude excursions (Jungfraujoch) have reduced accessibility and Venice can experience acqua alta (seasonal flooding) primarily Oct–Jan.',
      },
      {
        title: 'Visa, Documentation & Currency',
        content:
          'All three countries are in the Schengen Area, so a single Schengen visa covers entry to France, Switzerland, and Italy on one trip. The application must be submitted through the embassy/consulate of the "country of main destination" (where the traveler will spend the most days) or, if days are evenly split, the country of first entry — getting this wrong is a common and serious error that can cause visa rejection, so always map out the exact day-by-day itinerary before advising which consulate to apply through. Processing is officially up to 15 working days but can extend during peak season (Apr–Aug applications), so advise clients to apply 4–6 weeks before travel, not the bare legal minimum. Required documents typically include: proof of accommodation for every night, a day-by-day itinerary, return flight bookings, travel insurance meeting Schengen\'s minimum coverage requirement (EUR 30,000 medical coverage), and proof of sufficient funds. Currency is a critical nuance: France and Italy use the Euro (EUR), but Switzerland uses the Swiss Franc (CHF) and is NOT in the Eurozone despite being in the Schengen visa area — some Swiss tourist businesses informally accept Euros but at unfavorable rates, so clients should carry or withdraw CHF specifically for the Switzerland leg.',
      },
      {
        title: 'Top Attractions & a Sample 9-Day Itinerary',
        content:
          'Paris: the Eiffel Tower (pre-book skip-the-line or summit access weeks ahead in peak season), the Louvre Museum (genuinely requires a half-day minimum; pre-booked timed entry is essential), a Seine river dinner cruise, and Disneyland Paris as an optional full-day add-on for families. Switzerland: Jungfraujoch ("Top of Europe," reached by a scenic cograilway from Interlaken — dress in layers, temperatures can be near freezing even in summer at the summit), Mount Titlis (a popular, slightly less expensive alternative with a revolving cable car), Lucerne (the Chapel Bridge and lakeside old town, ideal for a relaxed half-day), and Interlaken as the practical base town between the mountain excursions. Italy: Rome (the Colosseum and Roman Forum — pre-booked timed entry strongly recommended in peak season; Vatican City/Sistine Chapel as a separate, similarly timed-entry site), Venice (a gondola ride, St. Mark\'s Square, best explored on foot since it\'s a car-free city of canals and bridges), and the Leaning Tower of Pisa as a well-known but genuinely brief stop (most visitors spend under 2 hours here, plan the itinerary accordingly rather than a full day). Sample 9N/10D pace: Days 1–3 Paris; Day 4 travel to Switzerland; Days 5–6 Interlaken/Jungfraujoch/Lucerne; Day 7 travel to Italy; Days 8–9 Rome (or split Rome/Venice with an internal flight or fast train if the client wants both); Day 10 departure.',
      },
      {
        title: 'Flights, Transfers & Indicative Costs',
        content:
          'Direct flights from Delhi/Mumbai to major European hubs (Paris, Zurich, Frankfurt, Rome) run ~8–9 hrs; round-trip economy fares range widely by season, ₹45,000–₹65,000 in shoulder season and meaningfully higher in Jul–Aug peak — always requote close to booking given how much fares move. Intra-Europe travel on a multi-country circuit is typically by coach (the standard format for escorted group tours) or high-speed train (Paris–Zurich, Zurich–Milan/Venice routes are well-served and a good FIT alternative to coach travel). Package bands (per person, land only, twin-sharing, escorted coach tour format): 8N/9D France + Switzerland + Italy on a 3-star basis runs ₹1,40,000–₹1,80,000; a 10N/11D 4-star version with more free time and fewer forced early departures runs ₹1,90,000–₹2,40,000. Notable add-on costs: Jungfraujoch excursion ~₹9,000–₹11,000pp, Schengen visa fee (embassy fee plus service charges) ~₹7,000pp, Louvre/Vatican skip-the-line tickets ~₹2,000–₹3,000pp each. A couple booking the 10N/11D 4-star band at ₹2,20,000pp comes to roughly ₹4,40,000 total land cost for two, before flights and visa fees — always present the full all-in figure (land + flights + visa) upfront for Europe, since the gap between the headline package price and the true total is larger here than on any SE Asia route.',
      },
      {
        title: 'Accommodation & Tour Format Guide',
        content:
          'Escorted coach tours (the most-booked format for first-time Indian travelers to Europe): a fixed group itinerary, shared coach transport between cities, and hotels typically located on city outskirts (cheaper land, easier coach access) rather than city-center — set this expectation clearly, since clients picturing a hotel next to the Eiffel Tower are often surprised by a 20–30 min commute into central Paris each day. FIT (Free Independent Travel) itineraries: client-chosen hotels (often more central, at a price premium), point-to-point train travel instead of coach, and full schedule flexibility — this is a genuine premium upsell for repeat clients or those explicitly wanting a slower, more independent pace, but requires more upfront planning and is not the default recommendation for genuinely first-time European travelers who benefit from an escorted format\'s built-in logistics handling. Within either format, city-center hotels command a real premium in Paris, Rome, and Venice specifically (all three have constrained, historic cores), while Swiss mountain-town hotels (Interlaken, Lucerne) are comparatively more space-flexible. For Venice specifically, note that some "Venice" hotels are actually on the mainland (Mestre) rather than on the historic islands — confirm this explicitly, as it materially affects the experience.',
      },
      {
        title: 'Culture, Safety & Etiquette',
        content:
          'Western Europe is broadly safe for tourists, with the dominant real risk being pickpocketing and bag-snatching at high-density tourist sites and on public transport — the Eiffel Tower area, the Colosseum, Vatican queues, and Venice\'s St. Mark\'s Square are all known pickpocket hotspots, worth a direct, practical briefing (cross-body bags worn to the front, no back pockets, extra vigilance on the Metro/vaporetto). Dress codes matter at religious sites: the Vatican (Sistine Chapel, St. Peter\'s Basilica) strictly enforces covered shoulders and knees for all visitors regardless of gender, and will deny entry to those in violation — this catches summer travelers off guard more than any other single etiquette point on this route, so flag it explicitly and repeatedly. Tipping conventions differ by country: in France and Italy, a service charge is often already included in restaurant bills (check for "servizio incluso" in Italy), so additional tipping is modest (rounding up) rather than the 15–20% norm some Indian travelers expect from other markets; in Switzerland, tipping is even less customary given generally included service. Language: English is widely understood in major tourist areas and hotels across all three countries, though learning a few basic French/Italian/German phrases is appreciated and can smooth interactions in smaller towns.',
      },
      {
        title: 'Handling Common Client Objections',
        content:
          '"The package price seems much higher than we expected" — proactively walk through the full breakdown (land package + flights + Schengen visa fee + any skip-the-line add-ons) at the very first quote rather than letting the client discover the gap later; this route has the largest headline-vs-total gap of any destination in this training, so transparency here specifically prevents downstream dissatisfaction. "We want to see everything in 7 days" — be honest that a rushed circuit across three countries in a week means very early departures and minimal free time in each city; recommend either narrowing to two countries or extending to 9–10 nights for a more comfortable pace. "Why does the tour bus hotel feel far from the city center?" — this is a fair expectation-setting issue (Lesson 5) — address it before booking, not after, by explaining that outskirts hotels are standard for coach-tour economics and offer to price an FIT alternative with more central hotels if the client is willing to pay the premium and handle more independent logistics. "Our visa got rejected last time we tried Europe independently" — ask specifically which consulate they applied through and why; a very common rejection cause is applying through the wrong country\'s consulate relative to actual overnight distribution (Lesson 2) — as their consultant, you should map the itinerary and select the correct consulate for them this time. "Is Switzerland going to be confusing with a different currency?" — acknowledge it directly and advise withdrawing or exchanging CHF specifically before or upon arrival in Switzerland, rather than assuming Euros will work smoothly there.',
      },
    ],
    quiz: [
      {
        text: 'A client splits their 10-day trip as 5 nights in France and 5 nights in Italy, entering via Rome first. Which consulate should they apply through, and why?',
        options: [
          'France, because it is listed first in the itinerary name',
          'Since days are evenly split, they should apply through the country of first entry — Italy, since they enter via Rome',
          'Switzerland, since it is central to both countries',
          'It does not matter which consulate they use',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client assumes their Euros will work smoothly in Switzerland. What is the accurate correction?',
        options: [
          'Correct, Switzerland uses the Euro like France and Italy',
          'Incorrect — Switzerland uses the Swiss Franc (CHF) and is not in the Eurozone, despite being in the Schengen area; Euros are only informally accepted at unfavorable rates',
          'Correct, but only in Zurich',
          'Incorrect — Switzerland does not accept any foreign currency',
        ],
        correctIndex: 1,
      },
      {
        text: 'A couple books the 10N/11D 4-star package at ₹2,20,000pp. What is their approximate total land cost for two, before flights and visa fees?',
        options: ['₹2,20,000', '₹3,30,000', '₹4,40,000', '₹5,50,000'],
        correctIndex: 2,
      },
      {
        text: 'A client wants to see France, Switzerland, and Italy in just 7 days. What is the correct, honest guidance?',
        options: [
          'Approve it without caveats, 7 days is plenty',
          'Explain that a rushed 7-day circuit across three countries means very early departures and minimal free time; recommend narrowing to two countries or extending to 9–10 nights',
          'Tell them this is illegal under Schengen rules',
          'Recommend they skip Switzerland only',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client is surprised their coach-tour hotel in Paris is a 20–30 minute commute from the Eiffel Tower. What should have prevented this surprise?',
        options: [
          'Nothing could have prevented it',
          'Setting the expectation upfront that escorted coach-tour hotels are typically located on city outskirts for cheaper land and easier coach access, rather than city-center',
          'Booking a more expensive flight',
          'This only happens with budget airlines, not hotels',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client plans a summer visit to the Vatican in shorts and a sleeveless top. What should you tell them in advance?',
        options: [
          'This is fine, there is no dress code',
          'The Vatican strictly enforces covered shoulders and knees for all visitors regardless of gender, and will deny entry to those in violation',
          'Only men need to follow a dress code there',
          'The dress code only applies during winter',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client asks why their previous independent Europe trip had its Schengen visa rejected. Based on the lessons, what is the most likely cause to investigate first?',
        options: [
          'They applied too early',
          'They likely applied through the wrong country\'s consulate relative to their actual overnight distribution across countries',
          'They used the wrong currency to pay the visa fee',
          'They booked economy class flights',
        ],
        correctIndex: 1,
      },
      {
        text: 'Which of the following is the most accurate statement about tipping in France and Italy?',
        options: [
          'A 15–20% tip is always expected regardless of the bill',
          'A service charge is often already included in restaurant bills, so additional tipping is typically modest (rounding up) rather than a large percentage',
          'Tipping is illegal in both countries',
          'Only cash tips are accepted, cards cannot include a tip',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client wants to visit Jungfraujoch in July and asks if they need warm clothing. What is the accurate answer?',
        options: [
          'No, July is guaranteed warm at the summit',
          'Yes — Jungfraujoch is high-altitude and temperatures can be near freezing even in summer, so layers are recommended regardless of the season at lower elevations',
          'Warm clothing is only needed in winter months',
          'The summit is enclosed and climate-controlled, so no warm clothing is needed',
        ],
        correctIndex: 1,
      },
      {
        text: 'A client wants to know the biggest practical risk to plan around at major European tourist sites like the Colosseum and St. Mark\'s Square. What is the accurate answer from the lessons?',
        options: [
          'Violent crime',
          'Pickpocketing and bag-snatching in high-density tourist areas and on public transport',
          'Food safety issues',
          'Extreme weather events',
        ],
        correctIndex: 1,
      },
    ],
  },
];
