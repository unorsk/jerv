import assert from "node:assert/strict";
import { test } from "node:test";
import { armour, decode, encode, unarmour } from "./content.ts";

const random = (length: number): Uint8Array<ArrayBuffer> =>
  crypto.getRandomValues(new Uint8Array(length));

test("ciphertext survives the trip through the stored file", () => {
  const bytes = random(105);
  assert.deepEqual(unarmour(armour(bytes)), bytes);
});

/**
 * The whole point of armouring. A blob that is not valid UTF-8 comes back from
 * the contents API transcoded rather than as stored, so anything written there
 * has to be plain ASCII.
 */
test("the stored file is ASCII, whatever the ciphertext looks like", () => {
  const stored = armour(random(200));
  assert.ok(stored.every((byte) => byte >= 0x0a && byte < 0x80));
  // Round-tripping it through a UTF-8 decode changes nothing, which is exactly
  // what stops GitHub's charset detection from having anything to do.
  const text = new TextDecoder().decode(stored);
  assert.deepEqual(new TextEncoder().encode(text), stored);
});

test("wraps into readable lines and ends with a newline", () => {
  const text = new TextDecoder().decode(armour(random(300)));
  assert.ok(text.endsWith("\n"));
  assert.ok(
    text
      .trimEnd()
      .split("\n")
      .every((line) => line.length <= 76),
  );
});

test("an empty note still round trips", () => {
  const bytes = random(0);
  assert.deepEqual(unarmour(armour(bytes)), bytes);
});

/** A plain repo stores the file as typed -- no armour, no envelope, no marker. */
test("without a key the file is the text itself", async () => {
  const text = "# notes\n\n- ø, ß, 汉字\n";
  const bytes = await encode(null, text);
  assert.equal(new TextDecoder().decode(bytes), text);
  assert.equal(await decode(null, bytes), text);
});
