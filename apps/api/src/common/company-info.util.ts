import { PrismaService } from '../prisma.service';

const COMPANY_SETTING_KEYS = ['company_name', 'company_address', 'gst_number', 'contact_email', 'contact_phone', 'company_logo_url'];

// Shared by every public customer-facing document (quotation/voucher/invoice
// view pages) so the branded header logic lives in exactly one place.
export async function getPublicCompanyInfo(prisma: PrismaService) {
  const settings = await prisma.siteSetting.findMany({ where: { key: { in: COMPANY_SETTING_KEYS } } });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return {
    name: map.company_name ?? 'Holiday Vibez',
    address: map.company_address ?? '',
    gstNumber: map.gst_number ?? '',
    email: map.contact_email ?? '',
    phone: map.contact_phone ?? '',
    logoUrl: map.company_logo_url || null,
  };
}
