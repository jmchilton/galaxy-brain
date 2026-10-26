# Differential review: galaxy-brain integration

Local tooling for reviewing branches that keep changing through rebases, force-pushes and agent iterations. The reviewer checks work off once. After that, only what actually changed is shown again.

The library and generic CLI are their own package, [jmchilton/differential-review](https://github.com/jmchilton/differential-review), vendored here as the `differential-review-lib/` submodule. Its [README](differential-review-lib/README.md) covers the CLI, and its [design doc](differential-review-lib/docs/design.md) covers fingerprints, matching, state derivation, storage guarantees and the JSON formats. This document covers galaxy-brain's side: vault records, the factory wiring and the Obsidian view. The reader-facing overview is [`vault/agents/factory/DIFFERENTIAL_REVIEW.md`](vault/agents/factory/DIFFERENTIAL_REVIEW.md).

## Layout

```
differential-review-lib/      submodule: pure core (src/core), Node snapshot API and generic CLI (src/cli)
differential-review/          galaxy-brain's CLI: the package's commands with --record instead of --dir
  src/record.ts               index.md frontmatter, parent_branch / upstream_base_branch base choice
  src/run.ts                  RECORD_TARGET: createCli() targeted at vault records
  bin/differential-review     sh wrapper around dist/differential-review.cjs; follows symlinks
obsidian-plugin/src/diff-review-*.ts   the review view, the only writer of review-state.json
site/src/lib/records.ts       REVIEWABLE_RECORD_KINDS, isReviewableRecordKind, recordReviewDir
```

After cloning or pulling, run `git submodule update --init differential-review-lib`, then `npm install` in `differential-review-lib/` and `differential-review/`, then `make diff-review-build`. The plugin builds and tests import core from the submodule's source, so they need its `node_modules` too. `make diff-review-test` runs both suites.

To change the library, work in a clone of the package, push it, and bump the submodule here. Record-specific behavior stays in `differential-review/src/`.

## CLI usage

`make install` links the repository to `~/.galaxy-brain`. From anywhere, run:

```sh
~/.galaxy-brain/differential-review/bin/differential-review <command> [options]
```

`~/.galaxy-brain` exists only after `make install`, so the factory docs use the checkout path `~/projects/repositories/galaxy-brain/` instead. The bin follows symlinks. `dist/` is gitignored, so run `make diff-review-build` once in the checkout after cloning or pulling. Without a build, the bin says so.

```sh
# Agent post-phase step: run from the branch's worktree, or pass --worktree.
differential-review snapshot --record BRANCH_DIRECTORY --phase implementation|hardening|polishing|revision|review \
  [--worktree WORKING_DIRECTORY] [--head <rev>] [--base <ref>] [--remote <name>] [--json]

differential-review list   --record <dir> [--json]
differential-review status --record <dir> [--snapshot <id>] [--json]
differential-review [<command>] --help
```

`--worktree` defaults to the current directory. For a branch record, HEAD must then be on the record's branch, or the command fails. This guards against an agent whose cwd is the vault snapshotting galaxy-brain's own HEAD into a record. With an explicit `--worktree`, a different branch or a detached HEAD only produces a warning, because alts and renames are legitimate. Review records and `--head <rev>` skip the check: a PR worktree often has a review branch checked out, so agents fetch `pull/<N>/head` and pass `--head FETCH_HEAD`. The worktree is never touched.

`--record` is a branch or review record directory, `vault/repositories/<repo>/{branches,reviews}/<status>/<name>` (`REVIEWABLE_RECORD_KINDS` in `site/src/lib/records.ts`). Its review dir is `<record>/differential-review/`. Review `index.md` files have no frontmatter, so reviews always pass `--base`. It must already contain `index.md`. A path that has none is an error, never a new directory.

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
   - `upstream_base_branch` and `--base`: `origin/<name>`, then `upstream/<name>`, then other remotes, then the local branch, then the name as given. Local `dev` is often stale; one smoke run against a stale local `dev` turned up 252 extra commits. An override that is already `origin/dev` or a SHA falls through to itself.
4. The CLI diffs against `merge-base(base, HEAD)` and lists commits with `rev-list base..HEAD`. It never fetches.

## Storage

```
<record>/differential-review/
  snapshots/<YYYYMMDDTHHMMSSZ>-<phase>-<head12>.json   immutable, CLI-written
  review-state.json                                     reviewer-written via the plugin
```

Snapshots are gitignored (`/vault/repositories/**/{branches,reviews}/**/differential-review/snapshots/`); `review-state.json` is tracked. Snapshot IDs contain no colons, which break Obsidian sync and mobile. Immutability, idempotent reruns and the read-only guarantee for `review-state.json` are the package's; see its design doc.

The Chrome native host (`herdr-plugin/src/native-host.ts`) dispatches on typed requests: `lookup`, `launch`, `newAgent` and `open`. A differential-review adapter there would add something like `readFile`, `listFiles` and `writeReviewState` requests on vault-relative paths, restricted to `repositories/*/{branches,reviews}/*/<id>/differential-review/`, with check-off writes allowed only to `review-state.json`. An annotation bridge would separately expose reviewer thread writes and immutable reply creation. Message size is tabled; see Resolved by John.

## Tests

`make diff-review-test` runs the package's suite (core unit tests, plus CLI tests on real temp git repos with isolated config), then galaxy-brain's record tests in `differential-review/src/record.test.ts`. The record tests cover:

- A record's frontmatter base, and `--base` when there is none; no directory is created on failure.
- A record path without `index.md` is refused by `snapshot`, `list` and `status`.
- A defaulted `--worktree` fails when cwd is on another branch or detached; an explicit one only warns.
- Review records skip the branch check, need `--base`, and snapshot `--head` without touching the worktree.
- `origin/<base>` is preferred for upstream bases, the local branch for `parent_branch`.
- Usage errors and per-command help for the `--record` CLI.

The plugin's `diff-review-*.test.ts` render the package's real CLI fixtures (`differential-review-lib/src/core/fixtures/view-fixtures/`).

## Smoke run (agent 2, 2026-10-26)

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
| revision | `gx_branches/AGENTS.md` rebase rule; `gx_workhorse/AGENTS.md` Changes; `_shared/RESPOND_TO_REVIEW.md` | new `implementation_debrief.md` for Changes; none otherwise |
| review | `_shared/PROCESS_INITIAL_REVIEW.md`, start of "Run reviews in subagents", every round, all repositories | none |

`GX_PROCESS_HARDEN_BRANCH.md` is left alone. It writes no debrief of its own, and John has uncommitted edits at its end. The generic flows (`PROCESS_GENERIC_*`, used by pulsar, planemo, foundry and workflow_libs) aren't wired, per John. `vault/repositories/_defaults/branches/FILE_DOCS.md` documents `differential-review/**`, and `vault/agents/factory/BRANCH_FACTORY.md` mentions the snapshots. `_defaults/reviews/FILE_DOCS.md` and `REVIEW_FACTORY.md` do the same for reviews. Reviewing is optional for John: snapshots always land, and `review-state.json` only exists once John checks something off.

**Prerequisite.** In the main checkout, initialize the submodule, install both packages and run `make diff-review-build` (see Layout). Until then, agents paste the "not built" error into their debriefs and carry on. `launch_agent.sh` and `make install` are unchanged.

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

- **Phases.** `implementation | hardening | polishing | revision | review`, validated in one place (`PHASES` / `isPhase`). Adding a phase isn't a schema change.
- **Snapshots are gitignored by default.** `.gitignore` has `/vault/repositories/**/branches/**/differential-review/snapshots/`, and `review-state.json` stays tracked. This is the reversible choice; committing large diffs to history is not. John confirmed it.
- **No record lookup by branch name.** Agents already pass BRANCH_DIRECTORY. Finding the vault root from an arbitrary worktree means guessing (`~/.galaxy-brain`?), and a wrong guess could write a stray record into a real vault. Revisit if John wants `differential-review status` from inside a worktree with no flags.
- **Snapshot commands** (`snapshot`, `list`, `status`), plus `threads` and `reply` for review conversations. Interdiffs and phase views ("what hardening changed since implementation") are core queries for the plugins, not CLI commands.

- **The library is its own package** ([jmchilton/differential-review](https://github.com/jmchilton/differential-review)), vendored as the `differential-review-lib/` submodule, like `galaxy-architecture`. galaxy-brain's record layout is a `createCli()` target in `differential-review/`, so the package knows nothing about vaults.
- **Record tests import `site/src/lib/records.ts`** the way `obsidian-plugin` does. `differential-review/vitest.config.ts` (`oxc.tsconfig: false`) and the esbuild `tsconfig` option stop either tool from resolving `site/tsconfig.json`, which extends `astro`.

## Obsidian view

`obsidian-plugin/src/diff-review-view.ts` (the `ItemView`), `diff-review-render.ts` (plain DOM plus diff2html, no Obsidian APIs), `diff-review-storage.ts` (`TextFileAdapter` over `app.vault.adapter`) and `diff-review.css`. The view model is the package's `buildReviewView`, so a Chrome UI can reuse it, and the render module too.

**Entry points.**
- Repository view: a git-compare icon on each branch or review record that has a `differential-review/snapshots/` folder.
- Command "Open differential review for this record", available on any note inside a branch or review record.
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
  - Hunks are checked off only from the file view (open question 1).
- **Keys** (view focused): `j`/`k` move, `x` checks off the focused file, hunk or commit, `o` opens or closes, `h` hides reviewed, `e`/`c` expand or collapse all.
- **Large snapshots.**
  - Sections fill lazily on first open. Files start expanded only when the visible hunks total at most 400 diff lines.
  - diff2html output is cached per patch, and parsed snapshots are cached per id (they're immutable). Reloads read only new snapshot files.
  - `matchHunks` memoizes fuzzy similarity per content-hash pair. On a synthetic 1.2 MB, 2400-hunk snapshot with 900 changed hunks, deriving the view took about 1.7 s cold and about 85 ms per check-off after that.
- **Theme.** diff2html's light-scheme `--d2h-*` variables are mapped onto Obsidian tokens (`--background-*`, `--color-*-rgb`), scoped to `.gbdr`, so light and dark themes both follow Obsidian. `esbuild.config.mjs` concatenates `styles.css`, diff2html's CSS and `src/diff-review.css` into the built `styles.css`.

**Write safety.** Check-offs write only `review-state.json`. Thread and reply writes use the separate annotation store below.
- Each check-off is queued on one promise chain per view. Each queued write re-reads the file from disk, applies the pure mutation (core `updateReviewState`) and writes the result. A concurrent writer's check-offs on other keys survive, unless its write lands between the read and the write (milliseconds).
- The first write creates the `differential-review/` dir.
- Vault `create`, `modify`, `delete` and `rename` events under `<record>/differential-review/` reload the view, debounced. This picks up new agent snapshots and edits by other writers. The view ignores modify events whose content equals its own last write.
- A failed write shows a Notice and reloads from disk.

**Build.** diff2html 3.4.56 is pinned and bundled; it pulls its own `diff@8` alongside core's `diff@9.0.0`. The bundle grows from about 41 KB to about 210 KB. Core's `import "diff"` resolves from `differential-review-lib/node_modules`, so `npm install` must run there before `make plugin-build` or `make plugin-test`. Render tests use happy-dom 20.14.6.

**Remaining gaps.**
- There is no snapshot picker. Older snapshots can only serve as baselines; the view never shows them as the reviewed target.
- Hunks can't be checked off from a commit view.
- Commits that dropped out since the last snapshot aren't listed.
- The keyboard model is minimal: no `n` for the next unreviewed item.
- Writes aren't atomic: `adapter.write` has no temp-file rename. There is no compare-and-swap; John judged re-reading enough.
- The repository view re-renders only on markdown changes, so a branch's git-compare icon appears at its next re-render after the first snapshot lands.
- It hasn't been exercised inside a live Obsidian yet, and theme tokens were checked only with stand-in values. DOM tests run under happy-dom, plus a static harness rendered in Chromium in light and dark.

## Persistent diff comments

The Obsidian review view lets John click an old or new line number, Shift-click another line in that hunk for a range, and save a comment beside the diff. Root comments and replies render inline. The thread index and `[` / `]` navigate open threads. **Open threads only** narrows the diff, and resolved threads can be shown separately for reopening. Open threads remain accessible under reviewed and baseline filters. Unplaced threads show their original excerpt separately. Draft text survives new snapshots and failed writes. Stored threads remain readable when all snapshot files are unavailable.

The package owns the types, source-coordinate capture, placement and storage adapter. Data lives under `<review dir>/annotations/threads/<id>.json` and `annotations/replies/<id>.json`, both tracked in vault records. John creates and resolves thread files. Each response is a new reply file. CLI replies use an atomic no-clobber write and never rewrite a thread or `review-state.json`.

The [comment handoff](vault/agents/_shared/PROCESS_DIFFERENTIAL_REVIEW_COMMENTS.md) is selected explicitly through **Address diff comments** on Galaxy branch and review records. It reads `threads --record <dir> --open --json`, performs local requested work, snapshots any code revision, and appends responses with `reply --record <dir> --thread <id> --body-file <path> [--snapshot <id>] [--author <name>]`. It does not need a running Obsidian session. Agents leave thread resolution and check-offs to John.

Placement uses exact quoted source plus context for ambiguous repeats. Hunk similarity only supplies a candidate for an outdated thread. An original snapshot ID and excerpt are retained even after a rebase, changed code, or missing snapshots. Reply snapshot links identify the revision the agent is discussing. No change to the snapshot or review-state schema is needed.

Verification covers source ranges, moved/changed/missing code, ambiguous repeats, immutable reply files, reviewer state preservation, line-number selection, threaded replies, resolve/reopen, and draft recovery. Browser visual verification remains outstanding when no browser connection is available.

## Resolved by John (2026-10-26)

- **Snapshots stay gitignored** for now; `review-state.json` stays tracked.
- **`revision` phase added** for rebases, requested changes and review responses (see Factory integration).
- **Fuzzy threshold stays 0.6** (`FUZZY_THRESHOLD`); revisit after real use.
- **Re-read before each write is enough** for `review-state.json`; no compare-and-swap.
- **Reworded commit messages keep their sign-off.** Patch-id behavior is fine.
- **Generic flows aren't wired.**
- **"Hide reviewed" on by default** is fine.
- **Chrome is tabled**, including the 1 MB native-messaging cap (chunked reads vs. host-side derivation vs. dropping per-commit diffs).
- Unwired Recover / Parking paths and the unbounded similarity memo in `match.ts` are fine for now.

## Open questions for John

1. **Should hunk check-offs also be allowed from the commit view** (per-commit hunks), or only from the cumulative file view, as decided above?
2. **Chrome native-host API** for read/write (still open per the spec). It should implement `TextFileAdapter`, or `SnapshotReader` plus `ReviewStateStore`, over the existing host. See Storage for a sketch; message size is tabled above.
3. **Merged or split hunks** (see the known limitation). Is it worth `h2` change-run fingerprints, or is failing safe good enough?
4. **Missing base metadata.** Many active records have only prose like "Base: `dev`". Migrate them to `upstream_base_branch` frontmatter, or have agents always pass `--base`?
5. **Non-UTF-8 file content** is decoded lossily (U+FFFD). Fingerprints and patch-ids stay deterministic, but the stored diff text isn't byte-exact. Is that fine for review?
6. **Record lookup by branch name.** It was skipped (see Decisions). Add a `--branch` lookup under `~/.galaxy-brain/vault` if running from a worktree without flags matters.
