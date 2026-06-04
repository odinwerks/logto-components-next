export interface CountryCode {
  code: string;
  iso: string;
  name: string;
}

export const COUNTRY_CODES: readonly CountryCode[] = Object.freeze([
  // Europe
  { code: '44', iso: 'GB', name: 'United Kingdom' },
  { code: '49', iso: 'DE', name: 'Germany' },
  { code: '33', iso: 'FR', name: 'France' },
  { code: '995', iso: 'GE', name: 'Georgia' },
  { code: '380', iso: 'UA', name: 'Ukraine' },
  { code: '39', iso: 'IT', name: 'Italy' },
  { code: '34', iso: 'ES', name: 'Spain' },
  { code: '31', iso: 'NL', name: 'Netherlands' },
  { code: '32', iso: 'BE', name: 'Belgium' },
  { code: '41', iso: 'CH', name: 'Switzerland' },
  { code: '43', iso: 'AT', name: 'Austria' },
  { code: '46', iso: 'SE', name: 'Sweden' },
  { code: '47', iso: 'NO', name: 'Norway' },
  { code: '45', iso: 'DK', name: 'Denmark' },
  { code: '358', iso: 'FI', name: 'Finland' },
  { code: '48', iso: 'PL', name: 'Poland' },
  { code: '351', iso: 'PT', name: 'Portugal' },
  { code: '353', iso: 'IE', name: 'Ireland' },
  { code: '30', iso: 'GR', name: 'Greece' },
  { code: '420', iso: 'CZ', name: 'Czech Republic' },
  { code: '421', iso: 'SK', name: 'Slovakia' },
  { code: '36', iso: 'HU', name: 'Hungary' },
  { code: '40', iso: 'RO', name: 'Romania' },
  { code: '359', iso: 'BG', name: 'Bulgaria' },
  { code: '385', iso: 'HR', name: 'Croatia' },
  { code: '386', iso: 'SI', name: 'Slovenia' },
  { code: '370', iso: 'LT', name: 'Lithuania' },
  { code: '371', iso: 'LV', name: 'Latvia' },
  { code: '372', iso: 'EE', name: 'Estonia' },
  { code: '373', iso: 'MD', name: 'Moldova' },
  { code: '374', iso: 'AM', name: 'Armenia' },
  { code: '375', iso: 'BY', name: 'Belarus' },
  { code: '376', iso: 'AD', name: 'Andorra' },
  { code: '377', iso: 'MC', name: 'Monaco' },
  { code: '355', iso: 'AL', name: 'Albania' },
  { code: '381', iso: 'RS', name: 'Serbia' },
  { code: '387', iso: 'BA', name: 'Bosnia and Herzegovina' },
  { code: '382', iso: 'ME', name: 'Montenegro' },
  { code: '389', iso: 'MK', name: 'North Macedonia' },
  { code: '354', iso: 'IS', name: 'Iceland' },
  { code: '357', iso: 'CY', name: 'Cyprus' },
  { code: '356', iso: 'MT', name: 'Malta' },
  { code: '352', iso: 'LU', name: 'Luxembourg' },
  { code: '7', iso: 'RU', name: 'Russia' },

  // Americas
  { code: '1', iso: 'US', name: 'United States / Canada' },
  { code: '52', iso: 'MX', name: 'Mexico' },
  { code: '55', iso: 'BR', name: 'Brazil' },
  { code: '54', iso: 'AR', name: 'Argentina' },
  { code: '56', iso: 'CL', name: 'Chile' },
  { code: '57', iso: 'CO', name: 'Colombia' },
  { code: '58', iso: 'VE', name: 'Venezuela' },
  { code: '51', iso: 'PE', name: 'Peru' },
  { code: '593', iso: 'EC', name: 'Ecuador' },
  { code: '591', iso: 'BO', name: 'Bolivia' },
  { code: '595', iso: 'PY', name: 'Paraguay' },
  { code: '598', iso: 'UY', name: 'Uruguay' },
  { code: '506', iso: 'CR', name: 'Costa Rica' },
  { code: '507', iso: 'PA', name: 'Panama' },
  { code: '502', iso: 'GT', name: 'Guatemala' },
  { code: '503', iso: 'SV', name: 'El Salvador' },
  { code: '504', iso: 'HN', name: 'Honduras' },
  { code: '505', iso: 'NI', name: 'Nicaragua' },
  { code: '1809', iso: 'DO', name: 'Dominican Republic' },
  { code: '1242', iso: 'BS', name: 'Bahamas' },
  { code: '1876', iso: 'JM', name: 'Jamaica' },
  { code: '1868', iso: 'TT', name: 'Trinidad and Tobago' },
  { code: '1246', iso: 'BB', name: 'Barbados' },

  // Asia & Pacific
  { code: '81', iso: 'JP', name: 'Japan' },
  { code: '82', iso: 'KR', name: 'South Korea' },
  { code: '86', iso: 'CN', name: 'China' },
  { code: '886', iso: 'TW', name: 'Taiwan' },
  { code: '852', iso: 'HK', name: 'Hong Kong' },
  { code: '853', iso: 'MO', name: 'Macau' },
  { code: '91', iso: 'IN', name: 'India' },
  { code: '61', iso: 'AU', name: 'Australia' },
  { code: '64', iso: 'NZ', name: 'New Zealand' },
  { code: '65', iso: 'SG', name: 'Singapore' },
  { code: '60', iso: 'MY', name: 'Malaysia' },
  { code: '62', iso: 'ID', name: 'Indonesia' },
  { code: '63', iso: 'PH', name: 'Philippines' },
  { code: '66', iso: 'TH', name: 'Thailand' },
  { code: '84', iso: 'VN', name: 'Vietnam' },
  { code: '92', iso: 'PK', name: 'Pakistan' },
  { code: '880', iso: 'BD', name: 'Bangladesh' },
  { code: '94', iso: 'LK', name: 'Sri Lanka' },
  { code: '977', iso: 'NP', name: 'Nepal' },
  { code: '77', iso: 'KZ', name: 'Kazakhstan' },
  { code: '998', iso: 'UZ', name: 'Uzbekistan' },
  { code: '996', iso: 'KG', name: 'Kyrgyzstan' },
  { code: '992', iso: 'TJ', name: 'Tajikistan' },
  { code: '993', iso: 'TM', name: 'Turkmenistan' },
  { code: '994', iso: 'AZ', name: 'Azerbaijan' },
  { code: '90', iso: 'TR', name: 'Turkey' },
  { code: '972', iso: 'IL', name: 'Israel' },
  { code: '966', iso: 'SA', name: 'Saudi Arabia' },
  { code: '971', iso: 'AE', name: 'United Arab Emirates' },
  { code: '974', iso: 'QA', name: 'Qatar' },
  { code: '965', iso: 'KW', name: 'Kuwait' },
  { code: '973', iso: 'BH', name: 'Bahrain' },
  { code: '968', iso: 'OM', name: 'Oman' },
  { code: '967', iso: 'YE', name: 'Yemen' },
  { code: '964', iso: 'IQ', name: 'Iraq' },
  { code: '962', iso: 'JO', name: 'Jordan' },
  { code: '961', iso: 'LB', name: 'Lebanon' },
  { code: '963', iso: 'SY', name: 'Syria' },
  { code: '970', iso: 'PS', name: 'Palestine' },
  { code: '93', iso: 'AF', name: 'Afghanistan' },
  { code: '960', iso: 'MV', name: 'Maldives' },
  { code: '976', iso: 'MN', name: 'Mongolia' },
  { code: '95', iso: 'MM', name: 'Myanmar' },
  { code: '855', iso: 'KH', name: 'Cambodia' },
  { code: '856', iso: 'LA', name: 'Laos' },
  { code: '673', iso: 'BN', name: 'Brunei' },

  // Africa
  { code: '20', iso: 'EG', name: 'Egypt' },
  { code: '27', iso: 'ZA', name: 'South Africa' },
  { code: '234', iso: 'NG', name: 'Nigeria' },
  { code: '212', iso: 'MA', name: 'Morocco' },
  { code: '254', iso: 'KE', name: 'Kenya' },
  { code: '251', iso: 'ET', name: 'Ethiopia' },
  { code: '233', iso: 'GH', name: 'Ghana' },
  { code: '255', iso: 'TZ', name: 'Tanzania' },
  { code: '256', iso: 'UG', name: 'Uganda' },
  { code: '213', iso: 'DZ', name: 'Algeria' },
  { code: '216', iso: 'TN', name: 'Tunisia' },
  { code: '218', iso: 'LY', name: 'Libya' },
  { code: '249', iso: 'SD', name: 'Sudan' },
  { code: '221', iso: 'SN', name: 'Senegal' },
  { code: '225', iso: 'CI', name: 'Ivory Coast' },
  { code: '237', iso: 'CM', name: 'Cameroon' },
  { code: '244', iso: 'AO', name: 'Angola' },
  { code: '258', iso: 'MZ', name: 'Mozambique' },
  { code: '261', iso: 'MG', name: 'Madagascar' },
  { code: '230', iso: 'MU', name: 'Mauritius' },
  { code: '263', iso: 'ZW', name: 'Zimbabwe' },
  { code: '260', iso: 'ZM', name: 'Zambia' },
  { code: '250', iso: 'RW', name: 'Rwanda' }
]);

export function getFlagEmoji(iso: string): string {
  if (typeof iso !== 'string' || iso.length !== 2) {
    return '🌐';
  }
  const upper = iso.toUpperCase();
  const char1 = upper.charCodeAt(0);
  const char2 = upper.charCodeAt(1);
  if (char1 < 65 || char1 > 90 || char2 < 65 || char2 > 90) {
    return '🌐';
  }
  try {
    return String.fromCodePoint(127397 + char1, 127397 + char2);
  } catch {
    return '🌐';
  }
}
