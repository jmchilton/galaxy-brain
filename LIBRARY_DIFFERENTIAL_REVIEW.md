# Differential review: library and snapshot CLI

Local tooling for reviewing branches that keep changing through rebases, force-pushes and agent iterations. The reviewer checks work off once. After that, only what actually changed is shown again.

This document covers the static library and CLI in `differential-review/`. The UI (diff2html in the Obsidian plugin and Chrome extension) and the factory process wiring come later.

## Spec summary

- **Granularity.** Reviewers check off hunks, files or commits.
  - Hunk check-offs are the base layer. A file counts as reviewed when all its hunks are.
  - Commit sign-off is a separate holistic record, keyed by `git patch-id`. If the patch-id is unchanged after a rebase, the sign-off holds. If it changes, the commit is flagged and only its differing hunks are shown.
- **Hunk identity.** Hunks are fingerprinted by their changed lines, not by line numbers or context, so check-offs survive most rebases. Commits are matched with `git patch-id` and `git range-diff`.
- **States.** Every item is `reviewed`, `new` or `changed` (changed since reviewed).
- **Architecture.** Everything is local, with no GitHub integration and no server. A client-side TypeScript library is shared by the Obsidian plugin and the Chrome extension. Git never runs in the browser; all git work happens in the static CLI.
- **Static tooling.** Agents run the CLI after each phase (implementation, hardening, polishing). Each run writes an immutable snapshot keyed by head SHA and tagged with the phase. A snapshot holds the full diff, per-hunk fingerprints, per-commit patch-ids and a mapping to the previous snapshot.
- **Storage.** Files live in `<branch record>/differential-review/`:
  - `snapshots/` is immutable and written only by agents.
  - `review-state.json` is written only by the reviewer, through the plugins.

## Layout

```
differential-review/
  package.json, package-lock.json   exact pins: diff 9.0.0 (jsdiff), yaml, typescript, vitest, esbuild
  tsconfig.json                     whole package, Node types
  tsconfig.core.json                src/core only, `types: []`: a Node import in core is a compile error
  esbuild.config.mjs                bundles src/cli/main.ts -> dist/differential-review.cjs
  bin/differential-review           sh wrapper around the bundle
  src/core/                         pure: no fs/child_process/path/process (Obsidian mobile)
    types.ts                        JSON schemas as TS types, PHASES, schema/fingerprint versions
    diff.ts                         git diff parsing (jsdiff parsePatch) + fingerprints
    match.ts                        exact / moved / fuzzy hunk matching
    snapshot.ts                     buildSnapshot, mapping to previous, commitKey, snapshotId
    queries.ts                      commit lineage, latestSnapshot, changesBetween, changesSincePhase
    review-state.ts                 review-state model + immutable mutations
    derive.ts                       reviewed/new/changed at hunk, file and commit level
    storage.ts                      layout, TextFileAdapter, SnapshotReader, ReviewStateStore
    sha256.ts                       sync SHA-256 (no node:crypto, no async WebCrypto)
  src/cli/                          Node only
    git.ts                          git invocations with pinned diff flags; range-diff parser
    record.ts                       index.md frontmatter, base selection and ref resolution
    snapshot.ts                     createSnapshot (the agent post-phase step)
    node-storage.ts                 fs TextFileAdapter, writeSnapshot (`wx`)
    run.ts / main.ts                commands / entry point
```

Run `make diff-review-build` to typecheck both configs and bundle, and `make diff-review-test` to run Vitest. Run `npm install` in `differential-review/` first.

## CLI usage

```sh
differential-review/bin/differential-review snapshot \
  --worktree ~/projects/worktrees/galaxy/branch/<branch> \
  --record vault/repositories/galaxy/branches/active/<branch> \
  --phase implementation|hardening|polishing \
  [--base <ref>] [--remote <name>] [--json]

differential-review/bin/differential-review list   --record <dir> [--json]
differential-review/bin/differential-review status --record <dir> [--snapshot <id>] [--json]
```

- `snapshot` prints `created <path>` or `exists <path>` and exits 0. `--json` prints `{"status","id","path"}` instead. Warnings go to stderr: a dirty worktree, a worktree branch that differs from the record name, or range-diff being unavailable.
- `list` prints one line per snapshot: commits, files, hunks and the base ref.
- `status` reads `review-state.json`, if present, and prints reviewed/changed/new counts for hunks, files and commits. It is read-only.
- Exit codes: 0 means ok, 1 means an error (git, missing base metadata), 2 means a usage error (unknown phase or missing flag).

