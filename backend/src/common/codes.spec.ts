import { highestCode, nextCode } from './codes.js';

describe('nextCode', () => {
  it('starts at A1', () => {
    expect(nextCode(undefined)).toBe('A1');
  });

  it('counts the number up to 9', () => {
    expect(nextCode('A1')).toBe('A2');
    expect(nextCode('A8')).toBe('A9');
  });

  it('then steps the letter, like spreadsheet columns', () => {
    expect(nextCode('A9')).toBe('B1');
    expect(nextCode('Y9')).toBe('Z1');
    expect(nextCode('Z9')).toBe('AA1');
    expect(nextCode('AA9')).toBe('AB1');
    expect(nextCode('AZ9')).toBe('BA1');
    expect(nextCode('ZZ9')).toBe('AAA1');
  });

  it('gives up once a code would pass 4 characters', () => {
    expect(() => nextCode('ZZZ9')).toThrow(/no codes left/i);
  });
});

describe('highestCode', () => {
  it('picks the latest code in sequence order, not alphabetical order', () => {
    expect(highestCode(['B3', 'A9', 'AA1', 'Z9'])).toBe('AA1');
  });

  it('ignores codes that are not part of the sequence', () => {
    expect(highestCode(['WH01', 'A2', 'north', 'A10'])).toBe('A2');
  });

  it('given nothing usable, returns undefined', () => {
    expect(highestCode([])).toBeUndefined();
    expect(highestCode(['WH01'])).toBeUndefined();
  });
});
