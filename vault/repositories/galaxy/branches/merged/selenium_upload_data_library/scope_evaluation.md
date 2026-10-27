# Scope evaluation (re-harden 3, fix phase)

**Recommendation: keep as is.** Head `1fccf61f2d5` on `release_26.2` (base `d2d1dcd883c`) carries:
- the tests answering davelopez's #24399 ask;
- the `start()` and Add Selected helper waits;
- the 5 product fixes the tests surfaced, each with its own red test.

That matches John's direction, and nothing is clearly missing. The remaining candidates fall into three groups:
- latent issues with no caller and no repro: `useAccessibleHover`, `createCollectionPayload`, dead selectors;
- dev refactors flagged by the reviews;
- the release_26.1 backport.

None of them warrants a scope change. 26.1 and a tooltip split are below as decomposition options and questions for John.

## Possible Decompositions

The diff vs `d2d1dcd883c` is 16 files, +322/-25, 11 commits. The order is Baselines 1-4, helpers 5-6, then fixes 7-11 (see `baseline_refactor.md`).

Test dependencies decide which splits work:
- **Fixes 7 and 8 (the folder-contents 500s)** are backend only. Each has its own red test: API `test_index_folder_without_description` and unit `test_library_folder_contents_service.py`. They split cleanly except for two things:
  - Fix 7's API test calls `LibraryPopulator.fetch_to_folder`, which lives in Baseline commit 1 (`4ebd3c2e61e`). A server PR either stacks on commit 1 or carries the helper itself.
  - Fix 7 also deletes the E2E folder-description workaround in `test_upload_activity.py`. If 7 lands ahead of the tests PR, that hunk moves to the tests PR.
- **Fixes 9, 10 and 11 (truncation, tooltip, duplicate HDAs)** go red only through the Baseline list E2E. Fix 11 also has a vitest. They can't land before Baselines 2-3.
- **The tooltip fix (10) has no red unit test.** The only vitest that failed without it was dropped in test challenges, and the 3 Baseline vGTooltip cases pass on base. A standalone tooltip PR has to carry or depend on the E2E, or add a real-browser red test.

| Option | PRs (landing order) |
|---|---|
| **A. One PR** | All 11 commits, as now. |
| **B. Tests / server / client** | (1) commits 1-6: Baselines + helper waits. (2) commits 7-8: server fixes. They need `fetch_to_folder` from commit 1, by stacking or by carrying it, and the E2E workaround hunk goes with (1). (3) commits 9-11: client fixes, stacked on (1). |
| **C. B with the tooltip as its own PR** | Same as B, but commit 10 (plus Baseline 4) is a separate galaxy-ui PR stacked on (1). It's the place to fold in `useAccessibleHover` alignment if wanted. |
| **D. Server fixes to release_26.1** | A or B on 26.2, plus a hand backport of 7-8 to `release_26.1`, carrying their API/unit tests and `fetch_to_folder`. `folders.py` drifts by about 140 lines between 26.1 and the base, and `schema.py` drifts heavily, so it isn't a cherry-pick. They forward-merge into 26.2, where this branch's copies become no-ops or conflicts. |

## Scopes considered

### 1. As implemented (recommended)

11 commits:
- 4 Baseline tests commits: regular-user import, list into a picked history from a subfolder via select-all, and vGTooltip focus cases;
- 2 E2E helper waits (Start, Add Selected);
- 5 product fixes: folder description 500, mid-upload 500, long-name truncation, hover tooltip on non-keyboard focus, and `copy_elements: false` for library-to-list.

| Pros | Cons |
|---|---|
| <ul><li>John's settled direction: every bug the tests found is fixed here</li><li>Each fix sits in the canonical layer: schema `str \| None`, an inner join mirroring `get_readme`, scoped CSS, a directive guard, one flag</li><li>Each fix has a red test: API, unit, E2E geometry, E2E absence, E2E id-set plus vitest</li><li>Reviewed by normal x4, Codex (no findings), thermo-nuclear, test challenges and polish. Baselines pass on unfixed code. 3/3 on both backends at head</li><li>Commit order already supports any split below</li></ul> | <ul><li>The vGTooltip change alters hover-tooltip focus behavior for every `v-g-tooltip` (about 280 sites) and the 26.2+ Tool Shed frontend. No Tool Shed run was done</li><li>The tooltip fix is guarded only by E2E</li><li>`useAccessibleHover` (GTooltip in GLink/GButton) still shows on any focus, so behavior is split across two tooltip paths</li><li>All 5 bugs also exist on 26.1, which isn't covered</li><li>Guaranteed forward-merge conflict on `data_library_select_all`: take dev's e971fc43a4d</li></ul> |

### 2. + Align `useAccessibleHover` with the vGTooltip guard (not recommended here)

Apply the same `:focus-visible` gate to `client/packages/ui/src/composables/accessibleHover.ts`. It registers `focus` → `enter` unconditionally, at lines 20 and 65. GTooltip uses it in GLink and GButton.

| Pros | Cons |
|---|---|
| <ul><li>One consistent focus rule across both galaxy-ui tooltip mechanisms</li><li>Same class of lingering-tooltip bug for a GButton or GLink that opens a GModal</li></ul> | <ul><li>No observed repro; nobody has seen a lingering GTooltip</li><li>Widens a shared-UI behavior change (Tool Shed included) on a release branch</li><li>A second copy of `accessibleHover.ts` lives in `client/src/composables`, so a clean fix means deduplicating first, which is dev work</li><li>Pairs naturally with sharing `isKeyboardFocus` with GPopover, which thermo already deferred to dev</li></ul> |

