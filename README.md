# jerv

One encrypted note, kept in a GitHub repo, edited from a browser.

The file is public and unreadable. Encryption happens in the page, so GitHub
stores ciphertext and never sees anything else. There is one note — no titles,
no dates, no list of files.

## Setup

**1. A repo, and Pages turned on.** Settings → Pages → Source: *GitHub Actions*.
Push to `main` and `.github/workflows/deploy.yml` builds and publishes.

**2. A token.** Settings → Developer settings → Personal access tokens →
Fine-grained. Only this repository, and only **Contents: read and write**. The
token can rewrite the repo, so treat it like a password — but it cannot read
your notes.

**3. Open the page.** It asks for a key and a token, and prefills the repo from
the URL. Press **new** to generate a key, and **write it down**. Then paste the
same key and a token on the phone.

## The key

32 random bytes, generated in the browser, held in `localStorage` on each
device. It is never sent to GitHub and never derived from a password, so there
is nothing published for anyone to grind against offline.

The cost is that the key is the only copy. Lose it everywhere without a backup
and the notes are unrecoverable — no reset, no recovery, by construction.

A GitHub token and a key are separate on purpose: they fail differently. A
leaked token lets someone overwrite the file, and can be revoked from GitHub. A
leaked key lets someone read it, and cannot.

## Using it

Typing saves two seconds later, and again when the tab goes to the background.
`⌘S` saves now. `⌘⏎` puts a checkbox on the current line, or ticks the one
already there; clicking a checkbox toggles it too.

Nothing merges. If the same note is edited on two devices at once, the second
save is refused with a conflict rather than overwriting — hit **reload** and
redo the losing edit.

## Development

```
npm run dev        # local server
npm run check      # lint, typecheck, test, build
npm run font       # rebuild the subset font (needs uv)
```

The font is JetBrains Mono Nerd Font, subset from 2.4 MB to 23 KB and inlined
into the stylesheet, so the whole app is two requests and no third-party
hosts. `tools/build-font.py` regenerates it from `~/Library/Fonts`; the result
is committed, so an ordinary build never needs Python.
