# Scope evaluation

**Recommendation: expand.** Keep the branch as implemented and add three things. First, fix `new_data_manager_required`, which reads the wrong metadata key, so data manager changes never force a new installable revision on upload and the dry run reports "overwrite" for exactly that case; the fix flips one existing `dev` unit assertion that pins the bug, which needs John's sign-off. Second, always stage sample files in a separate temp dir in tool shed reset mode and delete the `isolate_files_dir` flag, which fixes the deferred `reset_metadata` bugs with sample-only tools and stale samples. Third, add a downloadable signal so `creates_new_installable_revision` actually means installable before the schema ships. Leave out the Tool Shed 2.0 UI, warning on or refusing same-version overwrites in real uploads, `content_alerts`, the `numeric_revision` backfill, and planemo or bioblend consumption.

In more detail:

1. **Fix `new_data_manager_required`.** It reads the wrong metadata key, so data manager changes never force a new installable revision on upload.
   - The dry run now answers "overwrites" for exactly the case it exists to flag.
   - The fix flips one existing `dev` assertion that pins the bug (`test_reset_dm_with_uninstallable_revisions`, line 51, `== 1` → `== 2`). John has to sign off on that change.
2. **Always isolate sample-file staging in tool shed reset mode, and delete the `isolate_files_dir` flag.** This fixes the deferred `reset_metadata` bugs (sample-only tools, stale samples) and removes a flag the thermo-nuclear review wanted gone.
3. **Settle what `creates_new_installable_revision` means before the schema ships.** Add whether the tip's row would be downloadable, so the field says "installable" truthfully.

Leave out:
- the Tool Shed 2.0 UI (it has no upload flow to extend)
- warning on or refusing same-version overwrites in real uploads
- `content_alerts`
- the `numeric_revision` backfill
- planemo and bioblend consumption

## Possible Decompositions

About 750 non-generated lines changed: ~300 production, ~450 test. `schema.ts` (+91) is generated. The branch already comes as reviewable commits, so the natural cut points follow them.

**As implemented.** Four pieces, landing in this order:

| # | Contents | Commits | Notes |
|---|---|---|---|
| 1 | Baseline tests for upload metadata outcomes | `a3007c8cc7b` (+76) | Green on `dev`. Can land alone. |
| 2 | `upload_tar` dry run: clone leak + email alerts | `c2bac1bd542` (+90/−4) | Nothing on `dev` calls `upload_tar(dry_run=True)`, so this is hygiene, not a user-facing fix. Target `dev`. |
| 3 | Behavior-preserving refactors: `plan_tip_metadata` / `tip_metadata_error` split, orphan warning helper, `files_dir` keying | `62df8a55c20`, `8288b0bdbb2`, `2a540f0bbbe` (+96/−78) | Pinned by 1. |
| 4 | Feature: `?dry_run=` route, `upload_tar_dry_run`, response models, `isolate_files_dir`, throwaway data tables, `hg_util.get_repo` / `get_changed_paths`, populator, tests | `6a0913cf62a` (+584/−29) | Depends on 2 and 3. |

A coarser two-PR variant: 1+2+3 as "upload metadata cleanup", then 4.

**With the recommended expansion.** Two new pieces slot in:

- **DM: `new_data_manager_required` key fix + flipped assertion + an upload-path test.** Independent of everything above.
  - The same bug is on `release_25.1` and `release_26.0`. It could go out as its own release-branch fix (it changes which uploads create installable revisions on production sheds) and get merged forward.
  - Or it lands on `dev` before 4, so the dry run reports the corrected decision from day one.
- **ISO: reset mode always stages samples in a separate temp dir.** Two possible orders:
  - Before 4: the feature needs no flag and just uses reset mode.
  - After 4: this piece deletes the flag 4 added.
  - Either way it changes what admin `reset_metadata` produces.
- **The response-semantics change** (item 3) belongs inside 4, since it shapes the new schema.

## Scopes considered

### As implemented

The partial dry run on `dev` is finished. `POST /api/repositories/{id}/changeset_revision?dry_run=true` runs the full upload in a throwaway clone and reports:
- whether a real upload would be accepted
- new revision vs overwrite (and which changeset)
- per-tool version changes and file adds/removes/modifies

It persists nothing, sends no alerts and removes the clone. The tip metadata decision is split out of `set_repository_metadata`, so the dry run and real uploads share it.

