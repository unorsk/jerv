<script lang="ts">
import { DEFAULT_BRANCH, DEFAULT_PATH, type Repo } from "./lib/config.ts";
import { generateKey, importKey } from "./lib/crypto.ts";

interface Props {
  readonly repo: Repo;
  readonly secret: string | null;
  /** The key comes back too, since it is set here on a device's first repo. */
  readonly onsave: (repo: Repo, secret: string) => void;
  readonly oncancel: (() => void) | null;
  readonly onremove: (() => void) | null;
}

const { repo, secret, onsave, oncancel, onremove }: Props = $props();

// Seeded from the props once and then owned by the form -- this component is
// mounted fresh each time a repo is opened, so there is nothing to keep in sync.
// svelte-ignore state_referenced_locally
let form = $state({ ...repo, key: secret ?? "" });

let generated = $state(false);
let error = $state("");

function generate(): void {
  form.key = generateKey();
  generated = true;
}

async function submit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  error = "";
  if (!form.token.trim() || !form.owner.trim() || !form.repo.trim()) {
    error = "token, owner and repo are all needed";
    return;
  }
  if (form.encrypted) {
    try {
      // Checked here rather than at first use, so a typo fails on this screen
      // instead of looking like a corrupt file later.
      await importKey(form.key);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
      return;
    }
  }
  onsave(
    {
      id: form.id,
      token: form.token.trim(),
      owner: form.owner.trim(),
      repo: form.repo.trim(),
      branch: form.branch.trim() || DEFAULT_BRANCH,
      path: form.path.trim().replace(/^\/+/, "") || DEFAULT_PATH,
      encrypted: form.encrypted,
    },
    form.encrypted ? form.key.trim() : "",
  );
}
</script>

<form onsubmit={submit} class="pane">
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
  <p class="note">Fine-grained token, this repo only, <em>Contents: read and write</em>. Each repo carries its own, so a private one is reachable without widening the others.</p>

  <button
    type="button"
    class="toggle"
    aria-pressed={form.encrypted}
    onclick={() => (form.encrypted = !form.encrypted)}
  >
    [{form.encrypted ? "x" : " "}] encrypt this repo
  </button>

  {#if form.encrypted}
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
      <p class="note warn">Write this down now. It is the only copy — it never goes to GitHub, and nothing can recover your notes without it.</p>
    {:else}
      <p class="note">One key per device, shared by every encrypted repo and the same on all of them. Press <em>new</em> only on the first device: a new key cannot read what the old one wrote.</p>
    {/if}
  {:else}
    <p class="note">Files are stored as typed, readable by anyone who can read the repo — right for a private repo you also want to edit elsewhere.</p>
  {/if}

  {#if error}
    <p class="note bad">{error}</p>
  {/if}

  <div class="row">
    <button type="submit">save</button>
    {#if oncancel}
      <button type="button" class="ghost" onclick={oncancel}>cancel</button>
    {/if}
    {#if onremove}
      <button type="button" class="link push" onclick={onremove}>remove</button>
    {/if}
  </div>
</form>
