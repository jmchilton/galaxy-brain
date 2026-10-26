# Differential review: library and snapshot CLI

Local tooling for reviewing branches that keep changing through rebases, force-pushes and agent iterations. The reviewer checks work off once. After that, only what actually changed is shown again.

This document covers the static library and CLI in `differential-review/`, and the reviewer's UI in the Obsidian plugin under [Obsidian view](#obsidian-view). A Chrome UI comes later. The factory process wiring is under [Factory integration](#factory-integration).

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
  vitest.config.ts                  skips site/tsconfig.json (extends astro) when tests import site/src/lib/records.ts
  bin/differential-review           sh wrapper around the bundle; follows symlinks
  src/core/                         pure: no fs/child_process/path/process (Obsidian mobile)
    types.ts                        JSON schemas as TS types, PHASES, schema/fingerprint versions
    diff.ts                         git diff parsing (jsdiff parsePatch) + fingerprints
    match.ts                        exact / moved / fuzzy hunk matching
    snapshot.ts                     buildSnapshot, mapping to previous, commitKey, snapshotId
    queries.ts                      commit lineage, latestSnapshot, changesBetween, changesSincePhase, summarizeSnapshot
    review-state.ts                 review-state model + immutable mutations
    derive.ts                       reviewed/new/changed at hunk, file and commit level
    storage.ts                      layout, TextFileAdapter, SnapshotReader, ReviewStateStore, updateReviewState
    view.ts                         UI view model: buildReviewView (states, baseline, visibility) + render helpers
    fixtures/make-view-fixtures.sh  regenerates fixtures/view-fixtures/ (3 real CLI snapshots) for view tests
    sha256.ts                       sync SHA-256 (no node:crypto, no async WebCrypto)
  src/cli/                          Node only
    git.ts                          git invocations with pinned diff flags; range-diff parser
    record.ts                       index.md frontmatter (repo via site/src/lib/records.ts parseRecordPath), base selection and ref resolution
    snapshot.ts                     createSnapshot (the agent post-phase step)
    node-storage.ts                 read-only fs adapter, atomic no-clobber writeSnapshot
    format.ts                       human output for snapshot / list / status
    run.ts / main.ts                command table (options, help, handler) / entry point
```

Run `make diff-review-build` to typecheck both configs and bundle, and `make diff-review-test` to run Vitest. Run `npm install` in `differential-review/` first.

## CLI usage

The CLI lives in this repository, and `make install` links the repository to `~/.galaxy-brain`. From anywhere, run:

```sh
~/.galaxy-brain/differential-review/bin/differential-review <command> [options]
```

`~/.galaxy-brain` exists only after `make install`, so the factory docs use the checkout path `~/projects/repositories/galaxy-brain/` instead. The bin follows symlinks. `dist/` is gitignored, so run `make diff-review-build` once in the checkout after cloning or pulling. Without a build, the bin says so.

```sh
# Agent post-phase step: run from the branch's worktree, or pass --worktree.
differential-review snapshot --record BRANCH_DIRECTORY --phase implementation|hardening|polishing \
  [--worktree WORKING_DIRECTORY] [--base <ref>] [--remote <name>] [--json]

differential-review list   --record <dir> [--json]
differential-review status --record <dir> [--snapshot <id>] [--json]
differential-review [<command>] --help
```

`--worktree` defaults to the current directory. In that case HEAD must be on the record's branch, or the command fails. This guards against an agent whose cwd is the vault snapshotting galaxy-brain's own HEAD into a record. With an explicit `--worktree`, a different branch or a detached HEAD only produces a warning, because alts and renames are legitimate.

`--record` is always the branch record directory, `vault/repositories/<repo>/branches/<status>/<branch>`. It must already contain `index.md`. A path that has none is an error, never a new directory.

### `snapshot`

The first line is `created <path>`, or `exists <path>` for a no-op rerun. The rest is a summary to paste into a debrief. This is the smoke run's output, with the path shortened:

```
created …/snapshots/20261026T052513Z-polishing-a9569d8fee3b.json
  polishing @ a9569d8fee3b vs 43c4d0f06a4a (merge-base 43c4d0f06a4a)
  since 20261026T052424Z-hardening-c48aa1d4ca6b:
    commits: 0 same, 4 rebased, 1 changed, 0 new, 0 dropped
    hunks:   34 carried, 1 changed, 0 new, 0 dropped
    changed 7629850da068 Summarize workflow upgrade changes in the editor (1 differing hunk)
