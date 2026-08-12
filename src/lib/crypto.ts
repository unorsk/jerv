/**
 * AES-256-GCM over the whole note, one key, held only on your devices.
 *
 * The key is 32 random bytes -- not derived from anything, so there is no
 * password to guess and nothing published anywhere that an attacker could
 * grind against offline. The flip side is that the key is the only copy: lose
 * it on every device without having written it down and the notes are gone.
 * That trade is the point, but it is a real one.
 *
 * Each save re-encrypts everything under a fresh random IV. GCM's 96-bit IV
 * would only start to worry at billions of encryptions; a note saved every few
 * seconds for a lifetime is nowhere near that.
 */

import { type Bytes, fromBase64Url, toBase64Url } from "./base64.ts";

const ALGORITHM = "AES-GCM";
const KEY_BYTES = 32;
const IV_BYTES = 12;

/** Marks a key string as ours, so pasting the GitHub token in by mistake fails loudly. */
const PREFIX = "jerv1.";

/** A fresh key, in the form the user writes down and pastes into their next device. */
export function generateKey(): string {
  return PREFIX + toBase64Url(crypto.getRandomValues(new Uint8Array(KEY_BYTES)));
}

export async function importKey(encoded: string): Promise<CryptoKey> {
  const body = encoded.trim();
  if (!body.startsWith(PREFIX)) throw new Error(`key must start with "${PREFIX}"`);
  const bytes = fromBase64Url(body.slice(PREFIX.length));
  if (bytes.length !== KEY_BYTES) throw new Error(`key must be ${KEY_BYTES} bytes`);
  return crypto.subtle.importKey("raw", bytes, ALGORITHM, false, ["encrypt", "decrypt"]);
}

/** Ciphertext, laid out as iv ++ ct -- self-contained, so the file needs no header. */
export async function encrypt(key: CryptoKey, text: string): Promise<Bytes> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const body = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    new TextEncoder().encode(text),
  );
  const out = new Uint8Array(iv.length + body.byteLength);
  out.set(iv);
  out.set(new Uint8Array(body), iv.length);
  return out;
}

export async function decrypt(key: CryptoKey, bytes: Bytes): Promise<string> {
  if (bytes.length <= IV_BYTES) throw new Error("ciphertext too short");
  const plain = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: bytes.subarray(0, IV_BYTES) },
    key,
    bytes.subarray(IV_BYTES),
  );
  return new TextDecoder().decode(plain);
}
