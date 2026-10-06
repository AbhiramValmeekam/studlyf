import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Format: scrypt$<log2N>$<r>$<p>$<salt b64url>$<hash b64url>
// Parameters live in the string so they can be raised later without invalidating old hashes.
const KEY_LEN = 64;
const R = 8;
const P = 1;

function derive(password, salt, log2N, r, p) {
  const N = 2 ** log2N;
  const options = { N, r, p, maxmem: 256 * N * r };
  return new Promise((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEY_LEN, options, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password, log2N) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, log2N, R, P);
  return ['scrypt', log2N, R, P, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password, stored) {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64url');
  const actual = await derive(password, Buffer.from(saltB64, 'base64url'), Number(n), Number(r), Number(p));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function needsRehash(stored, log2N) {
  return Number(stored.split('$')[1]) !== log2N;
}

let dummyHash;
/**
 * Burn the same CPU as a real check when the account doesn't exist, so login
 * response time doesn't reveal which emails are registered.
 */
export async function verifyAgainstDummy(password, log2N) {
  dummyHash ??= hashPassword('dummy-password-for-timing', log2N);
  await verifyPassword(password, await dummyHash);
  return false;
}
