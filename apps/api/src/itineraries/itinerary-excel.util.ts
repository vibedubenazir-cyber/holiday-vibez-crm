import ExcelJS from 'exceljs';
import { Response } from 'express';

interface PricingLineItem {
  type: string;
  name: string;
  net: number;
  markupPct: number;
  gross: number;
}

interface PricingOptionTotals {
  label: string;
  lineItems: PricingLineItem[];
  subtotalGross: number;
  baseMarkupPct: number;
  baseMarkupAmount: number;
  extraMarkupAmount: number;
  discountAmount: number;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
  tcsPct: number;
  totalIncludingGst: number;
}

// One sheet per pricing option, mirroring the Pricing tab's own table so the
// export matches exactly what staff see on screen — same computation, no
// separate re-derivation.
export async function streamPricingSummaryExcel(res: Response, refNo: string, options: PricingOptionTotals[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  for (const option of options) {
    const sheet = workbook.addWorksheet(option.label.slice(0, 31));
    sheet.columns = [
      { header: 'Item', key: 'name', width: 32 },
      { header: 'Type', key: 'type', width: 16 },
      { header: 'Net (INR)', key: 'net', width: 14 },
      { header: 'Markup %', key: 'markupPct', width: 12 },
      { header: 'Gross (INR)', key: 'gross', width: 14 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const line of option.lineItems) {
      sheet.addRow({ name: line.name, type: line.type, net: line.net, markupPct: line.markupPct, gross: line.gross });
    }
    sheet.addRow({});
    sheet.addRow({ name: 'Subtotal', gross: option.subtotalGross });
    sheet.addRow({ name: `Base Markup (${option.baseMarkupPct}%)`, gross: option.baseMarkupAmount });
    sheet.addRow({ name: 'Extra Markup', gross: option.extraMarkupAmount });
    sheet.addRow({ name: 'Discount', gross: -option.discountAmount });
    sheet.addRow({ name: `CGST (${option.cgstPct}%) / SGST (${option.sgstPct}%) / IGST (${option.igstPct}%) / TCS (${option.tcsPct}%)` });
    const totalRow = sheet.addRow({ name: 'Total Including GST', gross: option.totalIncludingGst });
    totalRow.font = { bold: true };
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="itinerary-${refNo}-pricing.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}