| Pros | Cons |
|---|---|
| <ul><li>Covers every item in the posted issue except `content_alerts`.</li><li>Shares the shed's own decision code; no forked write path.</li><li>Parity tests check dry run against real upload.</li><li>Fixes the latent clone leak and alert bug.</li></ul> | <ul><li>Faithfully reports a decision that is wrong for data manager repos. It says "overwrite" for an added data table.</li><li>Adds the `isolate_files_dir` flag only because `reset_metadata`'s staging bug was deferred.</li><li>`creates_new_installable_revision` means "new metadata row", which can be non-installable.</li></ul> |

### Expand (recommended): fix the data manager decision

`new_data_manager_required` (`repository_metadata_manager.py:727`) passes whole metadata dicts to `compare_data_manager`. That function reads `data_managers` at the top level, but the key is nested under `data_manager`. The `else` branch reads the same wrong key. The fix is to read `.get("data_manager", {})` on both sides, mirroring the reset path at lines 343–364.

| Pros | Cons |
|---|---|
| <ul><li>Directly serves the issue: the dry run's headline answer is wrong for this class without it.</li><li>Finishes John's own 2022 fix `cdfdaaf017f` ("data manager changes misaligned"), which aimed at this upload/reset gap and missed on the key.</li><li>About 5 lines, in code the branch already refactors (`plan_tip_metadata` calls it).</li><li>Experiment: only one existing unit test flips (see details). I didn't run the functional suite; `test_1460_data_managers.py` uploads a single revision, so it shouldn't be affected.</li><li>The fixture `data_manager_gaps` already exists.</li></ul> | <ul><li>Changes real upload behavior on production sheds: data manager changes start creating installable revisions. That is the intended behavior, but it is visible.</li><li>Changes a `dev` assertion that pins the buggy outcome. That needs John's sign-off.</li><li>Present since at least `release_25.1`, so it raises the question of whether to backport it separately.</li></ul> |

<details><summary>Experiment</summary>

I wrote a pytest plugin in the scratchpad. It patches `RepositoryMetadataManager.new_data_manager_required` to compare `old.metadata["data_manager"]` with `self.metadata_dict["data_manager"]`, and I ran `PYTHONPATH=lib pytest -p dm_fix_plugin test/unit/tool_shed/` with no worktree changes. Result: 1 failed, 135 passed, 12 skipped.

The only failure was `test_reset_dm_with_uninstallable_revisions` line 51: `assert len(new_repository.downloadable_revisions) == 1` got 2.
- That test uploads `data_manager_gaps` revisions 0–2, where revision 2 adds a `testbeta2` data table. It then asserts that `reset_metadata` produces 2 downloadable revisions.
- With the fix, upload and reset agree at 2, which is what `cdfdaaf017f` set out to do.

Suggested coverage: a parity test for the dry run (in `test_upload_metadata.py`) on `data_manager_gaps` that reports `creates_new_installable_revision: true` for revision 2. It is red on the branch today.

`git show origin/release_25.1:...` and `origin/release_26.0` contain the identical bug.

</details>

### Expand (recommended): always isolate reset-mode sample staging

In reset mode, `generate_metadata_for_changeset_revision` stages `X.sample → X` copies inside the clone it is scanning, and prefers the real repository's tip sample files over the clone's. The branch works around this for the dry run with `isolate_files_dir=True`. Make isolation unconditional on the tool shed's reset path and delete the flag.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the pre-existing `reset_metadata` bugs that the Codex review deferred. Reset can currently pick up tools shipped only as `*.xml.sample`, and stale copies persist across `hg update` (untracked files).</li><li>Reset of old revisions stops reading tip sample files.</li><li>Deletes the flag, the class default and the constructor kwarg. This is the simplification the thermo-nuclear review wanted.</li><li>Reset and upload stage samples the same way, so a dry run, a real upload and a reset agree.</li><li>Experiment: unit suite green with isolation forced on everywhere.</li></ul> | <ul><li>Changes the metadata that admin `reset_metadata` produces on production sheds for repositories with sample-only tools or changing samples. #21786's reset `dry_run` lets admins preview this.</li><li>The functional reset tests were not run under the change. None of the unit reset fixtures (`column_maker`, `column_maker_with_download_gaps`, `data_manager_gaps`) ships a `.sample` file, so the green suite is weak evidence.</li><li>The Galaxy-side generator never runs reset mode (`lib/galaxy` passes only `False`), so the change could live on the shed side. Putting it on the base class needs care.</li></ul> |

