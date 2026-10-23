# Thermo-nuclear review

Verdict: approve, no changes. This is a fresh pass after the re-scope; the earlier pass is [earlier_drafts/1](earlier_drafts/1/thermo_nuclear_review.md). I found no structural regression, no code-judo move left, and no missed canonical helper, so I acted on nothing. Head stays `30f2122cd91`, which matches `jmchilton`. There was no rebase or push.

## Not acted on

- **The `# GButton disables via the g-disabled class` comment sits over `delete_button_enabled` only.** It applies to `confirm_enabled` too. A one-word yml comment tweak isn't worth a fixup, a force-push and an 8-run matrix on its own.
- **A `Literal` type for `operation`.** The re-scope review already marked it optional, and I agree. Python has no canonical cleanup-id type to reuse; the ids live in client `categories.ts`. A new alias in `navigates_galaxy.py` would only restate the docstring.
- **Folding the `no_items` wait into the helper, or closing the result modal inside it.** Settled by the [polish pass](polish_e2e_tests_debrief.md): it would bury the test's UI assertion and change what the gxui verb sees.
- **The double `get_history(archived_id)` fetch and the `details()` closure for the `file_size` lookups.** These are readability nits, settled by [test challenges](test_challenges_debrief.md).
- **Shared fresh-user setup for the two purge tests.** Settled by the [re-scope review](subagents/rescope_normal_review.md): it's two lines in an existing inline pattern.
- **No compat wrapper, and no renames.** The no-wrapper call was settled in the [re-scope debrief](implementation_rescope_debrief.md). The two names are kept because another branch uses them.
- **`screenshot_if(prefix and ...)`, file sizes, and splitting the `cleanup` component.** Settled by the earlier pass, and nothing has changed since.
- **The 15s paused-job race.** Settled by [codex](codex_review.md).

## Tests

No code changed, so these were sanity runs at `30f2122cd91`. Each ran one at a time under Playwright on a framework-managed server. They close the gap left by the polish pass, which didn't rerun these two at this head.

| Test | Playwright |
|---|---|
| `test_resume_paused_job` | pass (48s) |
| `test_history_storage_accessibility` | pass (28s, 30s) |

The first accessibility run failed, but the cause was the environment, not the branch. The axe script fetch hit a DNS error resolving `cdnjs.cloudflare.com`. The next two runs were clean.

The two-backend matrix for the purge tests at this head is in the polish debrief. The resume and accessibility tests have two-backend results at `6d21d8c4d45` in the re-scope debrief.

<details><summary>Full review</summary>

Scope: `b66ec973f2b...30f2122cd91`. That's 4 commits and +137/-5 lines across 6 files: two `data-description` client hooks, a `storage_dashboard.cleanup` yml component, three `NavigatesGalaxy` helpers, three new E2E tests, and one touched test.

**Since the earlier pass:**
- Its main code-judo item, generalizing the helper to `storage_dashboard_cleanup(operation, ...)`, is now done. The duplicated `deleted_datasets` literal is gone, and the helper matches the `${operation}`-parameterized selectors and the shared `ReviewCleanupDialog`.
- That makes the earlier pass's restack note stale. It said gxui's no-argument call to `storage_dashboard_purge_deleted_datasets()` keeps working, which is no longer true. `index.md` already gives the correct note: rebind the verb to `storage_dashboard_cleanup("deleted_datasets", ...)`.
- What's new: the `review_item` and `success_close` selectors, the `_review` shot moved to before select-all, and the histories test.

**1. Structural regressions:** none.
- One helper now drives all three cleanup operations.
- The histories test needed no new client hooks.
- Nothing is bolted into shared flows: the only shared-path edits are two `data-description` attributes.

**2. Code-judo:** none left.
- **The `no_items` wait.** It's repeated after every `storage_dashboard_cleanup` call. Moving it into the helper would delete three lines, but it's the test's assertion, and select-all isn't guaranteed to empty the card for a non-fresh gxui user (polish). Keep it.
- **`navigate_to_storage_dashboard` + `free_space_link` click.** This prefix is shared by the helper and the accessibility test. The test takes a screenshot between the two steps, so a combined `navigate_to_storage_cleanup` wouldn't serve it.

**3. Spaghetti:** none. The helper has no branching beyond `screenshot_if`'s existing falsy-label check.

**4. Boundaries and canonical reuse.** I searched `navigates_galaxy.py`, `has_driver*.py`, `smart_components.py` and `wait_methods_mixin.py` for helpers the cleanup helper should reuse:
- **Confirm modal:** no helper exists. The only `.g-modal-confirm-buttons` use is inline in `rename_modal_rename`.
- **Select all:** no helper. Every `select_all` in `navigation.yml` is a per-component selector (`library_folder`'s GTable one is `thead .g-table-select-column .g-checkbox`, scoped to that page).
- **Enabled-wait:** there's no `wait_for_enabled` that honors `g-disabled`. The only precedent is an inline `has_class("g-disabled")` assert.

The new selectors follow existing patterns:
- `review_item` uses `tbody tr[aria-rowindex]`, the same as `import_datasets_from_history_modal_*`.
- `success_close` uses `.g-modal-close-button`, the same as `job_table_ok`, `save_as_modal_close` and `location_details_ok_btn`.
- `confirm_enabled` uses `.g-modal-confirm-buttons button:last-child`, the same as `modal-select-history-storage-location`.
- `review_item` is anchored on the component's own `data-test-id="review-table"`, not on GTable internals alone.

`operation: str` with ids in the docstring is acceptable. A `Literal` would be the only typed improvement, and there's no Python-side canonical to point at.

Nit: the g-disabled comment covers only `delete_button_enabled`, though `confirm_enabled` uses the same trick.

**5. File size:**

| File | Lines | Growth from this PR |
|---|---|---|
| `navigates_galaxy.py` | 3453 | +30 |
| `navigation.yml` | 1934 | +14 |
| `test_history_storage.py` | 148 | |
| `test_history_panel.py` | 215 | |

The two large files were already past 1k before this PR, so it pushes nothing across the line.

**6. Modularity:**
- The tests use existing populators for all setup and checks: `new_history`, `delete_history`, `archive_history`, `get_history`, `get_history_dataset_details`, `total_disk_usage`, `update_dataset`, `run_tool`.
- `archive_history` returns a raw `Response`, and `.raise_for_status()` matches how its API callers use it.
- The local `purged()` closure earns its place: it's used four times.

**7. Legibility:**
- Comments are short, and each explains something non-obvious (transitions, bootstrap-vue hidden inputs, purge unarchives, the modal covering the card).
- `test_resume_paused_job` reads top-down: API setup, UI under test, then the state transition.

</details>
