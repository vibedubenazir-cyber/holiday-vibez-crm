export interface CountryDialCode {
  iso2: string;
  name: string;
  dialCode: string;
  // Expected length of the national number (digits after the dial code) —
  // e.g. India's mobile numbers are always exactly 10 digits.
  digits: number;
}

// Covers the countries an India-based travel CRM's leads/clients/vendors/staff
// realistically span. Ordered with India first since it's the default.
export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { iso2: 'IN', name: 'India', dialCode: '91', digits: 10 },
  { iso2: 'US', name: 'United States', dialCode: '1', digits: 10 },
  { iso2: 'CA', name: 'Canada', dialCode: '1', digits: 10 },
  { iso2: 'GB', name: 'United Kingdom', dialCode: '44', digits: 10 },
  { iso2: 'AE', name: 'UAE', dialCode: '971', digits: 9 },
  { iso2: 'SA', name: 'Saudi Arabia', dialCode: '966', digits: 9 },
  { iso2: 'QA', name: 'Qatar', dialCode: '974', digits: 8 },
  { iso2: 'KW', name: 'Kuwait', dialCode: '965', digits: 8 },
  { iso2: 'OM', name: 'Oman', dialCode: '968', digits: 8 },
  { iso2: 'BH', name: 'Bahrain', dialCode: '973', digits: 8 },
  { iso2: 'SG', name: 'Singapore', dialCode: '65', digits: 8 },
  { iso2: 'MY', name: 'Malaysia', dialCode: '60', digits: 9 },
  { iso2: 'TH', name: 'Thailand', dialCode: '66', digits: 9 },
  { iso2: 'ID', name: 'Indonesia', dialCode: '62', digits: 10 },
  { iso2: 'AU', name: 'Australia', dialCode: '61', digits: 9 },
  { iso2: 'NZ', name: 'New Zealand', dialCode: '64', digits: 9 },
  { iso2: 'DE', name: 'Germany', dialCode: '49', digits: 10 },
  { iso2: 'FR', name: 'France', dialCode: '33', digits: 9 },
  { iso2: 'IT', name: 'Italy', dialCode: '39', digits: 10 },
  { iso2: 'ES', name: 'Spain', dialCode: '34', digits: 9 },
  { iso2: 'NL', name: 'Netherlands', dialCode: '31', digits: 9 },
  { iso2: 'CH', name: 'Switzerland', dialCode: '41', digits: 9 },
  { iso2: 'SE', name: 'Sweden', dialCode: '46', digits: 9 },
  { iso2: 'JP', name: 'Japan', dialCode: '81', digits: 10 },
  { iso2: 'CN', name: 'China', dialCode: '86', digits: 11 },
  { iso2: 'HK', name: 'Hong Kong', dialCode: '852', digits: 8 },
  { iso2: 'KR', name: 'South Korea', dialCode: '82', digits: 10 },
  { iso2: 'PH', name: 'Philippines', dialCode: '63', digits: 10 },
  { iso2: 'VN', name: 'Vietnam', dialCode: '84', digits: 9 },
  { iso2: 'NP', name: 'Nepal', dialCode: '977', digits: 10 },
  { iso2: 'LK', name: 'Sri Lanka', dialCode: '94', digits: 9 },
  { iso2: 'BD', name: 'Bangladesh', dialCode: '880', digits: 10 },
  { iso2: 'PK', name: 'Pakistan', dialCode: '92', digits: 10 },
  { iso2: 'ZA', name: 'South Africa', dialCode: '27', digits: 9 },
  { iso2: 'NG', name: 'Nigeria', dialCode: '234', digits: 10 },
  { iso2: 'EG', name: 'Egypt', dialCode: '20', digits: 10 },
  { iso2: 'BR', name: 'Brazil', dialCode: '55', digits: 11 },
  { iso2: 'MX', name: 'Mexico', dialCode: '52', digits: 10 },
  { iso2: 'RU', name: 'Russia', dialCode: '7', digits: 10 },
];

export const DEFAULT_COUNTRY_DIAL_CODE = '91';

// Longest dial code first so e.g. "971..." isn't misread against a shorter
// code that happens to share a leading digit.
const BY_DIAL_CODE_LENGTH_DESC = [...COUNTRY_DIAL_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);

// Splits a stored "+<dialCode><digits>" phone number back into its parts for
// populating a country-code dropdown + local-number input. Falls back to the
// default country if the value is empty or unrecognized.
export function splitPhoneNumber(phone: string | null | undefined): { dialCode: string; localNumber: string } {
  const digitsOnly = (phone ?? '').replace(/\D/g, '');
  for (const c of BY_DIAL_CODE_LENGTH_DESC) {
    if (digitsOnly.startsWith(c.dialCode)) {
      return { dialCode: c.dialCode, localNumber: digitsOnly.slice(c.dialCode.length) };
    }
  }
  return { dialCode: DEFAULT_COUNTRY_DIAL_CODE, localNumber: digitsOnly };
}

// True only if the number carries a recognized country dial code AND has
// exactly that country's expected digit count (e.g. +91 + 10 digits for India).
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone || !phone.startsWith('+')) return false;
  const digitsOnly = phone.slice(1).replace(/\D/g, '');
  return BY_DIAL_CODE_LENGTH_DESC.some((c) => digitsOnly.startsWith(c.dialCode) && digitsOnly.length === c.dialCode.length + c.digits);
}
