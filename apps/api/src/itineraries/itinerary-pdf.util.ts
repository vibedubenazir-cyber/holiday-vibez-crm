import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getClient, isS3Configured } from '../storage/s3.util';

// __dirname at runtime is apps/api/dist/itineraries; apps/api/uploads (the
// same directory storage.controller.ts writes to and main.ts serves at
// /uploads/*) is two levels up. Railway's start command runs
// `node apps/api/dist/main.js` from the repo root, so process.cwd() there is
// the repo root, not apps/api/ — resolving against cwd silently looked in a
// directory that doesn't exist, so every local-disk-stored image was skipped.
const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads');

const BRAND_BLUE = '#005aaa';
const SLATE = '#334155';
const SLATE_LIGHT = '#64748b';
const MARGIN_X = 48;
const PAGE_BOTTOM_LIMIT = 780;

interface PdfEvent {
  type: string;
  name: string;
  destination?: string | null;
  date?: string | Date | null;
  endDate?: string | Date | null;
  description?: string | null;
  photoUrl?: string | null;
  // Prisma hands this back as JsonValue; narrowed at the point of use rather
  // than forcing every caller to cast.
  details?: unknown;
}

interface PdfDay {
  dayNumber: number;
  date?: string | Date | null;
  events: PdfEvent[];
}

interface PdfAccommodation {
  id: string;
  name: string;
  destination?: string | null;
  date?: string | Date | null;
  endDate?: string | Date | null;
  photoUrl?: string | null;
  description?: string | null;
  details?: unknown;
}

interface PdfPricingOption {
  label: string;
  totalIncludingGst: number;
  accommodations?: PdfAccommodation[];
}

interface PdfPackageTerms {
  bookingAndPayment?: string | null;
  pricingAndInclusions?: string | null;
  cancellationsAndRefunds?: string | null;
  liability?: string | null;
  bookingAndPaymentTitle?: string | null;
  pricingAndInclusionsTitle?: string | null;
  cancellationsAndRefundsTitle?: string | null;
  liabilityTitle?: string | null;
}

export interface ItineraryPdfInput {
  refNo: string;
  title: string;
  destinations: string[];
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  adultsCount: number;
  childrenCount: number;
  infantsCount: number;
  coverPhotoUrl?: string | null;
  days: PdfDay[];
  pricingOptions: PdfPricingOption[];
  packageTerms?: PdfPackageTerms | null;
}

// Remote images are re-used heavily inside one document (the same flight photo
// can appear on three days) and again across every regeneration of the same
// itinerary. Without a cache each render re-downloads all of them, which is
// both slow and enough to get rate-limited — Wikimedia Commons, the source
// this project already uses for demo imagery, starts returning 429 partway
// through and the images then vanish from the PDF. Cache by URL, bounded so a
// long-lived process can't grow without limit.
const imageCache = new Map<string, Buffer>();
const IMAGE_CACHE_LIMIT = 200;

// Many hosts (Commons among them) throttle or reject requests that don't
// identify themselves, so send a real User-Agent rather than Node's default.
const IMAGE_FETCH_HEADERS = { 'User-Agent': 'HolidayVibezCRM/1.0 (itinerary PDF renderer)' };

