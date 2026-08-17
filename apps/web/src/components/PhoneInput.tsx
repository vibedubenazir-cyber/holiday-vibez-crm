'use client';

import { ChangeEvent, useState } from 'react';
import { COUNTRY_DIAL_CODES, DEFAULT_COUNTRY_DIAL_CODE, splitPhoneNumber } from '@holiday-vibez/shared';

const FIELD_CLASS = 'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

// Country-code dropdown + digits-only field that composes a "+<dialCode><digits>"
// value, capped at the selected country's expected national-number length
// (e.g. 10 digits for India) — see packages/shared/src/phone.ts for the list.
export function PhoneInput({ value, onChange, required, className }: PhoneInputProps) {
  // The dropdown's selection lives in its own state rather than being derived
  // straight from `value`: an untouched digits field means `value` is '',
  // which always parses back to the default country — deriving from `value`
  // alone would silently snap the dropdown back to India the instant a user
  // picked a different country before typing any digits.
  const [dialCode, setDialCode] = useState(() => splitPhoneNumber(value).dialCode);
  const localNumber = splitPhoneNumber(value).dialCode === dialCode ? splitPhoneNumber(value).localNumber : '';
  const country = COUNTRY_DIAL_CODES.find((c) => c.dialCode === dialCode) ?? COUNTRY_DIAL_CODES.find((c) => c.dialCode === DEFAULT_COUNTRY_DIAL_CODE)!;
  const isIncomplete = localNumber.length > 0 && localNumber.length !== country.digits;

  function handleDialCodeChange(e: ChangeEvent<HTMLSelectElement>) {
    setDialCode(e.target.value);
    onChange(localNumber ? `+${e.target.value}${localNumber}` : '');
  }

  function handleNumberChange(e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, country.digits);
    onChange(digits ? `+${dialCode}${digits}` : '');
  }

  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      <select value={dialCode} onChange={handleDialCodeChange} className={`${FIELD_CLASS} w-28 shrink-0`}>
        {COUNTRY_DIAL_CODES.map((c) => (
          <option key={c.iso2} value={c.dialCode}>{c.iso2} +{c.dialCode}</option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="numeric"
        required={required}
        placeholder={`${country.digits}-digit number`}
        value={localNumber}
        onChange={handleNumberChange}
        className={`${FIELD_CLASS} flex-1 min-w-0 ${isIncomplete ? 'border-red-400' : ''}`}
      />
    </div>
  );
}
