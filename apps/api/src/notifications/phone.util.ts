// Seeded/entered phone numbers are inconsistently formatted across the app
// (e.g. "9000000001" vs "+91-98765-43210") — this strips everything but digits
// so numbers can be compared/sent regardless of punctuation or a leading "+".
// Used both for the outbound "to" field Meta's Cloud API expects (digits only,
// country code, no "+") and for suffix-matching an inbound webhook's "from"
// against Lead.phone.
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