### Base resolution

1. Use `--base` if given. Otherwise use the record's `parent_branch`, and if that is absent, `upstream_base_branch` (see `vault/agents/_shared/REPOSITORY_BRANCHES.md`).
2. If none of these is present, fail with a message that asks for `--base`. Many existing records only have prose such as "Base: `dev`", and the CLI does not parse prose.
3. Records store names without a remote. Candidate refs are tried in this order, and `--remote X` puts remote `X` first:
   - `parent_branch`: local `refs/heads/<name>` first, then `<remote>/<name>`. Parent branches are local factory branches.
   - `upstream_base_branch` and `--base`: `origin/<name>`, then `upstream/<name>`, then other remotes, then the local branch. Local `dev` is often stale; one smoke run against a stale local `dev` turned up 252 extra commits. An override that is already `origin/dev` or a SHA falls through to itself.
4. The CLI diffs against `merge-base(base, HEAD)` and lists commits with `rev-list base..HEAD`. It never fetches.

### Git flags

Diffs are generated with `--no-ext-diff --no-color --no-textconv --src-prefix=a/ --dst-prefix=b/ -M --full-index -U3 --inter-hunk-context=0 --diff-algorithm=myers --indent-heuristic`, plus `-c core.quotePath=false -c color.ui=never`. These pin git's defaults, so fingerprints don't depend on anyone's `diff.*` config. `--full-index` gives binary and mode-only entries real blob IDs to fingerprint.

## Storage

```
<record>/differential-review/
  snapshots/<YYYYMMDDTHHMMSSZ>-<phase>-<head12>.json   immutable, CLI-written
  review-state.json                                     reviewer-written via plugins
```

- Snapshot IDs are file stems. They sort by time and contain no colons, which break Obsidian sync and mobile.
- **Immutability.** Files are written with the `wx` flag, so an existing file raises `EEXIST` and is never overwritten.
- **Idempotency.** A rerun with the same head SHA and phase is a no-op that reports `exists`. The same head with a different phase writes a new snapshot, so the phase tag is recorded.
- The previous snapshot is the latest existing one. If the clock runs behind it, `createdAt` is bumped by 1s to keep the order.
- **The CLI never writes `review-state.json`.** It never constructs a `ReviewStateStore`. `status` uses the read-only `readReviewState()`, and tests check that the file stays byte-identical, or absent, across `snapshot`, `list` and `status`.

### Interfaces (`src/core/storage.ts`)

```ts
interface TextFileAdapter {            // Obsidian app.vault.adapter, Node fs, Chrome native host
  exists(path): Promise<boolean>;
  read(path): Promise<string>;
  write(path, data): Promise<void>;
  listFiles(dir): Promise<string[]>;   // file names directly in dir; [] if missing
}
interface SnapshotReader   { listSnapshotIds(): Promise<string[]>; readSnapshot(id): Promise<Snapshot>; }
interface ReviewStateStore { readReviewState(): Promise<ReviewState | null>; writeReviewState(s): Promise<void>; }

recordSnapshotReader(adapter, recordDir): SnapshotReader
recordReviewStateStore(adapter, recordDir): ReviewStateStore   // plugins
readReviewState(adapter, recordDir)                             // read-only (CLI)
readAllSnapshots(reader): Promise<Snapshot[]>   // oldest first
```

Paths are joined with `/`, never `node:path`. For Obsidian, `recordDir` is vault-relative (`repositories/galaxy/branches/active/<branch>`). An Obsidian `TextFileAdapter` wraps `adapter.list(dir).files` and takes each basename.

## JSON schemas

TypeScript types in `src/core/types.ts` are the source of truth. Both files carry `schemaVersion` (currently 1) and `kind`, and readers reject unknown kinds and versions (`parseSnapshot`, `parseReviewState`).

### Snapshot (abbreviated, real output from `ag_grid_36`)

