"""
Compress JetBrains Mono Nerd Font to woff2. The whole font, every glyph.

No subsetting: an icon that is in the font is one you can paste into a note and
see, rather than one this script had to think of in advance. woff2 is the only
thing done to it, and that is lossless -- 2.4 MB of TTF becomes about a third of
that over the wire, for a build step that is otherwise a no-op.

Run: uv run --with 'fonttools[woff]' tools/build-font.py
The output is committed, so a normal `npm run build` never needs Python.
"""

import os
import sys

from fontTools.ttLib import TTFont

SRC = os.path.expanduser("~/Library/Fonts/JetBrainsMonoNerdFont-Regular.ttf")
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "jbmono.woff2")


def main():
    if not os.path.exists(SRC):
        sys.exit(f"font not found: {SRC}")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    font = TTFont(SRC)
    font.flavor = "woff2"
    font.save(OUT)
    print(f"{OUT}: {os.path.getsize(OUT) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
