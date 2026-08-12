<script lang="ts">
import Editor from "./Editor.svelte";
import { type Config, loadConfig, loadKey, saveConfig, saveKey } from "./lib/config.ts";
import Setup from "./Setup.svelte";

let config = $state<Config | null>(loadConfig());
let secret = $state<string | null>(loadKey());
let editing = $state(false);

const ready = $derived(config !== null && secret !== null && !editing);

function done(next: Config, key: string): void {
  saveConfig(next);
  saveKey(key);
  config = next;
  secret = key;
  editing = false;
}
</script>

{#if ready && config && secret}
  <!-- Keyed so changing the repo or the key remounts the editor and reloads,
       rather than leaving the previous file's text on screen. -->
  {#key `${config.owner}/${config.repo}/${config.path}@${secret}`}
    <Editor {config} {secret} onsetup={() => (editing = true)} />
  {/key}
{:else}
  <Setup
    {config}
    {secret}
    ondone={done}
    oncancel={config && secret ? () => (editing = false) : null}
  />
{/if}