<details><summary>Experiment and a small add-on</summary>

I wrote a scratchpad plugin that wraps `RepositoryMetadataManager.__init__` to force `isolate_files_dir=True`. A class-level patch would be shadowed by the instance assignment, as the test-challenge debrief found. Result: 136 passed, 12 skipped.

Needed: a red test that resets a repository whose revision ships a tool only as `.xml.sample`, or whose sample changes between revisions, and asserts that no spurious tool metadata appears.

Add-on in the same lines: in isolated mode the staging `work_dir` (a mkdtemp) leaks if metadata generation raises. Dry runs are meant to be run repeatedly by CI on bad uploads, so a `try/finally` around staging is cheap. That leak is pre-existing for real uploads.

</details>

### Expand (recommended): make `creates_new_installable_revision` mean installable

Today the field is `bool(metadata_dict) and overwritten is None`, which means "a new `repository_metadata` row". A new row for a readme-only tip is not downloadable. An overwrite rewrites `downloadable` too, so an upload can turn an installable revision non-installable, and the response can't say so.

The proposal: add `downloadable: bool` (`metadata_util.is_downloadable(metadata_dict)`) for the row being written, and define `creates_new_installable_revision` as new row and downloadable. Alternatively, rename the field to what it measures.

| Pros | Cons |
|---|---|
| <ul><li>The schema is public and new; it is cheap to change now and expensive after planemo consumes it.</li><li>The issue marked field names "not final".</li><li>Lets planemo say "this upload makes revision X uninstallable".</li><li>About 5 lines, a schema regeneration and one assertion.</li></ul> | <ul><li>Normal review 1 called the readme-only case an edge case.</li><li>One more response field.</li></ul> |

### Expand (not recommended): warn on same-version overwrites in real uploads

`set_repository_metadata` already computes the plan, so a real upload could append "overwrote installable revision X in place" to its message when the plan overwrites. A refusal is the stronger version.

| Pros | Cons |
|---|---|
| <ul><li>Protects uploaders who don't use the dry run.</li><li>Cheap once `plan_tip_metadata` exists.</li></ul> | <ul><li>Changes real upload semantics. The posted issue explicitly deferred this to a separate discussion.</li><li>Every same-version metadata-only tweak would get noise. A refusal would break existing IUC workflows.</li><li>Better decided after planemo's consumption shows what's useful.</li></ul> |

### Expand (not recommended): Tool Shed 2.0 UI upload dry run

Show the dry run in the TS2 frontend's upload flow.

| Pros | Cons |
|---|---|
| <ul><li>Was an open question in the issue draft.</li></ul> | <ul><li>The TS2 frontend has no upload flow; uploads happen only through the API (planemo). This would be new UI, not an extension.</li><li>Needs E2E coverage and design work out of proportion to the issue.</li></ul> |

### Expand (not recommended): `content_alerts`, `numeric_revision`, client and reuse churn

These are four small extensions:
- `content_alerts` in the response.
- Making `plan_tip_metadata` avoid the `numeric_revision` backfill commit.
- A distributable client method beyond the test populator.
- Converting `shed_index.py` / `testcase.py` to `hg_util.get_repo`, and the reset clone to `temporary_clone`.

| Pros | Cons |
|---|---|
| <ul><li>Each is small.</li></ul> | <ul><li>`content_alerts` is filled only when admins subscribe; it is moderation-only.</li><li>The backfill is a lazy fill of a derived column. The same read path runs on GET endpoints, and it changes no outcome.</li><li>planemo and bioblend live in their own repositories (planemo#1525 / #1752 follow-up).</li><li>The reuse conversions are unrelated churn, and the reset clone has different error semantics (normal review 1, item 10).</li></ul> |

### Contract: decision only, or cleanup only

There are two ways to contract:
- (a) Drop `tools` and `files` from the response and report only the decision.
- (b) Ship only pieces 1–3 (the baseline, the `upload_tar` fix and the refactors) and defer the API.

| Pros | Cons |
|---|---|
| <ul><li>(a) A smaller schema.</li><li>(b) Smaller, purely internal changes.</li></ul> | <ul><li>(a) planemo needs the file list to explain an overwrite, which is the issue's motivating case. Removing it just moves the diff into clients.</li><li>(b) Leaves the issue unaddressed. Piece 2 has no production caller on its own.</li></ul> |
