import assert from "node:assert/strict";
import { test } from "node:test";
import { dropRepo, newRepo, parseConfig, putRepo } from "./config.ts";

/** What a device set up before this change has sitting in localStorage. */
const OLD = JSON.stringify({
  token: "github_pat_x",
  owner: "unorsk",
  repo: "jerv",
  branch: "main",
  path: "notes.enc",
});

test("an old single-repo config opens the same file, still encrypted", () => {
  const config = parseConfig(OLD);
  assert.equal(config.repos.length, 1);
  const [repo] = config.repos;
  assert.ok(repo);
  assert.equal(config.current, repo.id);
  assert.deepEqual(
    { ...repo, id: "" },
    {
      id: "",
      token: "github_pat_x",
      owner: "unorsk",
      repo: "jerv",
      branch: "main",
      path: "notes.enc",
      encrypted: true,
    },
  );
});

test("autosave stays off unless it was turned on", () => {
  assert.equal(parseConfig(OLD).autosave, false);
  assert.equal(parseConfig(JSON.stringify({ repos: [], autosave: true })).autosave, true);
});

test("nothing, or nonsense, is an empty config rather than a crash", () => {
  assert.deepEqual(parseConfig(null).repos, []);
  assert.deepEqual(parseConfig("{").repos, []);
  assert.deepEqual(parseConfig(JSON.stringify({ owner: "unorsk" })).repos, []);
});

test("current falls back to the first repo when it points at nothing", () => {
  const one = putRepo(parseConfig(null), { ...newRepo(), token: "t", owner: "o", repo: "r" });
  const config = parseConfig(JSON.stringify({ ...one, current: "gone" }));
  assert.equal(config.current, config.repos[0]?.id);
  assert.notEqual(config.current, "");
});

test("repos are added, replaced by id, and removed", () => {
  const a = { ...newRepo(), token: "t", owner: "o", repo: "a" };
  const b = { ...newRepo(), token: "t", owner: "o", repo: "b" };

  const both = putRepo(putRepo(parseConfig(null), a), b);
  assert.deepEqual(
    both.repos.map((repo) => repo.repo),
    ["a", "b"],
  );
  // The first repo added becomes the current one; the second does not steal it.
  assert.equal(both.current, a.id);

  const renamed = putRepo(both, { ...a, repo: "aa" });
  assert.deepEqual(
    renamed.repos.map((repo) => repo.repo),
    ["aa", "b"],
  );

  const left = dropRepo(renamed, a.id);
  assert.deepEqual(
    left.repos.map((repo) => repo.repo),
    ["b"],
  );
  assert.equal(left.current, b.id, "dropping the current repo falls through to the next");
});
