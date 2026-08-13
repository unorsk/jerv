/**
 * Text in, bytes out -- the one place that knows whether a repo is encrypted.
 *
 * An encrypted repo stores base64-armoured ciphertext; a plain one stores the
 * text as UTF-8, exactly as written, so the file is an ordinary file that
 * anything else can read. The choice is per repo rather than global because
 * the reasons differ: a note wants to be unreadable, and a config file in a
 * private repo wants to be readable by whatever consumes it.
 */

import { type Bytes, fromBase64, toBase64 } from "./base64.ts";
import { decrypt, encrypt } from "./crypto.ts";

/** Enough to read on github.com without a horizontal scrollbar. */
const COLUMNS = 76;

/**
 * Ciphertext as base64 ASCII, which is what actually gets stored.
 *
 * The contents API is not a byte pipe. It runs charset detection over the blob
 * and, when it decides the bytes are text in some legacy encoding, returns them
 * transcoded to UTF-8 instead of as stored -- the `sha` and `size` still
 * describe the real blob, so the mismatch is silent. Random ciphertext fools
 * the detector reliably: a note came back as though it had been windows-1253
 * Greek, 105 bytes arriving as 166, and would not decrypt.
 *
 * ASCII is already valid UTF-8, so there is nothing left for the detector to
 * do and the round trip is exact. Plain text needs none of this: it is UTF-8
 * already, which is why only the encrypted path is armoured.
 */
export function armour(bytes: Bytes): Bytes {
  const base64 = toBase64(bytes);
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += COLUMNS) lines.push(base64.slice(i, i + COLUMNS));
  return new TextEncoder().encode(`${lines.join("\n")}\n`);
}

/** Inverse of `armour`; fromBase64 ignores the line breaks. */
export function unarmour(bytes: Bytes): Bytes {
  try {
    return fromBase64(new TextDecoder().decode(bytes));
  } catch {
    // Anything else in the file is a wrong path, or a file written by a version
    // that stored raw ciphertext. Neither is a decryption problem, and saying
    // "wrong key" about either would send you looking in the wrong place.
    throw new Error("file is not jerv ciphertext");
  }
}

export const decode = async (key: CryptoKey | null, bytes: Bytes): Promise<string> =>
  key ? decrypt(key, unarmour(bytes)) : new TextDecoder().decode(bytes);

export const encode = async (key: CryptoKey | null, text: string): Promise<Bytes> =>
  key ? armour(await encrypt(key, text)) : new TextEncoder().encode(text);
