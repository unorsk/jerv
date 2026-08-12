/**
 * The one file, over the GitHub contents API.
 *
 * Only two calls are needed: read the blob, write it back. The blob's sha acts
 * as a version tag -- GitHub rejects a write whose sha is not the one currently
 * on the branch, which is what stops the phone from silently overwriting an
 * edit made on the laptop.
 *
 * Note the 1 MB ceiling on this endpoint. Past that GitHub stops inlining the
 * content and the blobs API is needed instead; a plain-text note is not going
 * to get there, and `read` says so plainly rather than returning something odd.
 */

import { type Bytes, fromBase64, toBase64 } from "./base64.ts";
import type { Config } from "./config.ts";

const API = "https://api.github.com";

export interface Blob {
  readonly bytes: Bytes;
  readonly sha: string;
}

const headers = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

const url = (config: Config): string =>
  `${API}/repos/${config.owner}/${config.repo}/contents/${config.path.split("/").map(encodeURIComponent).join("/")}`;

async function failure(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return new Error(`${response.status} ${body?.message ?? response.statusText}`);
}

/** The current contents, or null if the file has not been created yet. */
export async function read(config: Config): Promise<Blob | null> {
  const response = await fetch(`${url(config)}?ref=${encodeURIComponent(config.branch)}`, {
    headers: headers(config.token),
    // Authenticated API responses come back cacheable for a minute, which is
    // long enough to reopen the app on the phone and be shown the edit the
    // laptop just replaced. Always go to the network.
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw await failure(response);

  const body = (await response.json()) as { content?: string; sha: string; type?: string };
  if (body.type !== "file" || body.content === undefined) {
    throw new Error(`${config.path} is not a file the API can read inline`);
  }
  return { bytes: fromBase64(body.content), sha: body.sha };
}

/**
 * Writes the file and returns its new sha. Pass the sha the content was read
 * at, or null to create it; a mismatch is reported as a conflict rather than
 * resolved, because only the user knows which version they meant to keep.
 */
export async function write(
  config: Config,
  bytes: Bytes,
  sha: string | null,
  message: string,
): Promise<string> {
  const response = await fetch(url(config), {
    method: "PUT",
    headers: { ...headers(config.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: toBase64(bytes),
      branch: config.branch,
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
