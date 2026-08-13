<script lang="ts">
import { type Config, currentRepo, type Repo } from "./lib/config.ts";
import { type Entry, explain, list } from "./lib/github.ts";

interface Props {
  readonly config: Config;
  readonly onselect: (id: string) => void;
  readonly onopen: (path: string) => void;
  readonly onclose: () => void;
  readonly onsettings: () => void;
}

const { config, onselect, onopen, onclose, onsettings }: Props = $props();

const repo = $derived(currentRepo(config));

const folder = (path: string): string => path.slice(0, Math.max(0, path.lastIndexOf("/")));

// Browsing starts where the open file lives, which is usually where the next
// one is too.
// svelte-ignore state_referenced_locally
let dir = $state(folder(repo?.path ?? ""));
let entries = $state<readonly Entry[]>([]);
let status = $state<"loading" | "ok" | "error">("loading");
let message = $state("");
let typed = $state("");

// A slow listing must not land after a faster one from a later directory.
let ticket = 0;

async function load(where: Repo | null, at: string): Promise<void> {
  if (!where) return;
  const mine = ++ticket;
  status = "loading";
  try {
    const found = await list(where, at);
    if (mine !== ticket) return;
    entries = found;
    status = "ok";
  } catch (cause) {
    if (mine !== ticket) return;
    entries = [];
    message = explain(cause);
    status = "error";
  }
}

// The arguments are read here, synchronously, which is what makes this rerun
// when the directory or the repo changes.
$effect(() => void load(repo, dir));

function select(id: string): void {
  onselect(id);
  dir = folder(config.repos.find((other) => other.id === id)?.path ?? "");
}

function enter(entry: Entry): void {
  if (entry.kind === "dir") dir = entry.path;
  else onopen(entry.path);
}

function submit(event: SubmitEvent): void {
  event.preventDefault();
  const path = typed.trim().replace(/^\/+/, "");
  // A path that does not exist yet is how a new file is made: the editor opens
  // it empty and the first save creates it.
  if (path) onopen(path);
}

/** Terminal widths: three characters and a unit, never a wrapped column. */
function size(bytes: number): string {
  if (bytes < 1024) return `${bytes}`;
  const k = bytes / 1024;
  return k < 1000 ? `${k < 10 ? k.toFixed(1) : Math.round(k)}k` : `${(k / 1024).toFixed(1)}M`;
}
</script>

<div class="bar">
  <h1>jerv</h1>
  <span class="where dim">files</span>
  <span class="rule"></span>
  <span class="status">
    {#if status === "loading"}
      <span class="dim">loading</span>
    {:else if status === "error"}
      <span class="bad">{message}</span>
    {:else}
      <span class="dim">{entries.length} items</span>
    {/if}
  </span>
</div>

{#if config.repos.length > 1}
  <div class="tabs">
    {#each config.repos as other (other.id)}
      <button class="link" class:on={other.id === repo?.id} onclick={() => select(other.id)}>
        {other.owner}/{other.repo}
      </button>
    {/each}
  </div>
{/if}

<div class="crumb dim">{repo?.owner}/{repo?.repo}@{repo?.branch}:/{dir}</div>

<div class="listing">
  {#if dir}
    <button class="entry" onclick={() => (dir = folder(dir))}>
      <span class="name">../</span>
    </button>
  {/if}

  {#each entries as entry (entry.path)}
    <button class="entry" class:on={entry.path === repo?.path} onclick={() => enter(entry)}>
      <span class="name">{entry.name}{entry.kind === "dir" ? "/" : ""}</span>
      {#if entry.kind === "file"}<span class="dim">{size(entry.size)}</span>{/if}
    </button>
  {/each}

  {#if status === "ok" && entries.length === 0}
    <p class="note">nothing here</p>
  {/if}
</div>

<form onsubmit={submit}>
  <div class="row">
    <input
      bind:value={typed}
      placeholder={dir ? `${dir}/new.md` : "new.md"}
      aria-label="path to open or create"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
    />
    <button type="submit">open</button>
  </div>
</form>

<nav>
  <button class="link" onclick={onclose}>editor</button>
  <button class="link" onclick={onsettings}>settings</button>
  <span>a path that does not exist yet is created on first save</span>
</nav>