```

- **Commits.**
  - `same`: identical SHA.
  - `rebased`: new SHA with the same patch-id, so a sign-off holds.
  - `changed`: paired by range-diff or subject, with a different patch-id, so the commit is flagged.
  - `new` and `dropped` mean what they say.
- **Hunks.** `carried` is an exact or moved fingerprint match, `changed` is a fuzzy match, and then `new` and `dropped`.
- A first snapshot prints totals instead.
- `--json` prints `{status, id, path, summary, warnings}`. `summary` is core's `summarizeSnapshot()`, and a test pins the key order.
- Warnings go to stderr. They cover a dirty worktree (only committed HEAD is snapshotted), a worktree branch that differs from the record name, a detached HEAD, an empty branch, and range-diff being unavailable.

### `list` and `status`

- `list` prints one line per snapshot: id, then commit, file and hunk counts, then the base ref.
- `status` derives reviewed/changed/new for hunks, files and commits from `review-state.json`, then lists the files and commits still to review. A changed commit also shows its count of differing hunks. Without `review-state.json`, it says that everything is new. `--json` prints the full `deriveReview()` result. It is read-only.

Exit codes are 0 for ok and 1 for an error. Errors include git failures, a missing record or base metadata, a worktree that isn't one, and an unreadable snapshot. Code 2 is a usage error: an unknown command, flag or phase, or a missing required flag. Every error names the cause and the fix, such as "add `upstream_base_branch:` to index.md or pass --base", or "fetch it or pass --base".

### Base resolution

1. Use `--base` if given. Otherwise use the record's `parent_branch`, and if that is absent, `upstream_base_branch` (see `vault/agents/_shared/REPOSITORY_BRANCHES.md`).
2. If none of these is present, fail with a message that asks for `--base`. Many existing records only have prose such as "Base: `dev`", and the CLI does not parse prose.
3. Records store names without a remote. Candidate refs are tried in this order, and `--remote X` puts remote `X` first:
   - `parent_branch`: local `refs/heads/<name>` first, then `<remote>/<name>`. Parent branches are local factory branches.
   - `upstream_base_branch` and `--base`: `origin/<name>`, then `upstream/<name>`, then other remotes, then the local branch. Local `dev` is often stale; one smoke run against a stale local `dev` turned up 252 extra commits. An override that is already `origin/dev` or a SHA falls through to itself.
4. The CLI diffs against `merge-base(base, HEAD)` and lists commits with `rev-list base..HEAD`. It never fetches.

### Git flags

Diffs are generated with these flags:

```
--no-ext-diff --no-color --no-textconv --no-relative --src-prefix=a/ --dst-prefix=b/ -M -l1000 -O/dev/null
--full-index -U3 --inter-hunk-context=0 --diff-algorithm=myers --indent-heuristic
--ignore-submodules=none --submodule=short
```

Every git call also gets these:

```
--no-optional-locks -c core.quotePath=false -c color.ui=never -c diff.suppressBlankEmpty=false -c log.showSignature=false
```

- **Why pin.** These flags fix git's defaults, so neither fingerprints nor patch-ids depend on anyone's `diff.*` config.
- **Patch-ids hash the diff text, context lines included.** One example: `diff.suppressBlankEmpty=true` changes how blank context lines are written. That changes every commit's patch-id, and the sign-offs with it.
- **Regression test.** A test sets a dozen hostile repo-local options and asserts that the diffs and patch-ids are byte-identical.
- **Blob IDs.** `--full-index` gives binary and mode-only entries real blob IDs to fingerprint.
- **Worktree.** `--worktree` resolves to its top level.
- **Read-only.** `--no-optional-locks` keeps `git status` from rewriting the worktree index.

## Storage

```
<record>/differential-review/
  snapshots/<YYYYMMDDTHHMMSSZ>-<phase>-<head12>.json   immutable, CLI-written
  review-state.json                                     reviewer-written via plugins
