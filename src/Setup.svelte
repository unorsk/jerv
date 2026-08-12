<script lang="ts">
import { type Config, DEFAULT_BRANCH, DEFAULT_PATH, guessRepo } from "./lib/config.ts";
import { generateKey, importKey } from "./lib/crypto.ts";

interface Props {
  readonly config: Config | null;
  readonly secret: string | null;
  readonly ondone: (config: Config, secret: string) => void;
  readonly oncancel: (() => void) | null;
}

const { config, secret, ondone, oncancel }: Props = $props();

const guess = guessRepo();

// Seeded from the props once and then owned by the form -- this component is
// mounted fresh each time setup is opened, so there is nothing to keep in sync.
// svelte-ignore state_referenced_locally
let form = $state({
  key: secret ?? "",
  token: config?.token ?? "",
  owner: config?.owner ?? guess.owner,
  repo: config?.repo ?? guess.repo,
  branch: config?.branch ?? DEFAULT_BRANCH,
  path: config?.path ?? DEFAULT_PATH,
});

let generated = $state(false);
let error = $state("");

function generate(): void {
  form.key = generateKey();
  generated = true;
}

async function submit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  error = "";
  try {
    // Checked here rather than at first use, so a typo fails on this screen
    // instead of looking like a corrupt file later.
    await importKey(form.key);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
    return;
  }
  if (!form.token.trim() || !form.owner.trim() || !form.repo.trim()) {
    error = "token, owner and repo are all needed";
    return;
  }
  ondone(
    {
      token: form.token.trim(),
      owner: form.owner.trim(),
      repo: form.repo.trim(),
      branch: form.branch.trim() || DEFAULT_BRANCH,
      path: form.path.trim() || DEFAULT_PATH,
    },
    form.key.trim(),
  );
}
</script>

<div class="bar">
  <h1>jerv</h1>
  <span class="rule"></span>
  <span class="status dim">setup</span>
</div>

<form onsubmit={submit}>
  <div>
    <label for="key">key</label>
    <div class="row">
      <input
        id="key"
        bind:value={form.key}
        placeholder="jerv1…"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
      />
      <button type="button" class="ghost" onclick={generate}>new</button>
    </div>
  </div>

  {#if generated}
    <p class="note warn">
      Write this down now. It is the only copy — it never goes to GitHub, and
      nothing can recover your notes without it.
    </p>
  {:else}
    <p class="note">
      The same key on every device. Press <em>new</em> only on the first one: a new
      key cannot read notes written under the old one.
    </p>
  {/if}

  <div>
    <label for="token">github token</label>
    <input
      id="token"
      type="password"
      bind:value={form.token}
      placeholder="github_pat_…"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
    />
  </div>
  <p class="note">
    Fine-grained token, this repo only, <em>Contents: read and write</em>. It can
    rewrite the repo, so treat it like a password — but it cannot read your notes.
  </p>

  <div class="pair">
    <div>
      <label for="owner">owner</label>
      <input id="owner" bind:value={form.owner} autocapitalize="off" autocorrect="off" spellcheck="false" />
    </div>
    <div>
      <label for="repo">repo</label>
      <input id="repo" bind:value={form.repo} autocapitalize="off" autocorrect="off" spellcheck="false" />
    </div>
  </div>

  <div class="pair">
    <div>
      <label for="branch">branch</label>
      <input id="branch" bind:value={form.branch} autocapitalize="off" autocorrect="off" spellcheck="false" />
    </div>
    <div>
      <label for="path">file</label>
      <input id="path" bind:value={form.path} autocapitalize="off" autocorrect="off" spellcheck="false" />
    </div>
  </div>

  {#if error}
    <p class="note bad">{error}</p>
  {/if}

  <div class="row">
    <button type="submit">open</button>
    {#if oncancel}
      <button type="button" class="ghost" onclick={oncancel}>cancel</button>
    {/if}
  </div>
</form>
