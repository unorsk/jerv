<script lang="ts">
import Editor from "./Editor.svelte";
import Files from "./Files.svelte";
import {
  type Config,
  currentRepo,
  loadConfig,
  loadKey,
  putRepo,
  saveConfig,
  saveKey,
} from "./lib/config.ts";
import Settings from "./Settings.svelte";

let config = $state<Config>(loadConfig());
let secret = $state<string | null>(loadKey());
let view = $state<"edit" | "files" | "settings">("edit");

const repo = $derived(currentRepo(config));

/** localStorage is written wherever the config changes, so it cannot drift. */
function change(next: Config): void {
  saveConfig(next);
  config = next;
}

function key(next: string): void {
  saveKey(next);
  secret = next;
}

/** Opening a file remembers it: each repo reopens where it was left. */
function open(path: string): void {
  if (repo) change(putRepo(config, { ...repo, path }));
  view = "edit";
}
</script>

{#if view === "settings" || !repo}
  <Settings
    {config}
    {secret}
    onchange={change}
    onkey={key}
    onclose={repo ? () => (view = "edit") : null}
  />
{:else if view === "files"}
  <Files
    {config}
    onselect={(id) => change({ ...config, current: id })}
    onopen={open}
    onclose={() => (view = "edit")}
    onsettings={() => (view = "settings")}
  />
{:else}
  <!-- Keyed so changing the repo, the file or the key remounts the editor and
       reloads, rather than leaving the previous file's text on screen. -->
  {#key `${repo.id}:${repo.path}:${secret}`}
    <Editor
      {repo}
      {secret}
      autosave={config.autosave}
      onfiles={() => (view = "files")}
      onsettings={() => (view = "settings")}
    />
  {/key}
{/if}
