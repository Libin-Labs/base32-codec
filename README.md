# @lp-labs/base32-codec

Strict RFC4648 base32/base32hex binary codecs with canonical unused bits, explicit padding policies and allocation budgets.

Original MIT TypeScript with **zero runtime or peer dependencies**. ESM/CommonJS with separate declarations. Node18+ and compatible ES2022 browsers. No network/filesystem/global services accessed on import. TypeScript/Prettier are development-only.

## Install

```sh
npm install @lp-labs/base32-codec
```

## Working example

```js
import { encodeBase32, decodeBase32, Base32Error } from '@lp-labs/base32-codec';
const bytes = new TextEncoder().encode('foobar');
const wire = encodeBase32(bytes);
if (wire !== 'MZXW6YTBOI======') throw new Error('Bad base32');
if (new TextDecoder().decode(decodeBase32(wire)) !== 'foobar') throw new Error('Bad decode');
const hex = encodeBase32(bytes, { alphabet: 'base32hex', padding: false });
if (hex !== 'CPNMUOJ1E8') throw new Error('Bad base32hex');
if (decodeBase32(hex, { alphabet: 'base32hex', padding: 'forbidden' }).length !== 6)
  throw new Error('Bad hex decode');
if (!(new Base32Error('invalid', 'example') instanceof Error)) throw new Error('Error API');
```

CommonJS: `const api = require('@lp-labs/base32-codec')`.

## Behavior, customization, errors and performance

Actual RFC4648 standard alphabetABCDEFGHIJKLMNOPQRSTUVWXYZ234567 and extended hex0123456789ABCDEFGHIJKLMNOPQRSTUV. No Crockford aliases, geohash alphabet, human mistype repair, checksum, authentication or encryption. Encodes Uint8Array only; decoded outputs are fresh Uint8Array, no Buffer/DOM globals required, input not modified.

encodeBase32 options: alphabet defaults base32; padding boolean defaulttrue. Standard '=' padding makes output a multiple of8 characters. padding:false emits the shortest unpadded form. Empty bytes -> empty string in either mode.

decodeBase32 options: alphabet defaults base32; padding defaults required, alternatively optional/forbidden. required means EXACT expected RFC4648 pad count, including no extra pads for full groups; optional accepts either full canonical padding or no pads; forbidden rejects all '='. Symbols must have residue0/2/4/5/7 modulo8; nonzero unused trailing bits are ALWAYS rejected, so alternate textual payload aliases are not accepted. Whitespace, trailing newlines, separators, embedded '=' and wrong alphabets reject. caseInsensitive defaults true and recognizes only ASCII lowercase equivalents; false requires uppercase. No Unicode normalization/locale case transforms.

Both APIs accept maxBytes (default16MiB, allowed0..64MiB) and maxCharacters (default32MiB, allowed0..128MiB), bounded nonnegative safe integers. Encode checks predicted final wire size before producing output, including padding. Decode checks text length and predicted decoded length before allocation, validates symbols/canonicality and then decodes. Limits describe bytes and ASCII code units, not decoded text characters; text encoding is explicitly your application choice. Base32Error.code invalid for malformed data/options; limit for configured resources. No partial return on invalid late data. Stateless synchronous buffered operations O(input+output), with encoded chunks to avoid per-character arrays; decoder validation traverses input twice and keeps only bounded integer bit accumulators. Large data should be chunked at protocol-level full-group boundaries by the caller or processed in an application worker. No hidden services or runtime dependencies.

## Complete public API

Configure through these exported interfaces; no internal source edits are necessary.

```ts
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
export declare class Base32Error extends Error {
  readonly code: 'invalid' | 'limit';
  constructor(code: 'invalid' | 'limit', message: string);
}
export declare function encodeBase32(input: Uint8Array, options?: Base32EncodeOptions): string;
export declare function decodeBase32(text: string, options?: Base32DecodeOptions): Uint8Array;
```

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
