import assert from "node:assert/strict";
import { test } from "node:test";
import { type Bytes, fromBase64, fromBase64Url, toBase64, toBase64Url } from "./base64.ts";

const bytes = (...values: number[]): Bytes => new Uint8Array(values);

test("round trips every byte value", () => {
  const all = new Uint8Array(256).map((_, i) => i);
  assert.deepEqual(fromBase64(toBase64(all)), all);
  assert.deepEqual(fromBase64Url(toBase64Url(all)), all);
});

test("the url alphabet avoids + / and padding", () => {
  // 0xFB 0xFF encodes as "+/8" in the standard alphabet.
  const encoded = toBase64Url(bytes(0xfb, 0xff));
  assert.match(encoded, /^[\w-]+$/);
  assert.deepEqual(fromBase64Url(encoded), bytes(0xfb, 0xff));
});

test("decodes the wrapped base64 GitHub returns", () => {
  const wrapped = `${toBase64(bytes(1, 2, 3, 4, 5))}\n`.replace(/(.{2})/, "$1\n");
  assert.deepEqual(fromBase64(wrapped), bytes(1, 2, 3, 4, 5));
});

test("survives a payload too big to spread over an argument list", () => {
  const big = new Uint8Array(200_000).fill(7);
  assert.deepEqual(fromBase64(toBase64(big)), big);
});
