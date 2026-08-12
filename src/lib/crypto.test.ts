import assert from "node:assert/strict";
import { test } from "node:test";
import { toBase64 } from "./base64.ts";
import { decrypt, encrypt, generateKey, importKey } from "./crypto.ts";

test("text survives a round trip", async () => {
  const key = await importKey(generateKey());
  const note = `${"\u{F0131}"} milk\nnorsk: æøå\n`;
  assert.equal(await decrypt(key, await encrypt(key, note)), note);
});

test("a different key cannot read it", async () => {
  const bytes = await encrypt(await importKey(generateKey()), "secret");
  const other = await importKey(generateKey());
  await assert.rejects(() => decrypt(other, bytes));
});

test("the same text encrypts differently every time", async () => {
  const key = await importKey(generateKey());
  const a = await encrypt(key, "same");
  const b = await encrypt(key, "same");
  assert.notEqual(toBase64(a), toBase64(b));
});

test("tampering is detected rather than decrypted", async () => {
  const key = await importKey(generateKey());
  const bytes = await encrypt(key, "important");
  const last = bytes.length - 1;
  bytes[last] = (bytes[last] ?? 0) ^ 1;
  await assert.rejects(() => decrypt(key, bytes));
});

test("keys that are not ours are rejected before use", async () => {
  await assert.rejects(() => importKey("github_pat_11ABCDEFG"), /must start with/);
  await assert.rejects(() => importKey("jerv1.tooshort"), /32 bytes/);
});
