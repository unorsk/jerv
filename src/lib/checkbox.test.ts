import assert from "node:assert/strict";
import { test } from "node:test";
import { BOX, toggleAt, toggleLine } from "./checkbox.ts";

const TICKED = "\u{F0132}";

test("a caret on either side of the glyph toggles it", () => {
  const text = `- ${BOX} milk`;
  // The glyph is astral, so the two sides are two indices apart.
  assert.equal(toggleAt(text, 2), `- ${TICKED} milk`);
  assert.equal(toggleAt(text, 4), `- ${TICKED} milk`);
});

test("toggling is its own inverse", () => {
  const text = `${BOX} a`;
  const once = toggleAt(text, 0);
  assert.ok(once !== null);
  assert.equal(toggleAt(once, 0), text);
});

test("ordinary text is left alone", () => {
  assert.equal(toggleAt("hello", 2), null);
  assert.equal(toggleAt("", 0), null);
});

test("the legacy font-awesome pair still toggles", () => {
  assert.equal(toggleAt("\uF096 x", 0), "\uF046 x");
});

test("a line with no box gains one after the indent", () => {
  const { text, caret } = toggleLine("  buy milk", 6);
  assert.equal(text, `  ${BOX} buy milk`);
  // The caret rides along with the text it was sitting in.
  assert.equal(text.slice(caret), "milk");
});

test("a line with a box toggles it, wherever the caret is on the line", () => {
  const start = `a\n${BOX} b\nc`;
  const { text, caret } = toggleLine(start, start.indexOf("b") + 1);
  assert.equal(text, `a\n${TICKED} b\nc`);
  assert.equal(caret, start.indexOf("b") + 1);
});

test("the first line is found when the caret is at index 0", () => {
  assert.equal(toggleLine("\nx", 0).text, `${BOX} \nx`);
});
