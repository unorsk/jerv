/**
 * Checkbox glyphs, toggled in place.
 *
 * Both halves of a pair are the same length in UTF-16 -- the Material Design
 * pair is astral (two units each), the Font Awesome pair is not (one each) --
 * so flipping one never moves the caret or anything after it. That is what lets
 * a tap behave like a click on a real checkbox rather than a text edit.
 *
 * Written as escapes, never as literals: these live in the private use area,
 * so in a plain editor they are an invisible box that anything touching the
 * file is liable to mangle.
 */

export const BOX = "\u{F0131}"; // nf-md-checkbox_blank_outline
const TICKED = "\u{F0132}"; // nf-md-checkbox_marked

/** BOX/TICKED is what gets written; the second pair is read-only compatibility. */
const PAIRS: readonly (readonly [string, string])[] = [
  [BOX, TICKED],
  ["\uF096", "\uF046"], // nf-fa-square_o / nf-fa-check_square_o
];

function flip(char: string): string | null {
  for (const [off, on] of PAIRS) {
    if (char === off) return on;
    if (char === on) return off;
  }
  return null;
}

const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

/** Start of the code point covering `index`, stepping back off a low surrogate. */
function startAt(text: string, index: number): number | null {
  if (index < 0 || index >= text.length) return null;
  return index > 0 && isLowSurrogate(text.charCodeAt(index)) ? index - 1 : index;
}

/** Start of the code point that ends at `index`. */
function startBefore(text: string, index: number): number | null {
  if (index <= 0) return null;
  return index >= 2 && isLowSurrogate(text.charCodeAt(index - 1)) ? index - 2 : index - 1;
}

function charAt(text: string, start: number): string {
  const code = text.codePointAt(start);
  return code === undefined ? "" : String.fromCodePoint(code);
}

/**
 * Toggles the box the caret landed on, or returns null if it landed on
 * ordinary text. A click puts the caret on either side of the glyph depending
 * on which half was hit, so both sides count as a hit.
 */
export function toggleAt(text: string, caret: number): string | null {
  for (const start of [startAt(text, caret), startBefore(text, caret)]) {
    if (start === null) continue;
    const char = charAt(text, start);
    const next = flip(char);
    if (next) return text.slice(0, start) + next + text.slice(start + char.length);
  }
  return null;
}

export interface Edit {
  readonly text: string;
  readonly caret: number;
}

const lineStart = (text: string, caret: number): number =>
  caret <= 0 ? 0 : text.lastIndexOf("\n", caret - 1) + 1;

const lineEnd = (text: string, caret: number): number => {
  const index = text.indexOf("\n", caret);
  return index === -1 ? text.length : index;
};

function findBox(line: string): number {
  for (let i = 0; i < line.length; ) {
    const char = charAt(line, i);
    if (flip(char)) return i;
    i += char.length;
  }
  return -1;
}

/**
 * Toggles the current line's box, or gives the line one if it has none --
 * so the same key both makes a task and ticks it off. The box goes after any
 * indent, keeping nested lists lined up.
 */
export function toggleLine(text: string, caret: number): Edit {
  const start = lineStart(text, caret);
  const line = text.slice(start, lineEnd(text, caret));

  const found = findBox(line);
  if (found >= 0) {
    return { text: toggleAt(text, start + found) ?? text, caret };
  }

  const indent = /^[ \t]*/.exec(line)?.[0].length ?? 0;
  const at = start + indent;
  const insert = `${BOX} `;
  return {
    text: text.slice(0, at) + insert + text.slice(at),
    caret: caret >= at ? caret + insert.length : caret,
  };
}
