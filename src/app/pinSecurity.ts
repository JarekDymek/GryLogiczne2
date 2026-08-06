const ALGORITHM = "PBKDF2";
const HASH = "SHA-256";
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export function legacyHashPin(pin: string): string {
  let hash = 2166136261;
  for (const character of `mow-malbork:${pin}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

async function derivePin(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    { name: ALGORITHM },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: ALGORITHM, hash: HASH, salt: copyToArrayBuffer(salt), iterations },
    material,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function createPinHash(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derivePin(pin, salt, ITERATIONS);
  return `pbkdf2-sha256:${ITERATIONS}:${bytesToBase64(salt)}:${bytesToBase64(derived)}`;
}

export function isLegacyPinHash(value: string): boolean {
  return value.startsWith("fnv1a:");
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (isLegacyPinHash(stored)) return legacyHashPin(pin) === stored;
  const [format, iterationsValue, saltValue, expectedValue] = stored.split(":");
  const iterations = Number(iterationsValue);
  if (
    format !== "pbkdf2-sha256"
    || !Number.isInteger(iterations)
    || iterations < 100_000
    || iterations > 1_000_000
    || !saltValue
    || !expectedValue
  ) return false;
  try {
    const actual = await derivePin(pin, base64ToBytes(saltValue), iterations);
    const expected = base64ToBytes(expectedValue);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}
