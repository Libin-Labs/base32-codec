import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeBase32, decodeBase32, Base32Error } from '../dist/esm/index.js';
const encode = (value) => new TextEncoder().encode(value);
test('RFC4648 base32 standard and extended-hex vectors match exactly', () => {
  const vectors = [
    ['', '', ''],
    ['f', 'MY======', 'CO======'],
    ['fo', 'MZXQ====', 'CPNG===='],
    ['foo', 'MZXW6===', 'CPNMU==='],
    ['foob', 'MZXW6YQ=', 'CPNMUOG='],
    ['fooba', 'MZXW6YTB', 'CPNMUOJ1'],
    ['foobar', 'MZXW6YTBOI======', 'CPNMUOJ1E8======'],
  ];
  for (const [source, standard, hex] of vectors) {
    assert.equal(encodeBase32(encode(source)), standard);
    assert.equal(encodeBase32(encode(source), { alphabet: 'base32hex' }), hex);
    assert.deepEqual(decodeBase32(standard), encode(source));
    assert.deepEqual(decodeBase32(hex, { alphabet: 'base32hex' }), encode(source));
  }
});
test('all supported padding policies enforce exact encoded shape', () => {
  assert.equal(encodeBase32(encode('f'), { padding: false }), 'MY');
  assert.deepEqual(decodeBase32('MY', { padding: 'optional' }), encode('f'));
  assert.deepEqual(decodeBase32('MY', { padding: 'forbidden' }), encode('f'));
  assert.deepEqual(decodeBase32('MY======', { padding: 'optional' }), encode('f'));
  for (const text of ['MY', 'MY=====', 'MY=======', 'MY=AAAAA', 'MZXW6YTB='])
    assert.throws(() => decodeBase32(text), { code: 'invalid' });
  assert.throws(() => decodeBase32('MY======', { padding: 'forbidden' }), Base32Error);
});
test('alphabet case handling never accepts whitespace aliases or other alphabets', () => {
  assert.deepEqual(decodeBase32('my======'), encode('f'));
  assert.throws(() => decodeBase32('my======', { caseInsensitive: false }), Base32Error);
  for (const text of [
    'MY======\n',
    ' MY======',
    'M0======',
    'M1======',
    'M8======',
    'M9======',
    'MÉ======',
  ])
    assert.throws(() => decodeBase32(text), Base32Error);
});
test('impossible residues and nonzero unused bits are rejected', () => {
  for (const text of ['A', 'AAA', 'AAAAAA'])
    assert.throws(() => decodeBase32(text, { padding: 'optional' }), Base32Error);
  for (const text of ['MZ======', 'MZXR====', 'MZXW7===', 'MZXW6YR='])
    assert.throws(() => decodeBase32(text), { code: 'invalid' });
});
test('full byte range and all chunk residual lengths agree with independent bit oracle', () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  for (let length = 0; length < 300; length++) {
    const bytes = Uint8Array.from({ length }, (_, index) => (index * 97 + length) & 255);
    let bits = [...bytes].map((value) => value.toString(2).padStart(8, '0')).join(''),
      expected = '';
    while (bits.length) {
      expected += alphabet[parseInt(bits.slice(0, 5).padEnd(5, '0'), 2)];
      bits = bits.slice(5);
    }
    expected = expected.padEnd(Math.ceil(expected.length / 8) * 8, '=');
    assert.equal(encodeBase32(bytes), expected);
    assert.deepEqual(decodeBase32(expected), bytes);
  }
});
test('bytes and character budgets succeed at exact thresholds and reject one below', () => {
  const bytes = encode('foo'),
    text = 'MZXW6===';
  assert.equal(encodeBase32(bytes, { maxBytes: 3, maxCharacters: 8 }), text);
  assert.deepEqual(decodeBase32(text, { maxBytes: 3, maxCharacters: 8 }), bytes);
  for (const options of [{ maxBytes: 2 }, { maxCharacters: 7 }]) {
    assert.throws(() => encodeBase32(bytes, options), { code: 'limit' });
    assert.throws(() => decodeBase32(text, options), { code: 'limit' });
  }
  assert.equal(encodeBase32(new Uint8Array(), { maxBytes: 0, maxCharacters: 0 }), '');
});
test('invalid input options and types fail explicitly', () => {
  for (const options of [
    { alphabet: 'crockford' },
    { maxBytes: -1 },
    { maxCharacters: NaN },
    { maxBytes: 67108865 },
  ])
    assert.throws(() => encodeBase32(new Uint8Array(), options), Base32Error);
  assert.throws(() => encodeBase32('foo'), Base32Error);
  assert.throws(() => decodeBase32(new Uint8Array()), Base32Error);
  assert.throws(() => encodeBase32(new Uint8Array(), { padding: 'yes' }), Base32Error);
  assert.throws(() => decodeBase32('', { padding: 'bad' }), Base32Error);
  assert.throws(() => decodeBase32('', { caseInsensitive: 1 }), Base32Error);
});
test('decoded buffers are detached and do not mutate encoded source bytes', () => {
  const bytes = Uint8Array.of(0, 1, 254, 255),
    copy = bytes.slice(),
    text = encodeBase32(bytes);
  const decoded = decodeBase32(text);
  decoded.fill(0);
  assert.deepEqual(bytes, copy);
  assert.deepEqual(decodeBase32(text), copy);
});
