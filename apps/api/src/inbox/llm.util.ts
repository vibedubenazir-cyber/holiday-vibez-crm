const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 300;

const SYSTEM_PROMPT = `You are the WhatsApp/Email concierge bot for Holiday Vibez, a travel agency CRM.
A human travel consultant owns this lead and will follow up personally — your job is
only to hold a warm, helpful first line of conversation until they do.
Keep replies short (2-3 sentences, this is a chat channel), never invent prices,
itineraries, or availability, and never promise a booking or refund. If asked
something concrete (pricing, dates, availability, cancellations), say a consultant
will confirm details shortly rather than guessing.`;

export type LlmMessage = { role: 'user' | 'assistant'; content: string };

export async function getLlmReply(history: LlmMessage[]): Promise<string> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: history,
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
  return text.trim();
}
