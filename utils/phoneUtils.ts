export interface CountryConfig {
  code: string;
  flag: string;
  mask: string;
  placeholder: string;
  maxLength: number;
}

export const COUNTRY_DATA: CountryConfig[] = [
  // North America
  { code: '+1', flag: '🇺🇸', mask: '(XXX) XXX-XXXX', placeholder: '(555) 000-0000', maxLength: 10 },
  // Europe
  { code: '+44', flag: '🇬🇧', mask: 'XXXX XXXXXX', placeholder: '7700 900000', maxLength: 10 },
  { code: '+49', flag: '🇩🇪', mask: 'XXXX XXXXXXX', placeholder: '1512 3456789', maxLength: 11 },
  { code: '+33', flag: '🇫🇷', mask: 'X XX XX XX XX', placeholder: '6 12 34 56 78', maxLength: 9 },
  { code: '+39', flag: '🇮🇹', mask: 'XXX XXXXXXX', placeholder: '333 1234567', maxLength: 10 },
  { code: '+34', flag: '🇪🇸', mask: 'XXX XXX XXX', placeholder: '600 000 000', maxLength: 9 },
  { code: '+7', flag: '🇷🇺', mask: 'XXX XXX-XX-XX', placeholder: '900 123-45-67', maxLength: 10 },
  // Asia
  { code: '+91', flag: '🇮🇳', mask: 'XXXXX XXXXX', placeholder: '12345 67890', maxLength: 10 },
  { code: '+86', flag: '🇨🇳', mask: 'XXX XXXX XXXX', placeholder: '138 1234 5678', maxLength: 11 },
  { code: '+81', flag: '🇯🇵', mask: 'XX-XXXX-XXXX', placeholder: '90-1234-5678', maxLength: 10 },
  { code: '+82', flag: '🇰🇷', mask: 'XX-XXXX-XXXX', placeholder: '10-1234-5678', maxLength: 10 },
  { code: '+65', flag: '🇸🇬', mask: 'XXXX XXXX', placeholder: '8123 4567', maxLength: 8 },
  { code: '+92', flag: '🇵🇰', mask: 'XXX XXXXXXX', placeholder: '300 1234567', maxLength: 10 },
  { code: '+62', flag: '🇮🇩', mask: 'XXX XXXX XXXX', placeholder: '812 3456 7890', maxLength: 11 },
  { code: '+66', flag: '🇹🇭', mask: 'XX XXX XXXX', placeholder: '81 234 5678', maxLength: 9 },
  { code: '+84', flag: '🇻🇳', mask: 'XXX XXX XXX', placeholder: '903 123 456', maxLength: 9 },
  // Middle East & Africa
  { code: '+971', flag: '🇦🇪', mask: 'X XXX XXXX', placeholder: '5 000 0000', maxLength: 9 },
  { code: '+966', flag: '🇸🇦', mask: 'X XXX XXXX', placeholder: '5 000 0000', maxLength: 9 },
  { code: '+974', flag: '🇶🇦', mask: 'XXXX XXXX', placeholder: '5000 0000', maxLength: 8 },
  { code: '+20', flag: '🇪🇬', mask: 'XX XXXX XXXX', placeholder: '10 1234 5678', maxLength: 10 },
  { code: '+27', flag: '🇿🇦', mask: 'XX XXX XXXX', placeholder: '82 123 4567', maxLength: 9 },
  { code: '+234', flag: '🇳🇬', mask: 'XXX XXX XXXX', placeholder: '803 123 4567', maxLength: 10 },
  // Oceania
  { code: '+61', flag: '🇦🇺', mask: 'XXX XXX XXX', placeholder: '400 000 000', maxLength: 9 },
  { code: '+64', flag: '🇳🇿', mask: 'XX XXX XXXX', placeholder: '21 123 4567', maxLength: 9 },
  // Americas
  { code: '+55', flag: '🇧🇷', mask: 'XX XXXXX-XXXX', placeholder: '11 91234-5678', maxLength: 11 },
  { code: '+52', flag: '🇲🇽', mask: 'XX XXXX XXXX', placeholder: '55 1234 5678', maxLength: 10 },
  { code: '+54', flag: '🇦🇷', mask: 'X XX XXXX-XXXX', placeholder: '9 11 1234-5678', maxLength: 11 },
  { code: '+57', flag: '🇨🇴', mask: 'XXX XXX XXXX', placeholder: '300 123 4567', maxLength: 10 },
];

export const DEFAULT_COUNTRY: CountryConfig = {
  code: '',
  flag: '🌐',
  mask: 'XXXXXXXXXXXXXX',
  placeholder: 'Enter phone number',
  maxLength: 15,
};

/**
 * Detects the country configuration based on the input string starting with "+"
 */
export const detectCountry = (text: string): CountryConfig => {
  if (!text.startsWith('+')) return DEFAULT_COUNTRY;
  
  // Sort by code length descending to match longest prefixes first (e.g., +1 242 vs +1)
  const sortedCountries = [...COUNTRY_DATA].sort((a, b) => b.code.length - a.code.length);
  
  for (const country of sortedCountries) {
    if (text.startsWith(country.code)) {
      return country;
    }
  }
  
  return DEFAULT_COUNTRY;
};

/**
 * Formats a raw digit string according to a mask
 */
export const applyMask = (digits: string, mask: string): string => {
  let result = '';
  let digitIndex = 0;
  
  for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
    if (mask[i] === 'X') {
      result += digits[digitIndex];
      digitIndex++;
    } else {
      result += mask[i];
    }
  }
  
  return result;
};

/**
 * Validates if the phone number length is correct for the country
 */
export const isPhoneValid = (text: string): boolean => {
  if (!text) return false;
  const country = detectCountry(text);
  const digitsOnly = text.replace(country.code, '').replace(/\D/g, '');
  
  // If we know the country, check for specific length
  if (country.code) {
    return digitsOnly.length === country.maxLength;
  }
  
  // For unknown countries, follow generic E.164 rule (7 - 15 digits)
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
};

/**
 * Main function to handle phone number input and return formatted version
 */
export const formatPhoneInput = (text: string) => {
  // 1. Maintain the "+" prefix
  let cleaned = text;
  if (text.length > 0 && !text.startsWith('+')) {
    cleaned = '+' + text.replace(/\D/g, '');
  }

  // 2. Detect country
  const country = detectCountry(cleaned);
  const prefix = country.code;
  
  // 3. Strict Truncation: Never allow more than specified maxLength for the country
  // or the global maximum of 15 digits.
  const digitsAfterPrefix = cleaned
    .slice(prefix.length)
    .replace(/\D/g, '')
    .slice(0, country.code ? country.maxLength : 15);
  
  // 4. Apply mask to digits after prefix
  const formattedSuffix = applyMask(digitsAfterPrefix, country.mask);
  
  // 5. Final formatted result
  const formatted = prefix ? `${prefix} ${formattedSuffix}`.trim() : cleaned.slice(0, 16); 
  
  return {
    formatted: formatted,
    raw: prefix + digitsAfterPrefix,
    country,
    isValid: isPhoneValid(prefix + digitsAfterPrefix)
  };
};