```

- Snapshot IDs are file stems. They sort by time and contain no colons, which break Obsidian sync and mobile.
- **Immutability.** A snapshot is written to a hidden `.<id>.json.<pid>.tmp` file, then hard-linked into place. An existing file raises `EEXIST` and is never overwritten. A crash can't leave truncated JSON that every later run would trip over. If a snapshot can't be read, the error names its file.
- **Idempotency.** A rerun is a no-op that reports `exists` when a snapshot with the same head SHA, merge-base and phase exists *and HEAD hasn't moved since*. If a run used the wrong base, rerunning with the fixed base writes a new snapshot. The same head with a different phase writes a new snapshot, so the phase tag is recorded. If HEAD returns to an earlier SHA after other snapshots, for example after a reset, the CLI snapshots it again, so the latest snapshot always reflects HEAD.
- The previous snapshot is the latest existing one. If the clock runs behind it, `createdAt` is bumped by 1s to keep the order.
- **The CLI never writes `review-state.json`.** This is enforced by type. The CLI's only adapter, `nodeReadAdapter`, is a `ReadOnlyFileAdapter` with no `write`, so a `ReviewStateStore` can't be built from it. `status` uses the read-only `readReviewState()`. Tests check that the file stays byte-identical, or absent, across `snapshot`, `list` and `status`; they simulate plugin writes through a separate `pluginAdapter`.

### Interfaces (`src/core/storage.ts`)

```ts
interface TextFileAdapter {            // Obsidian app.vault.adapter, Node fs, Chrome native host
  exists(path): Promise<boolean>;
  read(path): Promise<string>;
  write(path, data): Promise<void>;    // creates missing parent dirs
  listFiles(dir): Promise<string[]>;   // file names directly in dir; [] if missing
}
type ReadOnlyFileAdapter = Pick<TextFileAdapter, "exists" | "read" | "listFiles">;
interface SnapshotReader   { listSnapshotIds(): Promise<string[]>; readSnapshot(id): Promise<Snapshot>; }
interface ReviewStateStore { readReviewState(): Promise<ReviewState | null>; writeReviewState(s): Promise<void>; }

