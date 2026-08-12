<script lang="ts">
import { onMount, tick } from "svelte";
import { toggleAt, toggleLine } from "./lib/checkbox.ts";
import type { Config } from "./lib/config.ts";
import { decrypt, encrypt, importKey } from "./lib/crypto.ts";
import { read, write } from "./lib/github.ts";

interface Props {
  readonly config: Config;
  readonly secret: string;
  readonly onsetup: () => void;
}

const { config, secret, onsetup }: Props = $props();

/** Long enough that a burst of typing lands as one commit, short enough to forget about. */
const SAVE_DELAY = 2000;

type Status =
  | { readonly kind: "loading" }
  | { readonly kind: "clean" }
  | { readonly kind: "dirty" }
  | { readonly kind: "saving" }
  | { readonly kind: "saved"; readonly at: Date }
  | { readonly kind: "error"; readonly message: string };

let text = $state("");
let status = $state<Status>({ kind: "loading" });
let loaded = $state(false);
let area: HTMLTextAreaElement | undefined = $state();

// Not $state: none of this is rendered, and making the in-flight flags
// reactive would only invite re-entrancy through effects.
let key: CryptoKey | null = null;
let sha: string | null = null;
let dirty = false;
let saving = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function describe(cause: unknown): string {
  if (cause instanceof DOMException && cause.name === "OperationError") {
    return "wrong key for this file";
  }
  if (cause instanceof TypeError) return "no connection";
  return cause instanceof Error ? cause.message : String(cause);
}

async function load(): Promise<void> {
  status = { kind: "loading" };
  try {
    key ??= await importKey(secret);
    const blob = await read(config);
    // No file yet is the ordinary first run, not an error -- it gets created
    // by the first save.
    text = blob ? await decrypt(key, blob.bytes) : "";
    sha = blob?.sha ?? null;
    dirty = false;
    loaded = true;
    status = { kind: "clean" };
  } catch (cause) {
    status = { kind: "error", message: describe(cause) };
  }
}

async function save(): Promise<void> {
  clearTimeout(timer);
  if (!key || !dirty || saving) return;
  saving = true;
  status = { kind: "saving" };
  // The text can move on while the request is in flight, so what was actually
  // written has to be compared against what is on screen afterwards.
  const written = text;
  let ok = false;
  try {
    sha = await write(config, await encrypt(key, written), sha, "notes");
    ok = true;
    if (written === text) {
      dirty = false;
      status = { kind: "saved", at: new Date() };
    } else {
      status = { kind: "dirty" };
    }
  } catch (cause) {
    // No automatic retry: a bad token or a conflict would just loop against
    // the API. Typing again, or ⌘S, asks for another attempt.
    status = { kind: "error", message: describe(cause) };
  } finally {
    saving = false;
  }
  if (ok && dirty) schedule();
}

function schedule(): void {
  clearTimeout(timer);
  timer = setTimeout(() => void save(), SAVE_DELAY);
}

function touch(): void {
  dirty = true;
  status = { kind: "dirty" };
  schedule();
}

/** Swaps the text and puts the caret back where the user left it. */
async function replace(next: string, caret: number): Promise<void> {
  text = next;
  touch();
  await tick();
  area?.setSelectionRange(caret, caret);
}

function click(): void {
  // A click sets the caret on whichever side of the glyph was nearer, and a
  // drag is a selection rather than a tap on a box.
  if (!area || area.selectionStart !== area.selectionEnd) return;
  const caret = area.selectionStart;
  const next = toggleAt(text, caret);
  if (next !== null) void replace(next, caret);
}

function keydown(event: KeyboardEvent): void {
  const mod = event.metaKey || event.ctrlKey;
  if (mod && event.key === "s") {
    event.preventDefault();
    void save();
  } else if (mod && event.key === "Enter" && area) {
    event.preventDefault();
    const edit = toggleLine(text, area.selectionStart);
    void replace(edit.text, edit.caret);
  }
}

function reload(): void {
  if (dirty && !confirm("Discard unsaved changes and reload from GitHub?")) return;
  dirty = false;
  void load();
}

onMount(() => {
  void load();

  // The phone is where edits get lost: switching apps can kill the tab without
  // ever firing beforeunload, but it always goes hidden first.
  const flush = (): void => {
    if (document.visibilityState === "hidden") void save();
  };
  const guard = (event: BeforeUnloadEvent): void => {
    if (dirty) event.preventDefault();
  };
  document.addEventListener("visibilitychange", flush);
  window.addEventListener("beforeunload", guard);

  return () => {
    document.removeEventListener("visibilitychange", flush);
    window.removeEventListener("beforeunload", guard);
    clearTimeout(timer);
  };
});

const clock = (at: Date): string =>
  at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
</script>

<div class="bar">
  <h1>jerv</h1>
  <span class="rule"></span>
  <span class="status">
    {#if status.kind === "loading"}
      <span class="dim">loading</span>
    {:else if status.kind === "saving"}
      <span class="dim">saving</span>
    {:else if status.kind === "saved"}
      <span class="ok">saved {clock(status.at)}</span>
    {:else if status.kind === "dirty"}
      <span class="dim">unsaved</span>
    {:else if status.kind === "error"}
      <span class="bad">{status.message}</span>
    {:else}
      <span class="dim">·</span>
    {/if}
  </span>
</div>

<textarea
  bind:this={area}
  bind:value={text}
  readonly={!loaded}
  oninput={touch}
  onclick={click}
  onkeydown={keydown}
  placeholder={loaded ? "" : "…"}
  autocapitalize="sentences"
  autocorrect="off"
  spellcheck="false"
></textarea>

<nav>
  <button class="link" onclick={reload}>reload</button>
  <button class="link" onclick={onsetup}>setup</button>
  <span>⌘S save · ⌘⏎ checkbox</span>
</nav>
