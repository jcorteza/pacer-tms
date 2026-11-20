/**
 * Short codes run A1..A9, B1..B9, ... Z9, AA1..AA9, AB1 ...: letters step like spreadsheet
 * columns and the digit counts 1-9 before the letters step. Codes are at most 4 characters.
 */
const SEQUENCE = /^([A-Z]+)([1-9])$/;
const MAX_LENGTH = 4;

/** The letters after `letters` in spreadsheet-column order: A→B, Z→AA, AZ→BA, ZZ→AAA. */
function nextLetters(letters: string): string {
  const chars = letters.split('');
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] !== 'Z') {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      return chars.join('');
    }
    chars[i] = 'A';
  }
  return `A${chars.join('')}`;
}

export function nextCode(previous: string | undefined): string {
  if (previous === undefined) return 'A1';
  const [, letters, digit] = SEQUENCE.exec(previous)!;
  const next = Number(digit) < 9 ? `${letters}${Number(digit) + 1}` : `${nextLetters(letters)}1`;
  if (next.length > MAX_LENGTH) throw new Error('No codes left in the sequence');
  return next;
}

/** Sequence order: shorter letter runs first, then alphabetical, then by digit. */
const position = (code: string) => {
  const [, letters, digit] = SEQUENCE.exec(code)!;
  return { letters, digit: Number(digit) };
};

/** The latest code in the sequence; codes that are not part of it (for example `WH01`) are ignored. */
export function highestCode(codes: string[]): string | undefined {
  return codes
    .filter((code) => SEQUENCE.test(code))
    .reduce<string | undefined>((best, code) => {
      if (best === undefined) return code;
      const [a, b] = [position(code), position(best)];
      const later =
        a.letters.length !== b.letters.length
          ? a.letters.length > b.letters.length
          : a.letters !== b.letters
            ? a.letters > b.letters
            : a.digit > b.digit;
      return later ? code : best;
    }, undefined);
}
