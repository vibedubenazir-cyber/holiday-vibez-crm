import { GenerateItineraryDraftDto } from './dto/itinerary-plan.dto';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-5';
// Draft itineraries run several days × several events each — the Inbox bot's
// 300-token chat-reply budget isn't remotely enough for structured JSON output
// at this size.
const MAX_TOKENS = 4000;

const EVENT_TYPES = ['ACCOMMODATION', 'ACTIVITY', 'TRANSPORTATION', 'VISA', 'MEAL', 'FLIGHT', 'LEISURE', 'CRUISE'];

const SYSTEM_PROMPT = `You are a travel itinerary drafting assistant for Holiday Vibez, a travel agency CRM.
Given a trip brief, produce a day-by-day draft itinerary as the consultant's starting point — they will
review and refine every field afterward, so favor plausible, concrete detail over hedging.

Respond with ONLY a single JSON object (no markdown fences, no commentary) matching exactly this shape:
{
  "title": string,
  "days": [
    {
      "dayNumber": number,
      "date": string (YYYY-MM-DD),
      "events": [
        { "type": one of ${JSON.stringify(EVENT_TYPES)}, "name": string, "destination": string, "description": string }
      ]
    }
  ]
}
Include exactly one day object per calendar day of the trip, in order starting at dayNumber 1. Every day should
have at least one ACCOMMODATION or ACTIVITY event. Do not invent prices or numeric costs anywhere.`;

export interface GeneratedItineraryEvent {
  type: string;
  name: string;
  destination?: string;
  description?: string;
}

export interface GeneratedItineraryDay {
  dayNumber: number;
  date: string;
  events: GeneratedItineraryEvent[];
}

export interface GeneratedItinerary {
  title: string;
  days: GeneratedItineraryDay[];
}

function dayCount(startDate: string, endDate: string): number {
  const nights = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000);
  return Math.max(1, nights + 1);
}

function buildUserPrompt(input: GenerateItineraryDraftDto): string {
  const lines = [
    `Destinations: ${input.destinations.join(', ')}`,
    `Dates: ${input.startDate} to ${input.endDate}`,
    `Travelers: ${input.adultsCount ?? 1} adult(s), ${input.childrenCount ?? 0} child(ren)`,
  ];
  if (input.theme) lines.push(`Theme: ${input.theme}`);
  if (input.sightseeing) lines.push(`Sightseeing preferences: ${input.sightseeing}`);
  if (input.hotel) lines.push(`Preferred hotel: ${input.hotel}`);
  if (input.hotelCategory) lines.push(`Hotel category: ${input.hotelCategory}`);
  if (input.transport) lines.push(`Transport preference: ${input.transport}`);
  if (input.transportType) lines.push(`Transport type: ${input.transportType}`);
  if (input.mealPlan) lines.push(`Meal plan: ${input.mealPlan}`);
  if (input.pickupCity) lines.push(`Pickup city: ${input.pickupCity}`);
  if (input.budget) lines.push(`Budget: ${input.budget}`);
  if (input.notes) lines.push(`Notes: ${input.notes}`);
  if (input.freeText) lines.push(`Trip plan description: ${input.freeText}`);
  return lines.join('\n');
}

// Strict, validation-only — this is the "start manually instead" boundary:
// if the model's output doesn't match what a real itinerary needs, the caller
// surfaces the error rather than persisting a partial/garbled draft.
function parseAndValidate(raw: string, expectedDayCount: number): GeneratedItinerary {
  const stripped = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error('AI response was not valid JSON');
  }
  const draft = parsed as Partial<GeneratedItinerary>;
  if (!draft.title || !Array.isArray(draft.days) || draft.days.length === 0) {
    throw new Error('AI response is missing a title or day list');
  }
  if (draft.days.length !== expectedDayCount) {
    throw new Error(`AI returned ${draft.days.length} days, expected ${expectedDayCount}`);
  }
  for (const day of draft.days) {
    if (typeof day.dayNumber !== 'number' || !Array.isArray(day.events)) {
      throw new Error('AI response has a malformed day entry');
    }
    for (const event of day.events) {
      if (!event.type || !EVENT_TYPES.includes(event.type) || !event.name) {
        throw new Error(`AI response has an invalid event: ${JSON.stringify(event)}`);
      }
    }
  }
  return draft as GeneratedItinerary;
}

export async function generateItineraryDraft(input: GenerateItineraryDraftDto): Promise<GeneratedItinerary> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured — Create via AI is unavailable, use + Add New instead');
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Anthropic API error: ${JSON.stringify(body)}`);
  }
  const text = body.content?.find((block: { type: string }) => block.type === 'text')?.text;
  if (!text) {
    throw new Error(`Anthropic API returned no text content: ${JSON.stringify(body)}`);
  }

  return parseAndValidate(text, dayCount(input.startDate, input.endDate));
}
