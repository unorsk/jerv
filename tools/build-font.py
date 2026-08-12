"""
Subset JetBrains Mono Nerd Font down to what the editor actually draws.

The stock file is 2.4 MB because it carries every Nerd Font icon set. A notes
app needs Latin, a little punctuation, box drawing and the handful of icons in
GLYPHS below, which is a few dozen KB -- worth the build step when the page is
opened on a phone.

Run: uv run --with 'fonttools[woff]' tools/build-font.py
The output is committed, so a normal `npm run build` never needs Python.
"""

import os
import subprocess
import sys

SRC = os.path.expanduser("~/Library/Fonts/JetBrainsMonoNerdFont-Regular.ttf")
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "jbmono.woff2")

# Text: Latin-1 covers Norwegian, Latin Extended-A the rest of Europe. The
# symbol ranges are what a plain-text note plausibly contains -- dashes, quotes,
# arrows, box drawing for tables anyone pastes in.
RANGES = "U+0000-00FF,U+0100-017F,U+2010-205E,U+2190-21FF,U+2500-257F,U+2580-259F,U+25A0-25FF,U+2713-2718"

# Nerd Font icons, kept as an explicit list -- the icon planes are thousands of
# glyphs and a range would put the whole weight back.
#
# Two checkbox pairs: nf-md (U+F0131/U+F0132) is the one the editor toggles,
# nf-fa (U+F096/U+F046) is here so notes written with the other pair still
# render rather than showing tofu.
GLYPHS = [
    0xF0131,  # nf-md-checkbox_blank_outline
    0xF0132,  # nf-md-checkbox_marked
    0xF096,  # nf-fa-square_o
    0xF046,  # nf-fa-check_square_o
    0xF00C,  # nf-fa-check
    0xF00D,  # nf-fa-times
    0xF023,  # nf-fa-lock
    0xF09B,  # nf-fa-github
    0xF021,  # nf-fa-refresh
]


def main():
    if not os.path.exists(SRC):
        sys.exit(f"font not found: {SRC}")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    subprocess.run(
        [
            sys.executable,
            "-m",
            "fontTools.subset",
            SRC,
            f"--unicodes={RANGES}," + ",".join(f"U+{cp:04X}" for cp in GLYPHS),
            # Nothing here needs shaping beyond the default: no ligatures (they
            # would join -- and >= in a note), no contextual alternates.
            "--layout-features=",
            "--flavor=woff2",
            "--desubroutinize",
            f"--output-file={OUT}",
        ],
        check=True,
    )
    print(f"{OUT}: {os.path.getsize(OUT) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
