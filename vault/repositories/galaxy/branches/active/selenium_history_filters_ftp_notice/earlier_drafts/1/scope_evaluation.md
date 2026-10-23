# Scope evaluation: selenium_history_filters_ftp_notice

**Recommendation: expand, modestly.** Keep everything that is on the branch (John: all of batch 7 in one branch, stacked on #24380). Then add two small items in code the branch already touches:
1. `FtpUploadHelp.vue` owns its visibility rule. It takes the current URI and shows only for `gxftp://`, and FilesDialog's `showFTPHelper` ref goes. It also skips the "log in to the FTP server at" sentence when `ftp_upload_site` is unset, where it now renders an empty `<strong>`.
2. The long-name wrap fix covers the Upload Activity's other browser, `DataLibraryUpload.vue`. Its Name cell has the identical `fixed` GTable + `d-flex` + bare-span pattern. Move the rule into `shared/upload-table-shared.scss` and add one layout test like the remote-files one.

Don't contract, and leave the rest of the reviewers' deferrals deferred (reasons below). Evaluated `d83f7eaa13c..HEAD` at `c0dc095f409`.

## Possible Decompositions

The branch adds about 213 lines of non-generated code. These are for John to decide on later; this section doesn't recommend a split. Each piece sits on #24380 (or on `release_26.2` once #24380 merges).

**Option A: three PRs by area, in landing order.**
1. **History panel filters and Selection menu.** Commits:
   - `85cdc82cd75`: the `history_panel.search` fix, `search_reset`, `history_panel_filter`, and the `test_collection_builders` / `test_history_related_filter` switch.
   - `0ac901aa482`: the `history_panel_confirm_selected_operation`, undelete and hide helpers.
   - `4e6666a7ffe`: the Baseline undelete/hide E2E.

   This piece is test-only, and it alone needs #24380.
2. **Remote-files helpers.** Commits:
   - `519f7e8739d`: search before ticking, plus the `_upload_all` strengthening.
   - `baa08b28110`: `open_remote_folder` / `path=`.
   - `38efba63f5b`: the Baseline subfolder upload test.

   This piece is test-only and independent of #24380.
3. **Remote-files UI fixes.** Commits:
   - `a47703fbac1`: the Baseline vitest.
   - `3cb2cd26015`: the `FtpUploadHelp` extraction.
   - `15a5ef5663f`: the FTP notice regression fix.
   - `c0dc095f409`: the long-name wrap.

   It needs (2) for `open_remote_folder`. The recommended expansion lands here.

**Option B: two PRs, tests versus fixes.**
1. PR A is (1) and (2) above: helper and E2E coverage only.
2. PR B is (3) plus the expansion: the product fixes.

This gives reviewers one "client bugs" PR to look at on 26.2.

**Option C: as is, one PR** (John's current decision). The Baseline commits are already ordered so that either split above can be cut by commit range without rewriting.

## Scopes considered

### 1. As implemented

The branch contains:
- Two 26.2 client fixes: the FTP notice is back in Choose Remote Files, and long remote names wrap.
- The `history_panel.search` selector fix plus filter and Selection-menu helpers.
- Remote-files `open_remote_folder`, `path=`, and search-before-tick helpers.
- Five new or extended E2E tests and one strengthened vitest.

| Pros | Cons |
| --- | --- |
| Matches John's "everything in one" decision for batch 7 | `FtpUploadHelp` is a half-extraction: both callers repeat the `gxftp://` check |
| Each fix was red before and is green after, on both backends | The same wrap bug is left in the sibling data-library browser |
| Hardened by the normal, Codex, test-challenge, thermo-nuclear and baseline-refactor passes | The notice still shows an empty server name when `ftp_upload_site` is unset |

### 2. Recommended: `FtpUploadHelp` owns its rule and guards an unset site

- Give the component a URI prop (or have it read the URL tracker), and put `v-if="uri === 'gxftp://'"` inside it.
- Drop FilesDialog's `showFTPHelper` and its set-on-`load()` timing.
- Render the "log in to the FTP server at …" sentence only when `config.ftp_upload_site` is set.
- Add vitest cases: one for unset site, and one per caller for non-FTP URIs.

| Pros | Cons |
| --- | --- |
| Finishes the abstraction the branch started: the component is new here, so it isn't churning old code | Touches FilesDialog's pre-branch `showFTPHelper` timing; needs the FilesDialog vitest to keep passing |
| Removes the one duplication thermo-nuclear flagged | Small behavior change on an unset site (the sentence is dropped). That's arguably a fix, but it needs a line in the PR |
| Fixes the empty `<strong>`, a real bug in the touched component (`ftp_upload_site` is `required: false` in `config_schema.yml`) | |

<details>
<summary>Details</summary>

- Thermo-nuclear deferred this move to dev because the 26.2 fix should stay a minimal extraction. The scope process lists "targets a release branch" as a reason John has overridden. The extraction is this branch's own commit (`3cb2cd26015`), so finishing it costs a few lines.
- I checked for other copies of the notice. `grep "log in to the FTP"` and `grep "ftp-upload/"` find only `FtpUploadHelp.vue`. `Collections/wizard/SelectFolder.vue` takes `ftpUploadSite` but renders a different "load your FTP directory" link, not the notice, and `RuleCollectionBuilder.vue` only uses it to validate. So there's no third caller to route through it.
- Moving the file out of `FilesDialog/` (it's now imported from `Panels/Upload/`) can ride along cheaply because the file is new on this branch. It's optional and cosmetic.

</details>

### 3. Recommended: long-name wrap for the data-library browser too

- `DataLibraryUpload.vue`'s library and folder tables use the same `fixed` `browser-table` GTable. In both, the Name cell's label span sits in a `d-flex` div with no `min-width: 0` or wrap.
- Hoist `min-width: 0; overflow-wrap: anywhere` into a mixin or class in `shared/upload-table-shared.scss`, which both components already import.
- Apply it to `data-library-browser-item-label` and `data-library-browser-library-label`.
- Add one E2E that measures a long library dataset name against its `td`, red before the fix. Use the existing `upload_context("data-library")` helpers.

| Pros | Cons |
| --- | --- |
| Same bug, same Upload Activity, same fix: reviewers would ask why only one browser was fixed | Not yet reproduced. The red run is the first step, and if it doesn't go red, drop this item |
| Shared SCSS rule instead of two scoped copies | Overlaps `selenium_upload_data_library`, which edits `test_upload_activity.py` and the data-library helpers in `upload_activity_helpers.py`. Keep this to CSS plus one test and use the existing helpers only |
| Cheap: CSS plus one test | Adds a second client file to the 26.2 fix PR |

<details>
<summary>Details</summary>

- The sibling branch's diff (`d2d1dcd883c..20158a45c73`) doesn't touch `DataLibraryUpload.vue` or `upload-table-shared.scss`, so the CSS won't conflict. Its `min-width` work is on the target-history banner. The new test should go in its own method so it doesn't conflict with the sibling's edits to `test_upload_activity.py`. If the sibling merges first, rebase onto it and reuse its helpers.
- Before picking the class names, check the folder-contents table at lines 779 to 840 and the library table at lines 750 to 775 of `DataLibraryUpload.vue`.

</details>

### 4. FTP notice in FTP subfolders

Show the notice under `gxftp://subdir/` as well as at the FTP root.

| Pros | Cons |
| --- | --- |
| Users who navigate into a subfolder still see how to add files | 26.1 and FilesDialog show it at the root only. This would be a behavior change, not a regression fix |
| | No report or reviewer asked for it |

Not recommended.

### 5. Shared "every listed label contains the query, stale-safe" helper

Merge `_remote_labels_match` with release_26.2's `_workflow_card_named` wait.

| Pros | Cons |
| --- | --- |
| Removes about 6 duplicated lines | Touches an unrelated workflow helper in `navigates_galaxy.py` |
| | The two match on different attributes and live in different modules, so a helper would need parameters for both |

Not recommended. Leave it as a dev follow-up.

### 6. Split `upload_activity_helpers.py` (now 1052 lines)

Move remote-files staging into its own module.

| Pros | Cons |
| --- | --- |
| The file is over 1k lines | It was over 1k lines before this branch |
| | Would conflict with `selenium_upload_data_library` and gxui, which both edit this file |

Not recommended here.

### 7. `history_panel_unhide_selected()` in place of `hide_selected(unhide=True)`

| Pros | Cons |
| --- | --- |
| No inverting flag | gxui's `history-hide` verb passes `unhide` straight through |
| | Mirrors #24380's `delete_selected(purge=)` |

Not recommended. It's a naming preference.

### 8. Remove leftover `sleep_for` calls in untouched tests

These are the other `test_history_panel` tests, `upload_activity_helpers.py:845`, and `test_upload_ftp._upload_all`.

| Pros | Cons |
| --- | --- |
| Less flake surface | Code the branch didn't otherwise change. It's a general E2E cleanup, not tied to these fixes |

Not recommended. Note: `test_upload_multiple`'s strengthening (checking every staged file was uploaded) is already done, in `519f7e8739d`.

### 9. Contract: drop the helpers that have no caller on this branch

`stage_remote_files(path=)` and `RemoteFilesContext.open_remote_folder` are used only by gxui, or only by the fix tests.

| Pros | Cons |
| --- | --- |
| Smaller diff | gxui (`verbs.py:990`) needs them, and John chose batch 7 whole |
| | The `path` threading follows the existing four-layer pattern, so dropping one layer leaves the API uneven |

Not recommended.
