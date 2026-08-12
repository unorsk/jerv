/**
 * Base64 in two flavours, because two different things need it.
 *
 * The GitHub contents API speaks standard base64 and returns it wrapped at 60
 * columns, so decoding has to strip whitespace first. The key is shown to a
 * human and typed back in, so it uses the URL-safe alphabet with no padding --
 * nothing in it can then be mangled by a URL bar, a chat app, or a
 * double-click that stops at a "+".
 *
 * atob/btoa rather than Uint8Array.toBase64: the newer methods need Safari
 * 18.2, and the phone this runs on is the last place to find that out. Both are
 * lenient about missing padding, so the unpadded key decodes as-is.
 */

/**
 * A plain byte array. The explicit ArrayBuffer matters: WebCrypto will not
 * accept a view that might sit on a SharedArrayBuffer, and the unparameterised
 * Uint8Array might.
 */
export type Bytes = Uint8Array<ArrayBuffer>;

const strip = (text: string): string => text.replace(/\s+/g, "");

export function toBase64(bytes: Bytes): string {
  // Character at a time, not fromCharCode(...bytes): spreading a note-sized
  // array over the argument list overflows the stack.
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export const fromBase64 = (text: string): Bytes =>
  Uint8Array.from(atob(strip(text)), (char) => char.charCodeAt(0));

export const toBase64Url = (bytes: Bytes): string =>
  toBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

export const fromBase64Url = (text: string): Bytes =>
  fromBase64(strip(text).replaceAll("-", "+").replaceAll("_", "/"));