recordSnapshotReader(adapter /* read + listFiles */, recordDir): SnapshotReader
recordReviewStateStore(adapter, recordDir): ReviewStateStore   // plugins
readReviewState(adapter, recordDir)                             // read-only (CLI)
readAllSnapshots(reader): Promise<Snapshot[]>   // oldest first
```

Paths are joined with `/`, never `node:path`. For Obsidian, `recordDir` is vault-relative (`repositories/galaxy/branches/active/<branch>`). An Obsidian `TextFileAdapter` wraps `adapter.list(dir).files` and takes each basename. It must `mkdir` the parent before writing `review-state.json` for the first time.

The Chrome native host (`herdr-plugin/src/native-host.ts`, uncommitted on John's main) dispatches on typed requests: `lookup`, `launch`, `newAgent` and `open`. A differential-review adapter there would add something like `readFile`, `listFiles` and `writeReviewState` requests on vault-relative paths. It would restrict them to `repositories/*/branches/*/<id>/differential-review/`, and allow writes only to `review-state.json`. See the open questions about message size.

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
- `summarizeSnapshot(snapshot)` reads a snapshot's stored `mapping` and counts what changed since the previous snapshot. It also lists the changed and new commits, and the CLI's `snapshot` output is built from it. A plugin can use it to keep "complexity hidden until a rebase actually changes something".

## Tests

`make diff-review-test` runs 91 tests: core unit tests on fixture diffs, plus CLI tests that build real temp git repos with isolated config (`GIT_CONFIG_GLOBAL=/dev/null`, fixed dates). They cover:

- **Rebases and amends**
  - A rebase that only shifts line numbers: the hunks and the commit stay reviewed.
  - A rebase that changes context: the hunks stay reviewed, and the commit is flagged with no differing hunks.
  - An amend that changes one line: only that hunk is changed, and the commit is flagged with only that hunk.
  - An indentation-only amend: the commit is flagged.
  - A sign-off followed back through an unreviewed rebase snapshot (multi-hop lineage).
- **Renames, collisions and git config**
  - A `git mv` rename: text-hunk check-offs carry, and the rename meta unit is new.
  - Identical hunks in two files: checking off one doesn't cover the other.
  - Different binary edits get different patch-ids.
  - Byte-identical diffs and patch-ids under a dozen hostile repo-local `diff.*` settings, run from a subdirectory.
- **Snapshot files and review state**
  - Immutability, `EEXIST`, no temp files left behind, and idempotent reruns.
  - A new snapshot when HEAD returns to an earlier SHA.
  - An unreadable snapshot is named in the error.
  - Review state stays byte-identical or absent.
- **CLI behavior**
  - A missing frontmatter base needs `--base`, and no directory is created.
  - A record path without `index.md` is refused by `snapshot`, `list` and `status`.
  - Clear errors for a worktree that isn't git and for an unresolvable base.
  - A defaulted `--worktree` fails when cwd is on another branch or detached; an explicit one only warns.
  - A same-head rerun against a different base writes a new snapshot.
  - Usage errors exit 2, and per-command help works.
  - `origin/<base>` is preferred over the local branch.
  - Unknown phases are rejected.
  - Merge commits stay paired by SHA.
  - The subject fallback is used when range-diff is unavailable.
  - The exact text and `--json` key set of the `snapshot` summary and the `status` listing are pinned.
- **Fingerprints**
  - Stored fingerprints match a re-parse, and drift fails loudly.
  - `summarizeSnapshot` counts are correct.
  - SHA-256 is correct at the padding boundaries.
  - Lines split on `\n` only, so form feeds and lone CRs stay inside a line.

Mutation checks were run by hand:

- Dropping `--verbatim`, including context lines in fingerprints, or making IDs content-only each turns the relevant tests red.
- Dropping the `diff.suppressBlankEmpty` pin turns the git-config test red.

### Smoke run (agent 2, 2026-10-26)

The smoke run used a `--shared` scratch clone of `issue_22534_step_change_unify` (Galaxy), with its record directory in a scratchpad. It went through four steps:

1. An implementation snapshot at tip~2: 3 commits, 6 files, 24 hunks.
2. A hardening snapshot at the tip: 3 same and 2 new commits, 24 hunks carried and 11 new.
3. A real `git rebase` onto a newer `dev`, plus a fixup that changed one line in one commit, then a polishing snapshot: 4 commits rebased, 1 changed (1 differing hunk), 34 hunks carried and 1 changed.
4. With everything in the hardening snapshot checked off, `status` on the polishing snapshot showed 34 hunks reviewed and 1 changed, 4 commits reviewed and 1 changed. Only that file and that commit were listed to review.

Each run took about 4s. Snapshots were 92–147 KB.

## Factory integration

[`vault/agents/_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md`](vault/agents/_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md) holds the command, where to paste the output, and what to do on failure. A snapshot never blocks a phase. Agents `cd` into the worktree so the CLI's defaulted `--worktree` keeps its branch-match guard, and pass `--record` as an absolute path under the checkout.

Galaxy phases call it right before each phase's debrief:

| Phase | Where | Debrief that gets the summary |
| --- | --- | --- |
| implementation | `gx_workhorse/AGENTS.md`, "After your plan is done" | `initial_implementation_debrief.md` |
| hardening | `gx_workhorse/AGENTS.md`, after `GX_PROCESS_HARDEN_BRANCH.md` (also covers Re-scope and Re-harden) | `implementation_debrief.md` |
| polishing | `gx_branches/POLISH_BRANCH.md`, Hand off | `polish_debrief.md` |

`GX_PROCESS_HARDEN_BRANCH.md` is left alone. It writes no debrief of its own, and John has uncommitted edits at its end. The generic flows (`PROCESS_GENERIC_*`, used by pulsar, planemo, foundry and workflow_libs) aren't wired yet; see the open questions. `vault/repositories/_defaults/branches/FILE_DOCS.md` documents `differential-review/**`, and `vault/agents/factory/BRANCH_FACTORY.md` mentions the snapshots.

**Prerequisite.** After merging, run `cd differential-review && npm install` and then `make diff-review-build` in the main checkout. Until then, agents paste the "not built" error into their debriefs and carry on. `launch_agent.sh` and `make install` are unchanged.

**Dry run (agent 3).** The test followed only the new doc. It used `issue_24457_password_reset_25.1`, whose record was copied to a scratch mirror of `~/projects/repositories/galaxy-brain/`, and its real worktree, which was left unmodified.
- Snapshots of all three phases succeeded in about 1s each, at about 40 KB.
- A rerun printed `exists`.
- With the frontmatter stripped, the run failed with a clear "pass --base" error, and `--base release_25.1` fixed it.
- Run from the wrong cwd, it failed with the branch guard.

The output pasted into a debrief looks like this:

```
created …/differential-review/snapshots/20261026T053715Z-hardening-b88e76ad2ca7.json
  hardening @ b88e76ad2ca7 vs origin/release_25.1 (merge-base bd2cb474a8d3)
  since 20261026T053715Z-implementation-b88e76ad2ca7:
    commits: 2 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   8 carried, 0 changed, 0 new, 0 dropped
```

## Decisions made (all reversible)

- **Phases.** `implementation | hardening | polishing`, validated in one place (`PHASES` / `isPhase`). Adding a phase isn't a schema change.
- **Hunk check-offs live on the cumulative branch diff.** Per-commit fingerprints are stored only to support commit sign-off re-looks. A commit hunk with identical content in the same file shares an ID with the cumulative hunk, but plugins should check off from the file view.
- **No stored hunk lines.** Snapshots store the diff text once, plus a fingerprint index. Consumers re-parse the text.
- **64-bit truncated SHA-256** fingerprints, implemented synchronously in pure TS so core stays sync and Node-free.
- **Snapshots are gitignored by default.** `.gitignore` has `/vault/repositories/**/branches/**/differential-review/snapshots/`, and `review-state.json` stays tracked. This is the reversible choice; committing large diffs to history is not. See the open questions.
- **No auto-fetch.** The base is whatever the worktree already has.
- **Snapshots include commits from merged-in branches.** They have null patch-ids and pair by SHA.
- **No record lookup by branch name.** Agents already pass BRANCH_DIRECTORY. Finding the vault root from an arbitrary worktree means guessing (`~/.galaxy-brain`?), and a wrong guess could write a stray record into a real vault. Revisit if John wants `differential-review status` from inside a worktree with no flags.
- **Three commands only** (`snapshot`, `list`, `status`). Interdiffs and phase views ("what hardening changed since implementation") are core queries for the plugins, not CLI commands.
- **Dirty worktrees warn, not fail.** The snapshot covers committed HEAD. Failing would block an agent's post-phase step over stray files that are irrelevant to it.
- **Tests import `site/src/lib/records.ts`** the way `obsidian-plugin` does. `vitest.config.ts` (`oxc.tsconfig: false`) and the esbuild `tsconfig` option stop either tool from resolving `site/tsconfig.json`, which extends `astro`. So tests and the build run without `site/node_modules`. `obsidian-plugin` has no such guard, so its tests need `site/node_modules` in a fresh worktree.

## Obsidian view

`obsidian-plugin/src/diff-review-view.ts` (the `ItemView`), `diff-review-render.ts` (plain DOM plus diff2html, no Obsidian APIs), `diff-review-storage.ts` (`TextFileAdapter` over `app.vault.adapter`) and `diff-review.css`. The view model is core's `buildReviewView` (`src/core/view.ts`), so a Chrome UI can reuse it, and the render module too.

**Entry points.**
- Repository view: a git-compare icon on each branch record that has a `differential-review/snapshots/` folder.
- Command "Open differential review for this branch record", available on any note inside a branch record.
- Both open, or refocus, one tab per record. The view registers before the desktop-only return, so it works on mobile.

**UX.**
- The view always shows the latest snapshot. Check-offs are recorded against it.
- **Header.**
  - Progress for hunks, files and commits, with a meter.
  - A "Show" selector: "everything, badged since my last review" (the default), or "only changes since <snapshot>" for each earlier snapshot, labelled with its phase. The baseline hides hunks that exact- or moved-match that snapshot, and commits that are unchanged since it. Badges still come from review state, so "hardening since implementation, unreviewed" is that baseline plus "Hide reviewed".
  - A "Hide reviewed" toggle, on by default. The baseline and the toggle persist in the view state.
- **Hidden complexity.**
  - The "Since <previous snapshot>: …" line (`summarizeSnapshot`) appears only when the last snapshot changed, added or dropped something. A clean rebase shows nothing.
  - The re-look callout appears only when a commit is `changed` since its sign-off.
  - A fully reviewed pure rebase renders as "Nothing to review" with full progress.
- **Files.**
  - Collapsible sections, each with a checkbox and a reviewed/new/changed badge. Ticking the checkbox checks off the whole file (`markFileReviewed`); unticking removes the current and carried-over (`reviewedAs.hunkId`) records.
  - Each hunk renders as its own one-hunk diff2html patch, with a checkbox, a badge, the `@@` header, +/− counts and a whitespace-only tag. Meta units (renames, binaries, modes) render as text.
  - A changed hunk has "Δ since reviewed", and under a baseline "Δ since baseline". This interdiff diffs the two versions' `+`/`−` lines (`interdiffPatch`).
- **Commits.**
  - Each commit has a sign-off checkbox (`signOffCommit` / `revokeCommitSignoff`), a badge and the message.
  - A changed commit shows only its differing hunks, from the per-commit diff. A context-only one (`differingHunks: []`) says to re-look holistically and sign off again.
  - Hunks are checked off only from the file view (open question 4).
- **Keys** (view focused): `j`/`k` move, `x` checks off the focused file, hunk or commit, `o` opens or closes, `h` hides reviewed, `e`/`c` expand or collapse all.
- **Large snapshots.**
  - Sections fill lazily on first open. Files start expanded only when the visible hunks total at most 400 diff lines.
  - diff2html output is cached per patch, and parsed snapshots are cached per id (they're immutable). Reloads read only new snapshot files.
  - `matchHunks` memoizes fuzzy similarity per content-hash pair (`match.ts`). On a synthetic 1.2 MB, 2400-hunk snapshot with 900 changed hunks, deriving the view took about 1.7 s cold and about 85 ms per check-off after that.
- **Theme.** diff2html's light-scheme `--d2h-*` variables are mapped onto Obsidian tokens (`--background-*`, `--color-*-rgb`), scoped to `.gbdr`, so light and dark themes both follow Obsidian. `esbuild.config.mjs` concatenates `styles.css`, diff2html's CSS and `src/diff-review.css` into the built `styles.css`.

**Write safety.** The view writes only `review-state.json`.
- Each check-off is queued on one promise chain per view. Each queued write re-reads the file from disk, applies the pure mutation (core `updateReviewState`) and writes the result. A concurrent writer's check-offs on other keys survive, unless its write lands between the read and the write (milliseconds).
- The first write creates the `differential-review/` dir.
- Vault `create`, `modify`, `delete` and `rename` events under `<record>/differential-review/` reload the view, debounced. This picks up new agent snapshots and edits by other writers. The view ignores modify events whose content equals its own last write.
- A failed write shows a Notice and reloads from disk.

**Build.** diff2html 3.4.56 is pinned and bundled; it pulls its own `diff@8` alongside core's `diff@9.0.0`. The bundle grows from about 41 KB to about 210 KB. Core's `import "diff"` resolves from `differential-review/node_modules`, so `npm install` must run in `differential-review/` before `make plugin-build` or `make plugin-test`. Render tests use happy-dom 20.14.6.

**Remaining gaps.**
- There is no snapshot picker. Older snapshots can only serve as baselines; the view never shows them as the reviewed target.
- Hunks can't be checked off from a commit view.
- Commits that dropped out since the last snapshot aren't listed.
- The keyboard model is minimal: no `n` for the next unreviewed item.
- Writes aren't atomic: `adapter.write` has no temp-file rename. There is no compare-and-swap (open question 5).
- It hasn't been exercised inside a live Obsidian yet. DOM tests run under happy-dom, plus a static harness rendered in Chromium in light and dark.

## Open questions for John

1. **Commit snapshots to the vault repo, or keep them gitignored?** They are gitignored for now. Size is about 65–150 KB per snapshot for typical branches, roughly ×3 phases plus reruns per branch. But a long branch on a stale base can produce MBs. If they stay ignored, `review-state.json` synced to another machine refers to snapshots that aren't there, so only exact-ID matches survive there. Options: commit them, sync them outside git, or move `review-state.json` next to the ignored snapshots.
2. **Add a `rebase` phase** (or `review-response`)? gx_branches rebases are exactly what this tool is for, but they currently have no phase tag, so rebase snapshots would have to reuse `polishing`.
3. **Fuzzy threshold 0.6 at character level.** Is that the right "changed vs. new" line? Tune it once there are real UI sessions.
4. **Should hunk check-offs also be allowed from the commit view** (per-commit hunks), or only from the cumulative file view, as decided above?
5. **Concurrency on `review-state.json`.** Obsidian and Chrome could both write it. The Obsidian view re-reads before every write (`updateReviewState`), so only writes landing within the same few milliseconds can lose a check-off. Is that enough, or add a `revision` compare-and-swap?
6. **Chrome native-host API** for read/write (still open per the spec). It should implement `TextFileAdapter`, or `SnapshotReader` plus `ReviewStateStore`, over the existing host. See Interfaces for a sketch, and item 9 for message size.
7. **Merged or split hunks** (see the known limitation). Is it worth `h2` change-run fingerprints, or is failing safe good enough?
8. **Missing base metadata.** Many active records have only prose like "Base: `dev`". Migrate them to `upstream_base_branch` frontmatter, or have agents always pass `--base`?
9. **Chrome native messaging caps each host-to-extension message at 1 MB.** Typical snapshots (65–150 KB) fit. Snapshots of long or stale-base branches, which reach several MB, don't fit, so a naive `read(path)` fails. Options:
   - chunked reads;
   - have the host run `deriveReview` and send only the derived states plus per-file diff text on demand;
   - drop per-commit diffs from big snapshots.
10. **A reworded commit message keeps its sign-off.** The patch-id ignores the message, as the spec says. But a sign-off is meant to cover "the commit message, coherence". Should derivation flag a message-only change as info, for example by storing a message hash in the sign-off?
11. **Non-UTF-8 file content** is decoded lossily (U+FFFD). Fingerprints and patch-ids stay deterministic, but the stored diff text isn't byte-exact. Is that fine for review?
12. **Record lookup by branch name.** It was skipped (see Decisions). Add a `--branch` lookup under `~/.galaxy-brain/vault` if running from a worktree without flags matters.
13. **Generic flows.** Wire the snapshot into `GENERIC_IMPLEMENTATION.md` (Hand Off), `PROCESS_GENERIC_HARDEN_BRANCH.md` and `PROCESS_GENERIC_POLISH_BRANCH.md` too? Generic hardening writes no debrief, so its summary would need a home.
14. **Other branch-changing steps.** Should gx_branches rebases, gx_workhorse "Changes" (user-requested revisions) and review responses also snapshot? They'd need a phase tag (see item 2) or would reuse the nearest one. Also unwired: gx_workhorse Recover (walks only `GX_PROCESS_HARDEN_BRANCH.md`) and Parking on a Scope Decision take no hardening snapshot; Re-harden after a re-scope may take a fresh `implementation` snapshot.
