import { decodeBase32, type Base32DecodeOptions } from '@lp-labs/base32-codec';
const options: Base32DecodeOptions = { padding: 'required' };
const bytes: Uint8Array = decodeBase32('', options);
void bytes;
// @ts-expect-error Crockford is a different codec
decodeBase32('', { alphabet: 'crockford' });