```json
{
  "schemaVersion": 1,
  "kind": "differential-review-snapshot",
  "fingerprintVersion": "h1",
  "id": "20261026T050148Z-hardening-3bf56e17e9b5",
  "createdAt": "2026-10-26T05:01:48.257Z",
  "phase": "hardening",
  "repo": "galaxy",
  "branch": "ag_grid_36",
  "head": "3bf56e17e9b57054b2a8d5e1299f64d683f5b449",
  "base": { "name": "dev", "source": "override", "ref": "origin/dev",
            "sha": "c93175dc…", "mergeBase": "0073b5e9…" },
  "previousSnapshotId": "20261026T050147Z-implementation-3bf56e17e9b5",
  "diff": "diff --git a/client/package.json b/client/package.json\nindex …",
  "files": [{
    "path": "client/package.json", "oldPath": "client/package.json", "newPath": "client/package.json",
    "status": "modified", "binary": false, "oldMode": null, "newMode": null,
    "hunks": [{
      "id": "h1:1ad0ccd0f9a194f0", "contentHash": "h1:5d35bd54c984359a", "occurrence": 0,
      "kind": "text", "header": "@@ -87,8 +87,8 @@",
      "oldStart": 87, "oldLines": 8, "newStart": 87, "newLines": 8,
      "added": 2, "removed": 2, "whitespaceOnly": false
    }]
  }],
  "commits": [{
    "sha": "0dc06dc4…", "parents": ["0073b5e9…"],
    "patchId": "77de0a3ca8aa85d4b3ae6b4f143b7ee7b9083255",
    "subject": "Tidy ag-grid usage ahead of 36 upgrade",
    "message": "Tidy ag-grid usage ahead of 36 upgrade\n\n…",
    "author": "John Chilton <…>", "authorDate": "2026-10-22T18:13:45-04:00",
    "diff": "…per-commit diff against first parent…",
    "files": ["…same FileIndex shape…"]
  }],
  "mapping": {
    "previousSnapshotId": "20261026T050147Z-implementation-3bf56e17e9b5",
    "previousHead": "3bf56e17…",
    "rangeDiff": true,
    "commits": [{ "sha": "0dc06dc4…", "previousSha": "0dc06dc4…", "method": "sha", "patchIdChanged": false }],
    "droppedCommits": [],
    "hunks": [{ "id": "h1:1ad0ccd0f9a194f0", "previousId": "h1:1ad0ccd0f9a194f0", "match": "exact", "similarity": 1 }],
    "droppedHunks": []
  }
}
```

- `files[].hunks` are fingerprints of the cumulative diff (`mergeBase..head`).
- `commits[].files` hold per-commit fingerprints, used for "only the differing hunks" of a flagged commit.
- `mapping` is null for the first snapshot.
- `mapping.commits[].method` is `sha`, `patch-id`, `range-diff`, `subject` or null (new commit).
- When `patchIdChanged` is true, the mapping entry also carries per-commit `hunks` matches.
- `mapping.hunks[].match` is `exact`, `moved`, `fuzzy` or `new`.
- Hunk lines aren't stored twice. `snapshotFiles(snapshot)` and `commitFiles(commit)` re-parse the stored diff text, memoized per object, to get `lines` and `changed`. `verifyFingerprints` compares the re-parsed IDs with the stored index and throws when they differ, so a jsdiff version change or parser fix that drifts without a new fingerprint version fails loudly instead of silently turning check-offs `new`. `parseSnapshot` also rejects any other `fingerprintVersion`.
- Size: about 65 KB for a 3-commit, 2-file Galaxy branch, and about 150 KB for 5 commits and 22 files. Per-commit diffs usually outweigh the cumulative diff.

### Review state

```json
{
  "schemaVersion": 1,
  "kind": "differential-review-state",
  "updatedAt": "2026-10-26T06:00:00Z",
  "hunks": {
    "h1:1ad0ccd0f9a194f0": { "snapshotId": "20261026T050147Z-implementation-3bf56e17e9b5",
                             "path": "client/package.json", "reviewedAt": "2026-10-26T06:00:00Z" }
  },
  "commits": {
    "77de0a3ca8aa85d4b3ae6b4f143b7ee7b9083255": {
      "sha": "0dc06dc4…", "subject": "Tidy ag-grid usage ahead of 36 upgrade",
      "snapshotId": "20261026T050147Z-implementation-3bf56e17e9b5",
      "signedOffAt": "2026-10-26T06:05:00Z", "note": "optional"
    }
  }
}
```

- `hunks` is keyed by hunk fingerprint from the **cumulative branch diff**.
- A file check-off (`markFileReviewed`) writes one hunk record per hunk. Files have no record of their own.
- `commits` is keyed by `commitKey()`: the patch-id, or `sha:<sha>` for merges and empty commits.
- Mutations are pure and return new objects: `markHunksReviewed`, `unmarkHunks`, `markFileReviewed`, `signOffCommit`, `revokeCommitSignoff`.

