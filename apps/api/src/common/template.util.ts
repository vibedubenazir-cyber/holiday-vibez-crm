// Templates are seeded/authored with {{name}}/{{destination}}-style placeholders
// (see prisma/seed.ts), but nothing ever substituted them — customers received
// the literal "{{name}}" text. This is the minimal fix: replace known tokens
// with the matching value, leaving any unrecognized token untouched.
export function interpolateTemplate(text: string | null | undefined, vars: Record<string, string>): string | undefined {
  if (!text) return text ?? undefined;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => vars[key] ?? match);
}
