import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidPhoneNumber } from '@holiday-vibez/shared';

// Validates a "+<countryDialCode><nationalNumber>" string against the shared
// country dial-code list's expected digit count (e.g. +91 requires exactly
// 10 digits for India) instead of just checking it's a non-empty string.
export function IsPhoneWithCountryCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneWithCountryCode',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isValidPhoneNumber(value);
        },
        defaultMessage() {
          return `${propertyName} must start with a valid country code and have that country's correct number of digits (e.g. +91 followed by 10 digits for India)`;
        },
      },
    });
  };
}