// Fetches image bytes for pdfkit's doc.image(), which needs a Buffer rather
// than a URL — handles both the S3 (absolute URL) and local-disk fallback
// (`/uploads/...`, same directory storage.controller.ts writes to) storage
// modes. Returns null (never throws) so a broken/missing image just gets
// skipped rather than failing the whole PDF, but logs why so a systematically
// failing source isn't invisible.
async function loadImageBuffer(url: string | null | undefined): Promise<Buffer | null> {
  if (!url) return null;

  const cached = imageCache.get(url);
  if (cached) return cached;

  let buffer: Buffer;
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const res = await fetch(url, { headers: IMAGE_FETCH_HEADERS });
      if (!res.ok) {
        console.warn(`[itinerary-pdf] image fetch failed (${res.status}) — skipping: ${url}`);
        return null;
      }
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      // Relative "/uploads/:key" — resolves to local disk when the app is
      // running off local-disk storage, or to the S3-compatible bucket when
      // OBJECT_STORAGE_* is configured (a Railway Bucket has no public-read
      // mode, so uploads never touch disk in that mode — see s3.util.ts).
      const key = url.replace(/^\/uploads\//, '');
      if (isS3Configured()) {
        const res = await getClient().send(
          new GetObjectCommand({ Bucket: process.env.OBJECT_STORAGE_BUCKET!, Key: key }),
        );
        const chunks: Buffer[] = [];
        for await (const chunk of res.Body as AsyncIterable<Buffer>) chunks.push(chunk);
        buffer = Buffer.concat(chunks);
      } else {
        buffer = await readFile(join(UPLOADS_DIR, key));
      }
    }
  } catch (err) {
    console.warn(`[itinerary-pdf] image load failed — skipping: ${url}`, err);
    return null;
  }

  // Source photos are often multi-megapixel; the largest box any of them
  // renders into is the ~500pt cover, so 900px wide keeps them sharp at print
  // resolution while cutting the document from megabytes to WhatsApp-friendly
  // size. Flatten first so transparent PNGs don't turn black in JPEG.
  try {
    buffer = await sharp(buffer)
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize({ width: 900, withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    console.warn(`[itinerary-pdf] image resize failed — embedding original: ${url}`, err);
  }

  if (imageCache.size >= IMAGE_CACHE_LIMIT) {
    imageCache.delete(imageCache.keys().next().value as string);
  }
  imageCache.set(url, buffer);
  return buffer;
}

// Mirrors ItineraryReport.tsx's splitTermsClauses: package terms are free
// text that's sometimes one clause per line, sometimes "·"-separated within
// a line (or both), sometimes plain sentences — split each line on "·" first
// so every item gets its own bullet, matching the bulleted client report
// instead of printing one dense paragraph.
function splitTermsClauses(text: string): string[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const clauses = lines.flatMap((line) => (line.includes('·') ? line.split('·').map((c) => c.trim()).filter(Boolean) : [line]));
  if (clauses.length > 1) return clauses;
  return text.split(/(?<=[.!?])\s+(?=[A-Z(])/).map((c) => c.trim()).filter(Boolean);
}

// The Build tab's description/terms fields carry markdown-lite formatting
// from FormattedTextArea (**bold**, "• " line prefixes — see ItineraryReport.tsx's
// matching renderFormatted/stripBulletGlyph). pdfkit can't easily mix bold
// runs into a single wrapped text() call, so bold markers are dropped rather
// than rendered; the leading bullet glyph is dropped too since clause lines
// already get their own drawn "•" a few lines below.
function stripFormatting(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/^[•\-*]\s+/, '');
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
};

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => HTML_ENTITIES[m] ?? m);
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

// Package Terms are edited with a real WYSIWYG editor (RichTextEditor,
// apps/web) and saved as HTML — pdfkit has no HTML renderer, so this pulls
// out just the structure it can reproduce (one clause per <li>, or one per
// <p> when there's no list) and drops all inline formatting (bold/italic/
// links/color), matching the same plain-text trade-off stripFormatting()
// already makes for markdown-lite content elsewhere in this file.
function htmlToClauses(html: string): string[] {
  const items = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).map((m) => stripTags(m[1])).filter(Boolean);
  if (items.length) return items;
  const paras = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((m) => stripTags(m[1])).filter(Boolean);
  if (paras.length) return paras;
  const plain = stripTags(html);
  return plain ? [plain] : [];
}

