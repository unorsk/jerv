/**
 * Everything the app needs, kept in localStorage on each device.
 *
 * The key lives under its own name rather than inside the config blob: the two
 * are revoked independently. A leaked token lets someone overwrite the file;
 * a leaked key lets them read it. Only one of those can be fixed from GitHub's
 * settings page.
 *
 * One key, many repos. The key is a property of this device, not of a repo --
 * a second key would be a second thing to write down and lose, and the repos
 * that need encryption are all yours anyway. A repo says whether it uses it.
 */

const CONFIG_KEY = "jerv.config";
const SECRET_KEY = "jerv.key";

export interface Repo {
  /** Stable across edits, so `current` survives renaming a repo. */
  readonly id: string;
  readonly token: string;
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
  /** The file the editor last had open here. */
  readonly path: string;
  readonly encrypted: boolean;
}

export interface Config {
  readonly repos: readonly Repo[];
  /** id of the repo the editor is on; "" until the first one is added. */
  readonly current: string;
  readonly autosave: boolean;
}

export const DEFAULT_BRANCH = "main";
export const DEFAULT_PATH = "notes.enc";

export const EMPTY: Config = { repos: [], current: "", autosave: false };

/**
 * On a Pages URL the repo is already in the address bar, so setup can prefill
 * itself: unorsk.github.io/jerv -> unorsk/jerv. A user site (no path segment)
 * lives in the owner.github.io repo. Anywhere else -- localhost, a custom
 * domain -- there is nothing to read and the fields start empty.
 */
export function guessRepo(): { readonly owner: string; readonly repo: string } {
  const host = /^([\w-]+)\.github\.io$/.exec(location.hostname);
  if (!host?.[1]) return { owner: "", repo: "" };
  const owner = host[1];
  const segment = location.pathname.split("/").find(Boolean);
  return { owner, repo: segment ?? `${owner}.github.io` };
}

/** A blank repo for the setup form. Encrypted unless told otherwise -- that is what jerv is for. */
export const newRepo = (): Repo => ({
  id: crypto.randomUUID(),
  token: "",
  owner: "",
  repo: "",
  branch: DEFAULT_BRANCH,
  path: DEFAULT_PATH,
  encrypted: true,
});

const asRepo = (raw: Partial<Repo>): Repo | null =>
  raw.token && raw.owner && raw.repo
    ? {
        id: raw.id || crypto.randomUUID(),
        token: raw.token,
        owner: raw.owner,
        repo: raw.repo,
        branch: raw.branch || DEFAULT_BRANCH,
        path: raw.path || DEFAULT_PATH,
        // Absent means a config written before repos could be plain, and back
        // then everything was ciphertext.
        encrypted: raw.encrypted !== false,
      }
    : null;

/**
 * Kept separate from `loadConfig` so the migration is testable without a
 * browser -- it is the part that has to keep working for an existing device.
 */
export function parseConfig(raw: string | null): Config {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Partial<Config> & Partial<Repo>;
    // Before this the config *was* one repo, flat. Read as a list of one, and
    // an old device carries on where it left off.
    const list = Array.isArray(parsed.repos) ? parsed.repos : [parsed];
    const repos = list.map(asRepo).filter((repo) => repo !== null);
    return {
      repos,
      current: repos.find((repo) => repo.id === parsed.current)?.id ?? repos[0]?.id ?? "",
      // Off unless it was turned on: a save should be something you asked for.
      autosave: parsed.autosave === true,
    };
  } catch {
    return EMPTY;
  }
}

export const loadConfig = (): Config => parseConfig(localStorage.getItem(CONFIG_KEY));

export const saveConfig = (config: Config): void =>
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));

export const currentRepo = (config: Config): Repo | null =>
  config.repos.find((repo) => repo.id === config.current) ?? null;

/** Adds or replaces a repo by id, and adopts the first one as current. */
export const putRepo = (config: Config, repo: Repo): Config => ({
  ...config,
  repos: config.repos.some((other) => other.id === repo.id)
    ? config.repos.map((other) => (other.id === repo.id ? repo : other))
    : [...config.repos, repo],
  current: config.current || repo.id,
});

export function dropRepo(config: Config, id: string): Config {
  const repos = config.repos.filter((repo) => repo.id !== id);
  return {
    ...config,
    repos,
    current: config.current === id ? (repos[0]?.id ?? "") : config.current,
  };
}

export const loadKey = (): string | null => localStorage.getItem(SECRET_KEY);

export const saveKey = (key: string): void => localStorage.setItem(SECRET_KEY, key.trim());

/** Forgets this device. The notes stay on GitHub; the key does not, so keep a copy. */
export function forget(): void {
  localStorage.removeItem(CONFIG_KEY);
  localStorage.removeItem(SECRET_KEY);
}