## Fingerprint algorithm (`h1`)

For each hunk:

1. **Changed lines.** Take the `+` and `-` lines, plus the `\ No newline at end of file` marker when it follows a change. Context lines and line numbers are dropped.
2. **Normalize.** Strip trailing whitespace, including `\r`. Keep leading indentation, which matters in Python, and keep the `+`/`-` marker.
3. `contentHash = "h1:" + sha256(changedLines.join("\n"))[0:16]`
4. `id = "h1:" + sha256(path + "\0" + contentHash + "\0" + occurrence)[0:16]`
   - `path` is the new path, or the old path for deletions.
   - `occurrence` counts earlier hunks in the same file with the same `contentHash`.
   - So `+import os` in two files, or `+pass` twice in one file, get distinct IDs.
5. **Meta units.** A file with a change that no `@@` hunk covers gets one synthetic `kind: "meta"` unit: binary files (old/new blob IDs), renames and copies, mode changes, and empty added or deleted files. Without it, "file reviewed = all hunks reviewed" would pass these files vacuously. The unit's lines are `# status …`, `# old <path> <mode>`, `# new …` and `# binary <blob>..<blob>`.
6. `whitespaceOnly` is a flag only, set when removed and added text are equal once all whitespace is removed. It does not change identity.

The `h1:` prefix is versioned because review state keeps fingerprints forever. A new algorithm gets a new prefix.

**Known limitation: hunks that merge or split.** Git merges two changes 7 or fewer lines apart into one hunk. This happens when upstream deletes the lines between them, or when hardening adds code next to a reviewed hunk. The merged hunk has a new `contentHash`, and the small old hunk can score below 0.6 against it, so identical changed lines can come back as `changed` or `new`. This fails safe, showing more rather than less. A fix would fingerprint contiguous change runs within hunks, as `h2`.

## Matching (`matchHunks`, one-to-one)

1. **exact**: same `id` (same path, content and occurrence).
2. **moved**: same `contentHash` within the same file identity. This covers a shifted occurrence index, or a rename where `path` equals the new path or `basePath` (the base-side path) is equal.
3. **fuzzy**: same file identity and same kind, with similarity ≥ **0.6** (`FUZZY_THRESHOLD`), paired greedily from the highest score.
   - Similarity is the Dice coefficient over the joined changed text: `2·common / (lenA + lenB)`. It is computed with jsdiff `diffChars` (`maxEditLength` 2000). Above 20 000 characters, or if the diff aborts, it falls back to line-level `diffArrays`.
   - Characters rather than lines, because a one-line amend (`-a +b` to `-a +c`) scores exactly 0.5 at line level.
   - Two meta units of the same file always pair as fuzzy, e.g. a binary file whose blob changed.
4. Everything else is `new` (added) or dropped (removed). There is never any fuzzy matching across unrelated files.

## State derivation (`deriveReview(current, state, snapshots)`)

- **Hunk.** Run `matchHunks(checked-off hunks, current hunks)`. Each check-off is loaded from the snapshot it was made in, so check-offs from any earlier snapshot count, not just the previous one.
  - `exact` or `moved` means `reviewed`; `fuzzy` means `changed`; unmatched means `new`.
  - `reviewedAs` names the check-off (its `hunkId` is the record key, for unmarking) and its snapshot, for interdiffs.
  - If a check-off's snapshot is missing (e.g. not synced), only an exact ID match is possible.
- **File.** `reviewed` if all hunks are reviewed, `new` if all are new, otherwise `changed`.
- **Commit.** If `commitKey` is signed off, the commit is `reviewed`. Otherwise follow the commit lineage back through each snapshot's `mapping.commits`. If an earlier version was signed off, the commit is `changed` with `differingHunks`, the commit's hunks not exact/moved-matched against the signed-off version. Otherwise it is `new`.
  - A rebase that only changes context keeps hunk check-offs but changes the patch-id. The commit is then flagged with `differingHunks: []`, a holistic re-look with nothing new to read.

### Snapshot mapping (written by the CLI)

- **Commits.** Pairs are found in this order: identical SHA, then equal patch-id, then `git range-diff --no-patch --abbrev=40` pairs (`=` and `!`). If range-diff can't run, for example because the old commits were garbage-collected after a force-push or `cat-file -e` fails, commits fall back to an exact subject match.
- **Patch-ids** use `git patch-id --verbatim`, which git refuses to combine with `--stable`. Whitespace is kept so that an indentation-only amend changes the patch-id. Merge and empty commits have a null patch-id.
- **Hunks** use the same `matchHunks` as derivation.

