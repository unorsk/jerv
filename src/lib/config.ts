/**
 * Everything the app needs, kept in localStorage on each device.
 *
 * The key lives under its own name rather than inside the config blob: the two
 * are revoked independently. A leaked token lets someone overwrite the file;
 * a leaked key lets them read it. Only one of those can be fixed from GitHub's
 * settings page.
 */

const CONFIG_KEY = "jerv.config";
const SECRET_KEY = "jerv.key";

export interface Config {
  readonly token: string;
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
  readonly path: string;
}

export const DEFAULT_BRANCH = "main";
export const DEFAULT_PATH = "notes.enc";

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

export function loadConfig(): Config | null {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Config>;
    return parsed.token && parsed.owner && parsed.repo
      ? {
          token: parsed.token,
          owner: parsed.owner,
          repo: parsed.repo,
          branch: parsed.branch || DEFAULT_BRANCH,
          path: parsed.path || DEFAULT_PATH,
        }
      : null;
  } catch {
    return null;
  }
}

export const saveConfig = (config: Config): void =>
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));

export const loadKey = (): string | null => localStorage.getItem(SECRET_KEY);

export const saveKey = (key: string): void => localStorage.setItem(SECRET_KEY, key.trim());

/** Forgets this device. The notes stay on GitHub; the key does not, so keep a copy. */
export function forget(): void {
  localStorage.removeItem(CONFIG_KEY);
  localStorage.removeItem(SECRET_KEY);
}
