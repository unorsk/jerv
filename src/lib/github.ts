/**
 * Files, over the GitHub contents API.
 *
 * Three calls: list a directory, read a blob, write it back. The blob's sha
 * acts as a version tag -- GitHub rejects a write whose sha is not the one
 * currently on the branch, which is what stops the phone from silently
 * overwriting an edit made on the laptop.
 *
 * Note the 1 MB ceiling on this endpoint. Past that GitHub stops inlining the
 * content and the blobs API is needed instead; a plain-text note is not going
 * to get there, and `read` says so plainly rather than returning something odd.
 *
 * What the bytes mean is not this module's business -- see `content.ts`. It
 * hands over exactly what is in the file and stores exactly what it is given.
 */

import { type Bytes, fromBase64, toBase64 } from "./base64.ts";
import type { Repo } from "./config.ts";

const API = "https://api.github.com";

export interface Blob {
  readonly bytes: Bytes;
  readonly sha: string;
}

export interface Entry {
  readonly name: string;
  readonly path: string;
  readonly kind: "file" | "dir";
  readonly size: number;
}

const headers = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

const segments = (path: string): string =>
  path.split("/").filter(Boolean).map(encodeURIComponent).join("/");

const url = (repo: Repo, path: string): string =>
  `${API}/repos/${repo.owner}/${repo.repo}/contents/${segments(path)}`;

/**
 * What went wrong, in a status bar's worth of words. A failed fetch arrives as
 * a TypeError with a message about the fetch API, which is never what the
 * reader needs to know.
 */
export const explain = (cause: unknown): string =>
  cause instanceof TypeError
    ? "no connection"
    : cause instanceof Error
      ? cause.message
      : String(cause);

async function failure(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return new Error(`${response.status} ${body?.message ?? response.statusText}`);
}

// Authenticated API responses come back cacheable for a minute, which is long
// enough to reopen the app on the phone and be shown the edit the laptop just
// replaced. Always go to the network.
const get = (repo: Repo, path: string): Promise<Response> =>
  fetch(`${url(repo, path)}?ref=${encodeURIComponent(repo.branch)}`, {
    headers: headers(repo.token),
    cache: "no-store",
  });

/** Directories first, then by name -- the order a file listing is read in. */
const order = (a: Entry, b: Entry): number =>
  a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "dir" ? -1 : 1;

/** One directory, not a tree: browsing is a step at a time and so is the API. */
export async function list(repo: Repo, dir: string): Promise<readonly Entry[]> {
  const response = await get(repo, dir);
  if (!response.ok) throw await failure(response);

  const body = (await response.json()) as unknown;
  if (!Array.isArray(body)) throw new Error(`${dir || "/"} is a file, not a directory`);
  const raw = body as readonly { name: string; path: string; size: number; type: string }[];
  return raw
    .map(({ name, path, size, type }) => ({
      name,
      path,
      size,
      // Submodules and symlinks are neither file nor dir, and there is nothing
      // useful to do with them here; calling them files lets the read fail with
      // a reason instead of hiding them.
      kind: type === "dir" ? ("dir" as const) : ("file" as const),
    }))
    .sort(order);
}

/** The current contents of `repo.path`, or null if the file has not been created yet. */
export async function read(repo: Repo): Promise<Blob | null> {
  const response = await get(repo, repo.path);
  if (response.status === 404) return null;
  if (!response.ok) throw await failure(response);

  const body = (await response.json()) as { content?: string; sha: string; type?: string };
  if (body.type !== "file" || body.content === undefined) {
    throw new Error(`${repo.path} is not a file the API can read inline`);
  }
  return { bytes: fromBase64(body.content), sha: body.sha };
}

/**
 * Writes `repo.path` and returns its new sha. Pass the sha the content was read
 * at, or null to create it; a mismatch is reported as a conflict rather than
 * resolved, because only the user knows which version they meant to keep.
 */
export async function write(
  repo: Repo,
  bytes: Bytes,
  sha: string | null,
  message: string,
): Promise<string> {
  const response = await fetch(url(repo, repo.path), {
    method: "PUT",
    headers: { ...headers(repo.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: toBase64(bytes),
      branch: repo.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (response.status === 409 || response.status === 422) {
    throw new Error("conflict: the file changed elsewhere — reload before saving");
  }
  if (!response.ok) throw await failure(response);

  const body = (await response.json()) as { content: { sha: string } };
  return body.content.sha;
}