<details><summary>Notes</summary>

If John picks decomposition C, the standalone tooltip PR is a reasonable place to fold this in, since it's then a "galaxy-ui focus-tooltip policy" PR rather than a bundled release fix. It would need its own red test. A GButton that opens a GModal, then closes it with the mouse, is the analogue of the E2E.
</details>

### 3. + Fix `createCollectionPayload` `copy_elements || true` (not recommended here)

`api/datasetCollections.ts:118` can never send `false`.

| Pros | Cons |
|---|---|
| <ul><li>One-line `?? true`, same theme as fix 11</li></ul> | <ul><li>Latent: no current caller passes `false`, and the Upload Activity bypasses it, so there's no behavior change on release</li><li>Outside the diff. Dev follow-up with a vitest</li></ul> |

### 4. + Repair the dead `remote_files_select_all` / `data_library_item_checkbox` selectors (not recommended)

They're broken on 26.2 the same way `data_library_select_all` was.

| Pros | Cons |
|---|---|
| <ul><li>Small `navigation.yml` edits</li></ul> | <ul><li>No Python callers, so a fix can't be validated</li><li>Dev already rewrote `remote_files_select_all`, so that one would conflict on forward merge</li></ul> |

### 5. + Move the truncation CSS into `TargetHistoryLink`; share `isKeyboardFocus`; real-`focus()` tests (not recommended here)

These are the thermo-nuclear "code judo" moves: delete both consumers' `:deep` blocks, share the focus helper with GPopover, and drop the synthetic-`focusin` `:focus` conjunct.

| Pros | Cons |
|---|---|
| <ul><li>Removes duplication and leaky `:deep` selectors</li></ul> | <ul><li>Changes `WorkflowAnnotation` and `GPopover` on a release branch</li><li>Rewrites about 7 existing tests</li><li>Refactor, not a bug fix. Dev</li></ul> |

### 6. + Reorder the legacy library upload producer (`upload_common.__new_library_upload`) (not recommended)

Link the LDDA before committing the LD, so the mid-upload state never exists.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the cause, not just the reader</li></ul> | <ul><li>The reader must tolerate existing unlinked rows anyway</li><li>Larger change to legacy code. Two reviews declined it</li></ul> |

### 7. Carried over from earlier_drafts/2 (unchanged, not recommended)

Three candidates from the previous evaluation: inline `UploadMethodInlineContext.start()` hardening, a search and breadcrumbs E2E, and a negative-permission E2E. The old scope 2 (Add Selected wait) has since landed as commit 6.

| Pros | Cons |
|---|---|
| <ul><li>Each closes a small coverage or helper gap</li></ul> | <ul><li>Inline `start()` can't be tested on :8092 (no `cat` tool), so it's a dev helper refactor</li><li>Search and breadcrumbs need product `data-test-id`s, and returns diminish</li><li>Negative permissions are already covered by `test_folder_contents.py::test_index_permissions`</li></ul> |

### 8. Contract (not considered)

Move fixes back out to separate branches.

| Pros | Cons |
|---|---|
| <ul><li>A smaller PR</li></ul> | <ul><li>Contradicts John's settled decision. The decompositions above already allow splitting PRs without contracting the branch</li></ul> |

## release_26.1

All 5 bugs exist on `origin/release_26.1`:
- `folder_description: str`;
- the same outer join and `ldda.dataset` dereference;
- `copy_elements: true` after `copyDataset(..., "library")`;
- TargetHistorySelector, with minor drift (about 15 lines);
- `vGTooltip` with an unconditional `focusin` show, plus a native `<dialog>` GModal.

The truncation and tooltip bugs are inferred from code on 26.1, not reproduced there.

Differences that matter for a backport:
- **The tooltip is not shared UI on 26.1.** `vGTooltip.ts` lives in `client/src/directives/`, and 26.1's Tool Shed frontend doesn't depend on `@galaxyproject/galaxy-ui`. So the Tool Shed blast radius applies only to 26.2 and later.
- **Server fixes port with their tests.** The API and unit tests aren't route-specific, but `folders.py` and `schema.py` drift, so it's a hand port.
- **Client fixes are hand ports without red tests.** Their red tests are the 26.2-route E2E, so a 26.1 port would need new red tests or would rely on reasoning.

## Follow-ups (dev)

- Align `useAccessibleHover` and deduplicate the two `accessibleHover.ts` copies (scope 2).
- Share `isKeyboardFocus` between GPopover and vGTooltip, and convert synthetic-`focusin` tests to real `focus()` (scope 5).
- Move truncation into `TargetHistoryLink` (scope 5).
- Fix `createCollectionPayload` `|| true` (scope 3).
- Move `start()`/`cancel()`/`_button_group` into `UploadContext`, and switch the inline context to nav targets. Convert `test_upload_activity_collection.py:77`. Consider splitting `upload_activity_helpers.py` (1038 lines).
- Forward merge: take dev's e971fc43a4d `data_library_select_all`, then run the list test on dev.

## Questions for John

- One PR (A), or split tests / server / client (B or C)?
- Tooltip: keep it bundled, or make it its own galaxy-ui PR (C), possibly with `useAccessibleHover`?
- Smoke-check the Tool Shed frontend for the vGTooltip change before PR, or leave it to review?
- Backport to 26.1: the server fixes only (D), all 5, or none? Is 26.1 still in the support window?
