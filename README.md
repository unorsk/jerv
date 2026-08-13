# jerv

Notes and files, kept in GitHub repos, edited from a browser.

An encrypted repo is public and unreadable. Encryption happens in the page, so
GitHub stores ciphertext and never sees anything else. A plain repo stores what
you typed, which is what a private repo of ordinary files wants — open it,
browse it, edit a file, save it back.

## Setup

**1. A repo, and Pages turned on.** Settings → Pages → Source: *GitHub Actions*.
Push to `main` and `.github/workflows/deploy.yml` builds and publishes.

**2. A token.** Settings → Developer settings → Personal access tokens →
Fine-grained. Only this repository, and only **Contents: read and write**. The
token can rewrite the repo, so treat it like a password — but it cannot read an
encrypted note. Each repo carries its own, so adding a private one does not
widen the reach of any other.

**3. Open the page.** It asks for a repo and a token, and prefills the repo from
the URL. Leave **encrypt this repo** ticked for notes: press **new** to generate
a key, and **write it down**. Then paste the same key and a token on the phone.

## Repos

**settings** lists them: **add repo** for another one, **edit** to change a
token or a branch, **open** to switch the editor to it.

**files** browses whichever repo is open — directories a step at a time, a tap
to open a file, and a path box for one that does not exist yet, which the first
save creates. Each repo remembers the file it was left on.

Encryption is per repo, not per app. A repo of notes is ciphertext; a repo of
config files is text, readable by anything else that reads the repo. Changing
the setting on a repo that already has files in it does not rewrite them — the
next save writes the new format and everything written under the old one stops
being readable, so change it on an empty repo or expect to redo the contents.

## The key

32 random bytes, generated in the browser, held in `localStorage` on each
device. It is never sent to GitHub and never derived from a password, so there
is nothing published for anyone to grind against offline.

One key per device, shared by every encrypted repo — one thing to write down
rather than one per repo. Plain repos never touch it.

The cost is that the key is the only copy. Lose it everywhere without a backup
and the notes are unrecoverable — no reset, no recovery, by construction.

A GitHub token and a key are separate on purpose: they fail differently. A
leaked token lets someone overwrite the file, and can be revoked from GitHub. A
leaked key lets someone read it, and cannot.

## Using it

Nothing is written until you ask: **save**, or `⌘S`. Leaving a file with unsaved
changes asks first, and so does closing the tab. **autosave** in settings gives
the other behaviour — two seconds after you stop typing, and again when the tab
goes to the background, which is the one that suits a note you type into all
day.

`⌘⏎` puts a checkbox on the current line, or ticks the one already there;
clicking a checkbox toggles it too.

Nothing merges. If the same file is edited on two devices at once, the second
save is refused with a conflict rather than overwriting — hit **reload** and
redo the losing edit.

## Why an encrypted file is base64 and not raw ciphertext

The contents API is not a byte pipe. It runs charset detection over a blob, and
when it decides the bytes are text in a legacy encoding it returns them
transcoded to UTF-8 rather than as stored — while `sha` and `size` still
describe the real blob, so the mismatch is silent. Random ciphertext fools it
reliably; a 105-byte note came back as 166 bytes of would-be windows-1253 Greek
and failed to decrypt with the correct key.

Storing base64 means the blob is ASCII, which is already valid UTF-8, so there
is nothing left to detect. Plain text needs none of this — it is UTF-8 already,
which is why only the encrypted path is armoured. The git blobs API
(`/git/blobs/:sha`) does return the bytes faithfully and would also have worked,
but it needs the sha first, so reading would cost two requests instead of one.

## Development

```
npm run dev        # local server
npm run check      # lint, typecheck, test, build
npm run font       # rebuild the subset font (needs uv)
```

The font is JetBrains Mono Nerd Font, whole — every icon in it is one you can
paste into a note and see, rather than one the build had to think of in
advance. `tools/build-font.py` compresses it to woff2 (2.4 MB of TTF to about
1 MB) and nothing else; the result is committed, so an ordinary build never
needs Python.

It is served as its own request rather than inlined into the stylesheet: a
megabyte of base64 would cost a third again and go stale with every deploy.
Text does not wait for it — the stylesheet declares two faces off the one file,
so words swap in from the system monospace immediately and only the icon planes
block, since nothing on the system could stand in for those. Still no
third-party hosts.