function formatDate(value?: string | Date | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// pdfkit's built-in fonts (Helvetica et al) encode text as WinAnsi, which
// silently mangles anything outside that set — an arrow typed into an event
// name came out as "!'" in the rendered PDF. Map the characters consultants
// realistically paste in to close WinAnsi equivalents, then drop whatever is
// still unencodable rather than emitting garbage bytes. Em/en dashes, curly
// quotes and the middot are all already in WinAnsi and pass through untouched.
const GLYPH_FALLBACKS: Record<string, string> = {
  '→': '->', '←': '<-', '↔': '<->', '⇒': '=>', '➔': '->', '➜': '->',
  '₹': 'INR ', '•': '·', '…': '...', '™': '(TM)', '≈': '~', '×': 'x',
  ' ': ' ', ' ': ' ', '​': '',
};

function winAnsi(text: string): string {
  let out = '';
  for (const ch of text) {
    const mapped = GLYPH_FALLBACKS[ch];
    if (mapped !== undefined) {
      out += mapped;
      continue;
    }
    // WinAnsi covers Latin-1 plus a handful of typographic codepoints in the
    // 0x80–0x9F block; everything else would render as a wrong glyph.
    const code = ch.codePointAt(0)!;
    out += code <= 0xff || '‚ƒ„†‡ˆ‰Š‹ŒŽ‘’“”–—˜š›œžŸ'.includes(ch) ? ch : '';
  }
  return out;
}

// Rich, photo-heavy, day-sectioned report — unlike common/pdf.util.ts's
// streamBrandedPdf (built for a flat row-table document), this needs manual
// pagination since day/event count varies a lot per itinerary.
export async function streamItineraryPdf(res: Response, plan: ItineraryPdfInput): Promise<void> {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${plan.refNo}.pdf"`);
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - MARGIN_X * 2;

  const ensureSpace = (y: number, needed: number): number => {
    if (y + needed > PAGE_BOTTOM_LIMIT) {
      doc.addPage();
      return 40;
    }
    return y;
  };

  // Header bar
  doc.rect(0, 0, pageWidth, 90).fill(BRAND_BLUE);
  doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('Holiday Vibez', MARGIN_X, 28);
  doc.fontSize(9).font('Helvetica').fillColor('#dbeafe').text(`Package ID: #${plan.refNo}`, pageWidth - 220, 32, { width: 172, align: 'right' });

  let y = 110;
  doc.fontSize(18).font('Helvetica-Bold').fillColor(SLATE).text(winAnsi(plan.title), MARGIN_X, y, { width: contentWidth });
  y += 28;
  doc.fontSize(10).font('Helvetica').fillColor(SLATE_LIGHT).text(
    winAnsi(`${plan.destinations.join(', ')}  ·  Adults: ${plan.adultsCount}  Children: ${plan.childrenCount}  Infants: ${plan.infantsCount}  ·  ${formatDate(plan.startDate)} – ${formatDate(plan.endDate)}`),
    MARGIN_X,
    y,
    { width: contentWidth },
  );
  y += 24;

  const coverBuffer = await loadImageBuffer(plan.coverPhotoUrl);
  if (coverBuffer) {
    y = ensureSpace(y, 230);
    doc.save();
    doc.roundedRect(MARGIN_X, y, contentWidth, 220, 8).clip();
    doc.image(coverBuffer, MARGIN_X, y, { cover: [contentWidth, 220], align: 'center', valign: 'center' });
    doc.restore();
    y += 232;
  }

  // Pricing options summary
  if (plan.pricingOptions.length) {
    y = ensureSpace(y, 24);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND_BLUE).text('Pricing Options', MARGIN_X, y);
    y += 18;
    for (const option of plan.pricingOptions) {
      y = ensureSpace(y, 16);
      doc.fontSize(10).font('Helvetica').fillColor(SLATE).text(winAnsi(option.label), MARGIN_X, y, { width: contentWidth * 0.6 });
      doc.font('Helvetica-Bold').text(`INR ${option.totalIncludingGst.toLocaleString('en-IN')}`, MARGIN_X + contentWidth * 0.6, y, {
        width: contentWidth * 0.4,
        align: 'right',
      });
      y += 16;
    }
    y += 10;
  }

  // Hotels — one card per distinct property across all pricing options,
  // deduped by id so a hotel shared between Option 1 and Option 2 doesn't
  // print twice. Mirrors the web report's Hotels section.
  const hotels = Array.from(
    new Map(plan.pricingOptions.flatMap((o) => o.accommodations ?? []).map((a) => [a.id, a])).values(),
  );
  if (hotels.length) {
    y = ensureSpace(y, 24);
    doc.fontSize(14).font('Helvetica-Bold').fillColor(BRAND_BLUE).text('Hotels', MARGIN_X, y);
    y += 22;

    for (const hotel of hotels) {
      const photoBuffer = await loadImageBuffer(hotel.photoUrl);
      const textX = photoBuffer ? MARGIN_X + 164 : MARGIN_X;
      const textWidth = photoBuffer ? contentWidth - 164 : contentWidth;
      const details = hotel.details as { hotelCategory?: number; roomName?: string; mealPlan?: string } | null | undefined;
      const stars = Number(details?.hotelCategory ?? 0);
      const nameLine = stars >= 1 ? `${hotel.name}  (${Math.min(5, Math.round(stars))} Star)` : hotel.name;
      const factLine = [hotel.destination, details?.roomName, details?.mealPlan, hotel.date && hotel.endDate ? `${formatDate(hotel.date)} - ${formatDate(hotel.endDate)}` : null]
        .filter(Boolean)
        .join('  ·  ');
      const description = hotel.description ? stripFormatting(hotel.description) : '';

      // The photo frame is a fixed 100pt, but description text can run much
      // longer — measure the actual text stack height (pdfkit has no
      // "shrink to fit" mode) so the block reserves enough room and the next
      // hotel/day banner doesn't get drawn on top of unfinished text.
      let textBlockHeight = doc.fontSize(10).font('Helvetica-Bold').heightOfString(winAnsi(nameLine), { width: textWidth }) + 4;
      if (factLine) textBlockHeight += doc.fontSize(8).font('Helvetica').heightOfString(winAnsi(factLine), { width: textWidth }) + 4;
      if (description) textBlockHeight += doc.fontSize(9).font('Helvetica').heightOfString(winAnsi(description), { width: textWidth }) + 4;
      const blockHeight = Math.max(photoBuffer ? 100 : 0, textBlockHeight);
      y = ensureSpace(y, blockHeight + 10);

      if (photoBuffer) {
        doc.save();
        doc.roundedRect(MARGIN_X, y, 150, 100, 6).clip();
        doc.image(photoBuffer, MARGIN_X, y, { cover: [150, 100], align: 'center', valign: 'center' });
        doc.restore();
      }
      doc.fontSize(10).font('Helvetica-Bold').fillColor(SLATE).text(winAnsi(nameLine), textX, y, { width: textWidth });
      let ty = y + doc.heightOfString(winAnsi(nameLine), { width: textWidth }) + 4;
      if (factLine) {
        doc.fontSize(8).font('Helvetica').fillColor(SLATE_LIGHT).text(winAnsi(factLine), textX, ty, { width: textWidth });
        ty += doc.heightOfString(winAnsi(factLine), { width: textWidth }) + 4;
      }
      if (description) {
        doc.fontSize(9).font('Helvetica').fillColor(SLATE).text(winAnsi(description), textX, ty, { width: textWidth });
      }
      y += blockHeight + 10;
    }
    y += 6;
  }

  // Day-by-day itinerary
  y = ensureSpace(y, 24);
  doc.fontSize(14).font('Helvetica-Bold').fillColor(BRAND_BLUE).text('Detailed Itinerary', MARGIN_X, y);
  y += 22;

  for (const day of plan.days) {
    y = ensureSpace(y, 28);
    doc.rect(MARGIN_X, y, contentWidth, 22).fill(BRAND_BLUE);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text(`Day ${day.dayNumber} — ${formatDate(day.date)}`, MARGIN_X + 8, y + 6);
    y += 32;

    for (const event of day.events) {
      const photoBuffer = await loadImageBuffer(event.photoUrl);
      const textX = photoBuffer ? MARGIN_X + 164 : MARGIN_X;
      const textWidth = photoBuffer ? contentWidth - 164 : contentWidth;
      const eventDetails = event.details as { hotelCategory?: number | null; roomName?: string | null; mealPlan?: string | null } | null | undefined;
      // "★" isn't in WinAnsi and would be stripped by winAnsi(), so the
      // star rating the web report shows becomes a text suffix here.
      const stars = Number(eventDetails?.hotelCategory ?? 0);
      const nameLine = stars >= 1 ? `${event.name}  (${Math.min(5, Math.round(stars))} Star)` : event.name;
      // Accommodation events carry their room/meal/stay-dates in `details`
      // rather than `destination`/`description` alone — without this line
      // an option-2/3 hotel with no free-text description rendered as just
      // a bare name, which read as "the hotel isn't showing properly".
      const factLine =
        event.type === 'ACCOMMODATION'
          ? [event.destination, eventDetails?.roomName, eventDetails?.mealPlan, event.date && event.endDate ? `${formatDate(event.date)} - ${formatDate(event.endDate)}` : null]
              .filter(Boolean)
              .join('  ·  ')
          : event.destination ?? '';
      const description = event.description ? stripFormatting(event.description) : '';

      // Fixed-height blocks (110/46) didn't account for real text length, so
      // long descriptions (e.g. a sightseeing highlights list) overflowed
      // into the next event or the next day's banner. Measure the actual
      // text stack instead, matching the fix applied to the Hotels section.
      let textBlockHeight = doc.fontSize(10).font('Helvetica-Bold').heightOfString(winAnsi(nameLine), { width: textWidth }) + 4;
      if (factLine) textBlockHeight += doc.fontSize(8).font('Helvetica').heightOfString(winAnsi(factLine), { width: textWidth }) + 4;
      if (description) textBlockHeight += doc.fontSize(9).font('Helvetica').heightOfString(winAnsi(description), { width: textWidth }) + 4;
      const blockHeight = Math.max(photoBuffer ? 100 : 0, textBlockHeight);
      y = ensureSpace(y, blockHeight + 10);

      if (photoBuffer) {
        // `cover` scales to fill the box but doesn't crop on its own, so clip
        // to a rounded rect — gives a proper landscape photo card instead of
        // the old letterboxed 80px square.
        doc.save();
        doc.roundedRect(MARGIN_X, y, 150, 100, 6).clip();
        doc.image(photoBuffer, MARGIN_X, y, { cover: [150, 100], align: 'center', valign: 'center' });
        doc.restore();
      }
      doc.fontSize(10).font('Helvetica-Bold').fillColor(SLATE).text(winAnsi(nameLine), textX, y, { width: textWidth });
      let ty = y + doc.heightOfString(winAnsi(nameLine), { width: textWidth }) + 4;
      if (factLine) {
        doc.fontSize(8).font('Helvetica').fillColor(SLATE_LIGHT).text(winAnsi(factLine), textX, ty, { width: textWidth });
        ty += doc.heightOfString(winAnsi(factLine), { width: textWidth }) + 4;
      }
      if (description) {
        doc.fontSize(9).font('Helvetica').fillColor(SLATE).text(winAnsi(description), textX, ty, { width: textWidth });
      }
      y += blockHeight + 10;
    }
    y += 6;
  }

  // Package terms
  if (plan.packageTerms) {
    const sections: [string, string | null | undefined][] = [
      [plan.packageTerms.bookingAndPaymentTitle ?? 'Booking and Payment', plan.packageTerms.bookingAndPayment],
      [plan.packageTerms.pricingAndInclusionsTitle ?? 'Pricing and Inclusions', plan.packageTerms.pricingAndInclusions],
      [plan.packageTerms.cancellationsAndRefundsTitle ?? 'Cancellations and Refunds', plan.packageTerms.cancellationsAndRefunds],
      [plan.packageTerms.liabilityTitle ?? 'Liability', plan.packageTerms.liability],
    ];
    for (const [heading, body] of sections) {
      if (!body) continue;
      y = ensureSpace(y, 40);
      doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND_BLUE).text(heading, MARGIN_X, y);
      y += 16;

      const clauses = looksLikeHtml(body) ? htmlToClauses(body) : splitTermsClauses(body);
      doc.fontSize(9).font('Helvetica').fillColor(SLATE);
      if (clauses.length <= 1) {
        const cleanBody = stripFormatting(clauses[0] ?? body);
        const textHeight = doc.heightOfString(winAnsi(cleanBody), { width: contentWidth });
        y = ensureSpace(y, textHeight + 12);
        doc.text(winAnsi(cleanBody), MARGIN_X, y, { width: contentWidth });
        y += textHeight + 16;
      } else {
        const bulletIndent = 12;
        const bulletWidth = contentWidth - bulletIndent;
        for (const rawClause of clauses) {
          const clause = stripFormatting(rawClause);
          const clauseHeight = doc.heightOfString(winAnsi(clause), { width: bulletWidth });
          y = ensureSpace(y, clauseHeight + 6);
          doc.text('•', MARGIN_X, y, { width: bulletIndent });
          doc.text(winAnsi(clause), MARGIN_X + bulletIndent, y, { width: bulletWidth });
          y += clauseHeight + 6;
        }
        y += 10;
      }
    }
  }

  doc.end();
}
