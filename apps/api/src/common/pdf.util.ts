import PDFDocument from 'pdfkit';
import { Response } from 'express';

const BRAND_BLUE = '#005aaa';
const SLATE = '#334155';
const SLATE_LIGHT = '#64748b';

interface CompanyInfo {
  name: string;
  address: string;
  gstNumber: string;
  email: string;
  phone: string;
}

interface DocumentRow {
  label: string;
  value: string;
}

interface PdfDocumentOptions {
  title: string;
  refNo: string;
  issuedAt: Date;
  company: CompanyInfo;
  client: { name: string; phone: string; email?: string | null; destination: string; destinationLabel?: string };
  clientSectionLabel?: string;
  rows: DocumentRow[];
  total?: { label: string; value: string };
  footerNote?: string;
}

// Shared renderer for every customer-facing PDF (invoice, voucher) so the
// branded layout — blue header bar, client block, row table, totals — only
// has to be built once. Streams directly into the HTTP response rather than
// buffering the whole file in memory.
export function streamBrandedPdf(res: Response, opts: PdfDocumentOptions) {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${opts.refNo}.pdf"`);
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const marginX = 48;

  // Header bar
  doc.rect(0, 0, pageWidth, 110).fill(BRAND_BLUE);
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text(opts.company.name, marginX, 32);
  doc.fontSize(9).font('Helvetica').fillColor('#dbeafe');
  const companyLines = [opts.company.address, [opts.company.gstNumber && `GSTIN: ${opts.company.gstNumber}`, opts.company.email, opts.company.phone].filter(Boolean).join('  ·  ')].filter(Boolean);
  doc.text(companyLines.join('\n'), marginX, 60, { width: pageWidth - marginX * 2 - 180 });

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#ffffff').text(opts.title, pageWidth - 220, 32, { width: 172, align: 'right' });
  doc.fontSize(9).font('Helvetica').fillColor('#dbeafe').text(`No. ${opts.refNo}`, pageWidth - 220, 56, { width: 172, align: 'right' });
  doc.text(opts.issuedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), pageWidth - 220, 70, { width: 172, align: 'right' });

  // Client block
  let y = 140;
  doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND_BLUE).text(opts.clientSectionLabel ?? 'BILLED TO', marginX, y);
  y += 14;
  doc.fontSize(11).font('Helvetica-Bold').fillColor(SLATE).text(opts.client.name, marginX, y);
  y += 16;
  doc.fontSize(9).font('Helvetica').fillColor(SLATE_LIGHT).text(
    [opts.client.phone, opts.client.email].filter(Boolean).join('  ·  '),
    marginX,
    y,
  );
  y += 13;
  doc.text(`${opts.client.destinationLabel ?? 'Destination'}: ${opts.client.destination}`, marginX, y);
  y += 30;

  // Row table
  const tableWidth = pageWidth - marginX * 2;
  doc.moveTo(marginX, y).lineTo(pageWidth - marginX, y).strokeColor('#e2e8f0').stroke();
  y += 12;
  for (const row of opts.rows) {
    doc.fontSize(10).font('Helvetica').fillColor(SLATE_LIGHT).text(row.label, marginX, y, { width: tableWidth * 0.6 });
    doc.font('Helvetica-Bold').fillColor(SLATE).text(row.value, marginX + tableWidth * 0.6, y, { width: tableWidth * 0.4, align: 'right' });
    y += 20;
  }

  if (opts.total) {
    y += 8;
    doc.moveTo(marginX, y).lineTo(pageWidth - marginX, y).strokeColor('#cbd5e1').stroke();
    y += 12;
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND_BLUE).text(opts.total.label, marginX, y, { width: tableWidth * 0.6 });
    doc.text(opts.total.value, marginX + tableWidth * 0.6, y, { width: tableWidth * 0.4, align: 'right' });
    y += 26;
  }

  if (opts.footerNote) {
    doc.fontSize(8).font('Helvetica').fillColor(SLATE_LIGHT).text(opts.footerNote, marginX, doc.page.height - 80, { width: tableWidth });
  }

  doc.end();
}
