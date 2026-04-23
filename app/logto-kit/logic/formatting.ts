/**
 * Format a phone number string for display.
 * Handles E.164 numbers (starting with +) and plain digit strings.
 * Uses country code prefix to choose grouping pattern.
 * Falls back to grouping from the right for unknown country codes.
 */
export function formatPhone(raw: string): string {
  if (!raw) return raw;
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;

  const countryPatterns: Record<string, (d: string) => string> = {
    '1':  (d: string) => d.length <= 1 ? `+1 ${d}` : d.length <= 4 ? `+1 ${d.slice(1)}` : d.length <= 7 ? `+1 ${d.slice(1,4)} ${d.slice(4)}` : `+1 ${d.slice(1,4)} ${d.slice(4,7)} ${d.slice(7)}`,
    '7':  (d: string) => `+7 ${d.slice(1,4)} ${d.slice(4,7)} ${d.slice(7)}`,
    '20': (d: string) => `+20 ${d.slice(2,4)} ${d.slice(4,8)} ${d.slice(8)}`,
    '27': (d: string) => `+27 ${d.slice(2,4)} ${d.slice(4,7)} ${d.slice(7)}`,
    '30': (d: string) => `+30 ${d.slice(2,4)} ${d.slice(4,7)} ${d.slice(7)}`,
    '31': (d: string) => `+31 ${d.slice(2,4)} ${d.slice(4,7)} ${d.slice(7)}`,
    '33': (d: string) => `+33 ${d.slice(2,3)} ${d.slice(3,4)} ${d.slice(4,6)} ${d.slice(6)}`,
    '34': (d: string) => `+34 ${d.slice(2,5)} ${d.slice(5,7)} ${d.slice(7)}`,
    '39': (d: string) => `+39 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '44': (d: string) => d.length <= 2 ? `+44 ${d.slice(2)}` : d.length <= 6 ? `+44 ${d.slice(2,5)} ${d.slice(5)}` : d.length <= 9 ? `+44 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}` : `+44 ${d.slice(2,4)} ${d.slice(4,7)} ${d.slice(7)}`,
    '49': (d: string) => d.length <= 3 ? `+49 ${d.slice(2)}` : d.length <= 7 ? `+49 ${d.slice(2,5)} ${d.slice(5)}` : `+49 ${d.slice(2,5)} ${d.slice(5)}`,
    '55': (d: string) => `+55 ${d.slice(2,4)} ${d.slice(4,9)} ${d.slice(9)}`,
    '61': (d: string) => `+61 ${d.slice(2,3)} ${d.slice(3,7)} ${d.slice(7)}`,
    '62': (d: string) => `+62 ${d.slice(2,5)} ${d.slice(5,9)} ${d.slice(9)}`,
    '63': (d: string) => `+63 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '81': (d: string) => `+81 ${d.slice(2,5)} ${d.slice(5)}`,
    '82': (d: string) => `+82 ${d.slice(2,6)} ${d.slice(6)}`,
    '86': (d: string) => d.length <= 3 ? `+86 ${d.slice(2)}` : `+86 ${d.slice(2,5)} ${d.slice(5,9)} ${d.slice(9)}`,
    '90': (d: string) => `+90 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '91': (d: string) => `+91 ${d.slice(2,7)} ${d.slice(7)}`,
    '92': (d: string) => `+92 ${d.slice(2,5)} ${d.slice(5)}`,
    '93': (d: string) => `+93 ${d.slice(2,4)} ${d.slice(4)}`,
    '94': (d: string) => `+94 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '95': (d: string) => `+95 ${d.slice(2,6)} ${d.slice(6)}`,
    '98': (d: string) => `+98 ${d.slice(2,5)} ${d.slice(5,9)} ${d.slice(9)}`,
    '212': (d: string) => `+212 ${d.slice(3,6)} ${d.slice(6,9)} ${d.slice(9)}`,
    '234': (d: string) => `+234 ${d.slice(3,6)} ${d.slice(6,9)} ${d.slice(9)}`,
    '351': (d: string) => `+351 ${d.slice(3,6)} ${d.slice(6,9)} ${d.slice(9)}`,
    '353': (d: string) => `+353 ${d.slice(3,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '355': (d: string) => `+355 ${d.slice(3,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '358': (d: string) => `+358 ${d.slice(3,6)} ${d.slice(6)}`,
    '359': (d: string) => `+359 ${d.slice(3,6)} ${d.slice(6)}`,
    '370': (d: string) => `+370 ${d.slice(3,6)} ${d.slice(6)}`,
    '371': (d: string) => `+371 ${d.slice(3,6)} ${d.slice(6)}`,
    '372': (d: string) => `+372 ${d.slice(3,6)} ${d.slice(6)}`,
    '373': (d: string) => `+373 ${d.slice(3,6)} ${d.slice(6)}`,
    '374': (d: string) => `+374 ${d.slice(3,5)} ${d.slice(5,7)} ${d.slice(7)}`,
    '375': (d: string) => `+375 ${d.slice(3,6)} ${d.slice(6)}`,
    '376': (d: string) => `+376 ${d.slice(3,6)} ${d.slice(6)}`,
    '377': (d: string) => `+377 ${d.slice(3,6)} ${d.slice(6)}`,
    '380': (d: string) => `+380 ${d.slice(3,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '381': (d: string) => `+381 ${d.slice(3,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '385': (d: string) => `+385 ${d.slice(3,6)} ${d.slice(6)}`,
    '386': (d: string) => `+386 ${d.slice(3,6)} ${d.slice(6)}`,
    '420': (d: string) => `+420 ${d.slice(3,6)} ${d.slice(6,9)} ${d.slice(9)}`,
    '421': (d: string) => `+421 ${d.slice(3,6)} ${d.slice(6,9)} ${d.slice(9)}`,
    '48':  (d: string) => `+48 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '52':  (d: string) => `+52 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '54':  (d: string) => `+54 ${d.slice(2,4)} ${d.slice(4,8)} ${d.slice(8)}`,
    '56':  (d: string) => `+56 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '57':  (d: string) => `+57 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '58':  (d: string) => `+58 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '60':  (d: string) => `+60 ${d.slice(2,4)} ${d.slice(4,8)} ${d.slice(8)}`,
    '64':  (d: string) => `+64 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '84':  (d: string) => `+84 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '880': (d: string) => `+880 ${d.slice(3,6)} ${d.slice(6)}`,
    '886': (d: string) => `+886 ${d.slice(3,6)} ${d.slice(6,9)} ${d.slice(9)}`,
    '960': (d: string) => `+960 ${d.slice(3,6)} ${d.slice(6)}`,
    '961': (d: string) => `+961 ${d.slice(3,5)} ${d.slice(5)}`,
    '962': (d: string) => `+962 ${d.slice(3,6)} ${d.slice(6)}`,
    '963': (d: string) => `+963 ${d.slice(3,6)} ${d.slice(6)}`,
    '964': (d: string) => `+964 ${d.slice(3,6)} ${d.slice(6)}`,
    '965': (d: string) => `+965 ${d.slice(3,7)} ${d.slice(7)}`,
    '966': (d: string) => `+966 ${d.slice(3,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '967': (d: string) => `+967 ${d.slice(3,6)} ${d.slice(6)}`,
    '968': (d: string) => `+968 ${d.slice(3,7)} ${d.slice(7)}`,
    '970': (d: string) => `+970 ${d.slice(3,6)} ${d.slice(6)}`,
    '971': (d: string) => `+971 ${d.slice(3,6)} ${d.slice(6)}`,
    '972': (d: string) => `+972 ${d.slice(3,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '973': (d: string) => `+973 ${d.slice(3,6)} ${d.slice(6)}`,
    '974': (d: string) => `+974 ${d.slice(3,6)} ${d.slice(6)}`,
    '975': (d: string) => `+975 ${d.slice(3,6)} ${d.slice(6)}`,
    '976': (d: string) => `+976 ${d.slice(3,6)} ${d.slice(6)}`,
    '977': (d: string) => `+977 ${d.slice(3,6)} ${d.slice(6)}`,
    '992': (d: string) => `+992 ${d.slice(3,6)} ${d.slice(6)}`,
    '993': (d: string) => `+993 ${d.slice(3,5)} ${d.slice(5,8)} ${d.slice(8)}`,
    '994': (d: string) => `+994 ${d.slice(3,5)} ${d.slice(5,7)} ${d.slice(7)}`,
    '995': (d: string) => d.length <= 4 ? `+995 ${d.slice(3)}` : `+995 ${d.slice(3,6)} ${d.slice(6,8)} ${d.slice(8)}`,
    '996': (d: string) => `+996 ${d.slice(3,6)} ${d.slice(6)}`,
    '998': (d: string) => `+998 ${d.slice(3,6)} ${d.slice(6,9)} ${d.slice(9)}`,
  };

  if (hasPlus) {
    for (let len = 3; len >= 1; len--) {
      const prefix = digits.slice(0, len);
      if (countryPatterns[prefix]) {
        return countryPatterns[prefix](digits);
      }
    }
    const localPart = digits.slice(1);
    return `+${digits[0]} ${groupFromRight(localPart)}`;
  }

  return groupFromRight(digits);
}

function groupFromRight(digits: string): string {
  if (digits.length <= 4) return digits;
  const groups: string[] = [];
  let remaining = digits;
  while (remaining.length > 4) {
    groups.unshift(remaining.slice(-3));
    remaining = remaining.slice(0, -3);
  }
  groups.unshift(remaining);
  return groups.join(' ');
}