### Phase queries (`queries.ts`)

- `latestSnapshot(snapshots, {phase?, before?})`
- `changesBetween(snapshots, from, to)` compares hunks directly, and commits by SHA or patch-id (unchanged), then lineage (modified), else added.
- `changesSincePhase(snapshots, "implementation")` covers views like "what did hardening/polishing change since the latest implementation snapshot". Combine it with `deriveReview` for "only what hardening changed since I reviewed implementation".
- `commitLineage(snapshots, snapshot, sha)` returns the earlier versions of a commit.

## Tests

`make diff-review-test` runs 57 tests: core unit tests on fixture diffs, plus CLI tests that build real temp git repos with isolated config (`GIT_CONFIG_GLOBAL=/dev/null`, fixed dates). They cover:

- a rebase that only shifts line numbers (hunks and commit stay reviewed);
- a rebase that changes context (hunks stay reviewed, and the commit is flagged with no differing hunks);
- an amend that changes one line (only that hunk is changed, and the commit is flagged with only that hunk);
- an indentation-only amend (the commit is flagged);
- identical hunks in two files, where checking off one doesn't cover the other;
- immutability, `EEXIST` and idempotent reruns;
- review state staying byte-identical or absent;
- a missing frontmatter base needing `--base`;
- `origin/<base>` preferred over local;
- unknown phases rejected;
- merge commits staying paired by SHA;
- the subject fallback when range-diff is unavailable;
- stored fingerprints matching a re-parse, and loud failure on drift.

Mutation checks were run by hand: dropping `--verbatim`, including context lines in fingerprints, or making IDs content-only each turns the relevant tests red.

## Decisions made (all reversible)

- **Phases.** `implementation | hardening | polishing`, validated in one place (`PHASES` / `isPhase`). Adding a phase isn't a schema change.
- **Hunk check-offs live on the cumulative branch diff.** Per-commit fingerprints are stored only to support commit sign-off re-looks. A commit hunk with identical content in the same file shares an ID with the cumulative hunk, but plugins should check off from the file view.
- **No stored hunk lines.** Snapshots store the diff text once, plus a fingerprint index. Consumers re-parse the text.
- **64-bit truncated SHA-256** fingerprints, implemented synchronously in pure TS so core stays sync and Node-free.
- **Snapshots are gitignored by default.** `.gitignore` has `/vault/repositories/**/branches/**/differential-review/snapshots/`, and `review-state.json` stays tracked. This is the reversible choice; committing large diffs to history is not. See the open questions.
- **No auto-fetch.** The base is whatever the worktree already has.
- **Snapshots include commits from merged-in branches.** They have null patch-ids and pair by SHA.

## Open questions for John

1. **Commit snapshots to the vault repo, or keep them gitignored?** They are gitignored for now. Size is about 65–150 KB per snapshot for typical branches, roughly ×3 phases plus reruns per branch. But a long branch on a stale base can produce MBs. If they stay ignored, `review-state.json` synced to another machine refers to snapshots that aren't there, so only exact-ID matches survive there. Options: commit them, sync them outside git, or move `review-state.json` next to the ignored snapshots.
2. **Add a `rebase` phase** (or `review-response`)? gx_branches rebases are exactly what this tool is for, but they currently have no phase tag, so rebase snapshots would have to reuse `polishing`.
3. **Fuzzy threshold 0.6 at character level.** Is that the right "changed vs. new" line? Tune it once there are real UI sessions.
4. **Should hunk check-offs also be allowed from the commit view** (per-commit hunks), or only from the cumulative file view, as decided above?
5. **Concurrency on `review-state.json`.** Obsidian and Chrome could both write it. There is no revision check yet, so the last writer wins. Add a `revision` compare-and-swap?
6. **Chrome native-host API** for read/write (still open per the spec). It should implement `TextFileAdapter`, or `SnapshotReader` plus `ReviewStateStore`, over the existing host.
7. **Merged or split hunks** (see the known limitation). Is it worth `h2` change-run fingerprints, or is failing safe good enough?
8. **Missing base metadata.** Many active records have only prose like "Base: `dev`". Migrate them to `upstream_base_branch` frontmatter, or have agents always pass `--base`?
