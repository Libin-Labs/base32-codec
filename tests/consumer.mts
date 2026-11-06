import {
  encodeBase32,
  decodeBase32,
  Base32Error,
  type Base32Alphabet,
  type Base32DecodeOptions,
} from '@lp-labs/base32-codec';
const alphabet: Base32Alphabet = 'base32hex';
const options: Base32DecodeOptions = { alphabet, padding: 'optional' };
const text: string = encodeBase32(new Uint8Array(), { alphabet });
const bytes: Uint8Array = decodeBase32(text, options);
const code: 'invalid' | 'limit' = new Base32Error('invalid', 'x').code;
void bytes;
void code;
// @ts-expect-error Binary bytes required
encodeBase32('x');
