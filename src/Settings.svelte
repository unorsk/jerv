<script lang="ts">
import {
  type Config,
  dropRepo,
  forget,
  guessRepo,
  newRepo,
  putRepo,
  type Repo,
} from "./lib/config.ts";
import RepoForm from "./RepoForm.svelte";

interface Props {
  readonly config: Config;
  readonly secret: string | null;
  readonly onchange: (config: Config) => void;
  readonly onkey: (secret: string) => void;
  /** Null while there is no repo to go back to -- the first run. */
  readonly onclose: (() => void) | null;
}

const { config, secret, onchange, onkey, onclose }: Props = $props();

// Nothing to list on the first run, so it opens straight into the form: the
// same single screen jerv has always started with. The address bar is only a
// useful guess for that first repo.
// svelte-ignore state_referenced_locally
let editing = $state<Repo | null>(
  config.repos.length === 0 ? { ...newRepo(), ...guessRepo() } : null,
);

function save(repo: Repo, key: string): void {
  if (key) onkey(key);
  onchange(putRepo(config, repo));
  editing = null;
}

function remove(id: string): void {
  if (!confirm("Remove this repo from this device? The files stay on GitHub.")) return;
  onchange(dropRepo(config, id));
  editing = null;
}

function open(id: string): void {
  onchange({ ...config, current: id });
  onclose?.();
}

const encrypting = $derived(config.repos.some((repo) => repo.encrypted));

function wipe(): void {
  if (!confirm("Forget every repo and the key on this device? The key cannot be recovered.")) {
    return;
  }
  forget();
  location.reload();
}
</script>

<div class="bar">
  <h1>jerv</h1>
  <span class="where dim">{editing ? "repo" : "settings"}</span>
  <span class="rule"></span>
  <!-- Missing is only a problem if something here is encrypted; a device with
       plain repos only never needs one. -->
  <span class="status" class:dim={secret || !encrypting} class:bad={!secret && encrypting}>
    {secret ? "key set" : "no key"}
  </span>
</div>

{#if editing}
  {#key editing.id}
    <RepoForm
      repo={editing}
      {secret}
      onsave={save}
      oncancel={config.repos.length > 0 ? () => (editing = null) : null}
      onremove={config.repos.some((repo) => repo.id === editing?.id)
        ? () => editing && remove(editing.id)
        : null}
    />
  {/key}
{:else}
  <div class="pane">
    <button
      class="toggle"
      aria-pressed={config.autosave}
      onclick={() => onchange({ ...config, autosave: !config.autosave })}
    >
      [{config.autosave ? "x" : " "}] autosave
    </button>
    <p class="note">Off: nothing is written until <em>save</em> or ⌘S. On: two seconds after you stop typing, and again when the tab goes to the background.</p>

    <div class="bar section">
      <span class="dim">repos</span>
      <span class="rule"></span>
      <span class="dim">{config.repos.length}</span>
    </div>

    <div class="listing">
      {#each config.repos as repo (repo.id)}
        <div class="entry" class:on={repo.id === config.current}>
          <span class="name">{repo.owner}/{repo.repo}</span>
          <span class="dim">{repo.encrypted ? "enc" : "plain"}</span>
          <button class="link" onclick={() => open(repo.id)}>open</button>
          <button class="link" onclick={() => (editing = repo)}>edit</button>
        </div>
      {/each}
    </div>

    <div class="row">
      <button onclick={() => (editing = newRepo())}>add repo</button>
      {#if onclose}
        <button class="ghost" onclick={onclose}>done</button>
      {/if}
      <button class="link push" onclick={wipe}>forget this device</button>
    </div>
  </div>
{/if}
