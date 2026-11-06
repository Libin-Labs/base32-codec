export type Base32Alphabet = 'base32' | 'base32hex';
export interface Base32EncodeOptions {
  alphabet?: Base32Alphabet;
  padding?: boolean;
  maxBytes?: number;
  maxCharacters?: number;
}
export interface Base32DecodeOptions {
  alphabet?: Base32Alphabet;
  padding?: 'required' | 'optional' | 'forbidden';
  caseInsensitive?: boolean;
  maxBytes?: number;
  maxCharacters?: number;
}
export class Base32Error extends Error {
  constructor(
    readonly code: 'invalid' | 'limit',
    message: string,
  ) {
    super(message);
    this.name = 'Base32Error';
  }
}
function invalid(message: string): never {
  throw new Base32Error('invalid', message);
}
function alphabet(value: Base32Alphabet): string {
  if (value === 'base32') return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  if (value === 'base32hex') return '0123456789ABCDEFGHIJKLMNOPQRSTUV';
  return invalid('Unsupported base32 alphabet.');
}
function limits(
  bytes: number | undefined,
  characters: number | undefined,
): readonly [number, number] {
  const maxBytes = bytes ?? 16777216,
    maxCharacters = characters ?? 33554432;
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 0 ||
    maxBytes > 67108864 ||
    !Number.isSafeInteger(maxCharacters) ||
    maxCharacters < 0 ||
    maxCharacters > 134217728
  )
    invalid('Byte/character budgets must be bounded nonnegative safe integers.');
  return [maxBytes, maxCharacters];
}
export function encodeBase32(input: Uint8Array, options: Base32EncodeOptions = {}): string {
  if (!(input instanceof Uint8Array)) invalid('Expected Uint8Array.');
  const chars = alphabet(options.alphabet ?? 'base32');
  const padding = options.padding ?? true;
  if (typeof padding !== 'boolean') invalid('padding must be boolean.');
  const [maxBytes, maxCharacters] = limits(options.maxBytes, options.maxCharacters);
  const symbols = Math.ceil((input.length * 8) / 5);
  const size = padding ? Math.ceil(input.length / 5) * 8 : symbols;
  if (input.length > maxBytes || size > maxCharacters)
    throw new Base32Error('limit', 'Encoded data exceeds budgets.');
  const chunks: string[] = [];
  let buffer = 0,
    bits = 0,
    chunk = '';
  for (const byte of input) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      chunk += chars[(buffer >>> bits) & 31]!;
    }
    buffer &= (1 << bits) - 1;
    if (chunk.length >= 8192) {
      chunks.push(chunk);
      chunk = '';
    }
  }
  if (bits) chunk += chars[(buffer << (5 - bits)) & 31]!;
  if (padding) chunk += '='.repeat(size - symbols);
  chunks.push(chunk);
  return chunks.join('');
}
export function decodeBase32(text: string, options: Base32DecodeOptions = {}): Uint8Array {
  if (typeof text !== 'string') invalid('Expected base32 text.');
  const chars = alphabet(options.alphabet ?? 'base32'),
    padding = options.padding ?? 'required';
  if (padding !== 'required' && padding !== 'optional' && padding !== 'forbidden')
    invalid('Unsupported padding policy.');
  const insensitive = options.caseInsensitive ?? true;
  if (typeof insensitive !== 'boolean') invalid('caseInsensitive must be boolean.');
  const [maxBytes, maxCharacters] = limits(options.maxBytes, options.maxCharacters);
  if (text.length > maxCharacters)
    throw new Base32Error('limit', 'Encoded character budget exceeded.');
  const firstPad = text.indexOf('='),
    symbols = firstPad === -1 ? text.length : firstPad;
  const residue = symbols % 8;
  if (![0, 2, 4, 5, 7].includes(residue)) invalid('Impossible base32 symbol count.');
  const padCount = text.length - symbols,
    expectedPad = (8 - residue) % 8;
  if (padding === 'forbidden' && padCount) invalid('Padding forbidden.');
  if (
    (padCount && (padCount !== expectedPad || text.length % 8 !== 0)) ||
    (padding === 'required' && padCount !== expectedPad)
  )
    invalid('Incorrect base32 padding.');
  for (let index = symbols; index < text.length; index++)
    if (text[index] !== '=') invalid('Padding may appear only at the end.');
  const length = Math.floor((symbols * 5) / 8);
  if (length > maxBytes) throw new Base32Error('limit', 'Decoded byte budget exceeded.');
  // Validate before allocating the decoded buffer.
  const digit = (index: number): number => {
    let code = text.charCodeAt(index);
    if (insensitive && code >= 97 && code <= 122) code -= 32;
    const value = chars.indexOf(String.fromCharCode(code));
    if (value < 0) invalid('Invalid base32 alphabet character.');
    return value;
  };
  for (let index = 0; index < symbols; index++) digit(index);
  const unused = (symbols * 5) % 8;
  if (unused && digit(symbols - 1) & ((1 << unused) - 1)) invalid('Nonzero unused base32 bits.');
  const output = new Uint8Array(length);
  let buffer = 0,
    bits = 0,
    at = 0;
  for (let index = 0; index < symbols; index++) {
    buffer = (buffer << 5) | digit(index);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output[at++] = (buffer >>> bits) & 255;
    }
    buffer &= (1 << bits) - 1;
  }
  return output;
}
