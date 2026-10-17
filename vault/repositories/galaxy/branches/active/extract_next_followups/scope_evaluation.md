# extract_next_followups — scope evaluation

**Recommendation: expand (modestly).** Keep everything as implemented and add four fixes on paths the branch touches: (E1) a 400 instead of an IndexError 500 when input names are shorter than their ids; (E2) one home for the "copies of one original are one input" rule, so a multi-file fetch card extracts instead of returning 400 (verify the shape first; there is a fallback); (E3) quoting or skipping unquotable labels in the `invocation_inputs()`/`invocation_outputs()` default-report expansion; and (E4) a complete `local_keys` for the notebook history boundary.

- **E1.** A length check, so a `dataset_names`/`dataset_collection_names` list shorter than its ids returns 400, not an IndexError 500. Covers both by-ids and legacy `/workflows/extract`.
- **E2.** Verify first. One summary input card per original, built with the existing `_boundary_producer_rows` pattern, plus a shared grouping helper that both service validation and `extract_steps_by_ids` use. Fallback if per-original rows don't fit cleanly: build only the helper and record the multi-file fetch card as a known limitation. This item changes how the plain-history form lays out cards.
- **E3.** H3 and M1 now route extracted workflows into the `invocation_inputs()`/`invocation_outputs()` expansion, so it needs to quote or skip unquotable labels.
- **E4.** Build `HistoryBoundary.local_keys` from all history contents, including hidden collection elements.

Separately, John should decide the base. #22860 is in `release_26.2` (rc1, 2026-10-14), and the base `dev` was chosen before that branch existed. These fixes, and the endpoint name and `report_title` decisions, arguably belong to the 26.2 release. Retargeting is John's call and does not block the expansion (see "Retarget").

Branch size: 54 commits, 34 files, about 1,350 changed lines of production code, about 1,960 of test/E2E code, and 6 of generated `schema.ts`.

## Possible Decompositions

These options are not recommendations. SHAs are current (head `d4d504fb3c1`).

Dependency edges that every option has to respect:
- **Prep comes first.** `74d1d014267`..`3d0a94fe38e` (2 baselines, 4 refactors) is already split out at the start of the branch and behavior-neutral. The only visible delta is the text of one 400 message.
- **ContentRef.** `f46e1b22043` (ContentRef vocabulary) comes before `32832c19bd3` (IdKey→ContentRef). Later seeding and report commits use its names.
- **Seeding.**
  - `3ee8b909ea5` and `e7632c80c83` come before `aad705094f0`, `15b99f67f48`, `0a8bcb6d1f7` and `d4d504fb3c1`.
  - The Codex fixes (`d911fa2ac2c`, `120845ed4d5`, `0a8bcb6d1f7`) each sit on their own feature commit.
- **Labels before the report sweep.** `7a020aed471` and `aa13aab937a` (label index warnings) come before `46e074806bc`, `4c8415bd359` and `9c89b613861`.
- **The M7 chain** runs in order: `b49cb6450a6`, `4ba5bddc8a2`, `1b57f3d2ce6`, `5bc374636d4`, `1c51a09feb7`. `c4d86acfa02` reshapes `reconcile_report_labels`, so it comes after `b49cb6450a6`.
- **The E2E round trip** (`9fd7117b474`) needs the seeding work, the report sweep and `6fe154dcf8f` (toast).
- **The shared test helpers** (`e42576bd387`) touch tests from every group. They land last, or get split per group.
- **GCard** (`3e42cac57c9`) stands alone. On `release_26.2` it conflicts, because GCard, navigation.yml, `navigates_galaxy.py` and populators all differ between 26.2 and dev. The extraction modules themselves are identical on 26.2 and dev.

### Option 1 — prep + rest (2 PRs)

1. **Prep:** baselines + PageManager access check + public copy helpers + `walk_directives` + `run_cat1` (~270 changed lines, no behavior).
2. **Everything else.**

Cheapest: the boundary commit `3d0a94fe38e` already exists and was tested at that point. PR 2 is still large.

### Option 2 — by concern (6 PRs)

1. **Prep** (as in Option 1).
2. **Labels + default report:**
   - H3: `7a020aed471`, `aa13aab937a`, `df834fe609e`, `6545eb88d2d`.
   - M1: `9713a561f34`.
   - Dead selectors: `ff4e13ec5b6`, `04d279774c4`, `084a50dcd72`.
3. **Content refs + seeding:**
   - Content refs: `f46e1b22043`, `80868fe3e6b`, `32832c19bd3`.
   - Seeding (H1/M2): `3ee8b909ea5`, `aad705094f0`, `e7632c80c83`, `15b99f67f48`, `0a8bcb6d1f7`, `d4d504fb3c1`.
   - Copies: `586aed86e42`, `d911fa2ac2c`.
   - Tool access: `7fd69bac8a3`.
4. **Report sweep (H2/M4):** `46e074806bc`, `5de77780dd8`, `4c8415bd359`, `9c89b613861`, `120845ed4d5`, `a847302530b`.
5. **Report-output lock (M7) + report notes:**
   - `b49cb6450a6`..`1c51a09feb7`.
   - `c4d86acfa02`, `6fe154dcf8f`, `9fd7117b474`.
6. **Client/E2E polish:**
   - 6a, independent of PRs 2–5: `3e42cac57c9`, `ee79e7c87c8`, `db33e0c8801`, `ff0492f1cbe`, `78a5426664f`, `03f985cc473`, `344a89bfda4`, `581e21473fe`.
   - 6b, after PR 5: `d121abc1ff0`, `ada891818a0`, `14e515e558b`. These trim card tests that the M7 commits edit, harden helpers that the round trip uses, and edit the `9fd7117b474` E2E.

Order: 1 → 2 → 3 → 4 → 5 → 6b. 6a can land at any point. 6a and 6b can also merge into one PR that lands last.

Docstring trims (`21e0f1f2230`) and the test-helper commits (`e42576bd387`, `db0e944665b`) would be split across PRs 3 to 5.

### Option 3 — by target branch (2 PRs)

1. **`release_26.2`: the 26.2 fixes.** The prep refactors plus all server behavior:
   - H3, M1, H1/M2, H2/M4.
   - Copies, tool access, the M7 server warning.
   - The minimal client counterparts: `d911fa2ac2c`, the `fromPageId` guard, the repeat-click guard.
   - The report notes toast fix: `6fe154dcf8f`.
2. **`dev`: the rest.**
   - The rest of the M7 lock UI.
   - The E2E round trip (`9fd7117b474`). It could go to 26.2 instead, but the selenium helpers there differ from dev.
   - GCard style.
   - E2E sleeps → waits, navigation targets.
   - Card test moves, test-helper sharing.

The fixes were written on the ContentRef/HistoryBoundary refactors, so those refactors go to 26.2 as well. Splitting them out would mean re-deriving each fix on pre-refactor code. The 26.2 PR stays server-heavy, about 70% of the branch.

### Option 4 — server vs client (2 PRs)

1. **Server + API/unit tests + `schema.ts`.**
2. **Client + Selenium:** GCard, form and card, route prop, the M7 star lock UI, E2E round trip and waits.

There are two cross-edges:
- `d911fa2ac2c` spans both halves: the client one-name-per-card count and the server `_distinct_input_names` are each needed for the fix.
- The M7 UI needs the server's `referenced_by_report` field.

So PR 2 lands after PR 1, or `d911fa2ac2c` moves wholly into PR 1 with its vitest.

## Scopes considered

### As implemented

The branch addresses 22860 review items H1–H3, M1, M2, M4–M7, the Codex F1–F3 fixes, the plain-history copies collapse (dev bug) and the 500 for inaccessible user tools. It also adds client polish and E2E hardening. Already decided by John: H3, the M7 lock (C+B), and dropping embeds and visualizations instead of rewriting them.

| Pros | Cons |
|---|---|
| - Reviewed three times (normal, Codex, thermo-nuclear) and test-challenged<br>- Prep commits already separated<br>- Red-to-green throughout | - Leaves the IndexError 500 in the same `extract_steps_by_ids` loop the branch rewrote<br>- The copies rule lives in 3 places, with a "magic tail" in `_distinct_input_names`<br>- Multi-file fetch card: Create was disabled on dev with a reason; now it is enabled and the server returns 400 (a UX change the branch caused)<br>- H3 + M1 make an upstream default-report bug reachable from extraction |

### Expand (recommended): E1–E4

The four fixes on touched paths are listed in the top line. E5, below, is a decision rather than code.

| Pros | Cons |
|---|---|
| - Every item is in a file the branch already changes<br>- E1 and E2 together delete `_distinct_input_names`'s tail and give the copies rule one home (thermo #3)<br>- E2's per-original rows reuse the existing `_boundary_producer_rows` pattern<br>- E3 stops extracted workflows with quoted or spaced input labels from producing a broken default report<br>- E4 fixes an edge case in branch-introduced logic | - Adds perhaps 250–400 lines (with tests) to an already large branch<br>- E2's per-original cards change dev's plain-history form layout for multi-file uploads (one card per file, not per fetch job), so selectors and E2E counts may move<br>- E3 is also a pre-existing bug on 26.1 (unquoted collection label), so the fix overlaps a backport |

<details>

**E1 — name/id length mismatch.**
- Where:
  - `extract.py:905/920` (`extract_steps_by_ids`).
  - `:285-286/:301-302` (legacy `extract_steps`).
  - Both do `dataset_names[i]` with no guard.
- Same IndexError in two places:
  - The legacy path validates only label content (`services/workflows.py:389`).
  - The by-ids path pads through `_distinct_input_names`, whose `names[len(content_ids):]` tail exists only to pass an over-long list on to validation.
- Fix: one payload check that names, when given, match the ids in length, giving 400 on both paths. It is a pre-existing dev bug (by-ids exists on 26.1 too), on a path the branch rewrote. Red: post `hda_ids=[a, b]`, `dataset_names=["x"]`.

**E2 — copies → one input.**
- The client counts one name per card.
- The service predicts the collapse before extraction runs.
- `extract_steps_by_ids` skips repeat originals.
- Candidate shape (verify before committing to it):
  - The summary emits one input row per *original* output, with its in-history copies grouped under it. `_boundary_producer_rows` already does this for cross-history producers.
  - The client's one-name-per-card rule is then correct by construction.
  - The server gets one `group_inputs_by_original(trans, kind, ids, names)` helper that both validation and `extract_steps_by_ids` consume.
- This resolves thermo #3 and Codex F1 together.
- Likely reach, to verify: legacy HID `extract_steps` keys inputs by hid, so the same copies collapse may hit it too. Include it if the helper fits; otherwise note it.

**E3 — `invocation_inputs()`/`invocation_outputs()` expansion** (`markdown_util.py` ~1305–1340).
- Dataset labels are wrapped in `"…"` without escaping, and collection input labels are emitted unquoted (`input={label}`).
- `reports/generators/markdown.py` puts `invocation_inputs()` in every default report.
- H3 accepts `"` and line breaks in input names again, and M1 keeps the default report for empty notebooks. Input names default to raw dataset names, which often contain spaces.
- So an extracted workflow can easily get an invalid default report. This is inferred and has not been run. Red: an API test that extracts with a collection input named `my reads`, invokes it and fetches the invocation report.
- Fix: reuse the branch's `UNQUOTABLE_ARGUMENT_PATTERN`. Quote collection labels, and skip a section whose label can't be quoted.
- It exists on 26.1 for collection labels with spaces. A standalone backport PR is the alternative.

**E4 — `local_keys`.**
- `summary_from_page` builds it from `summarize()` output, which misses hidden and non-ready collection-element HDAs.
- So a copied-history job that consumed one element counts as produced elsewhere, and its outputs become inputs, not steps. It is a degraded workflow, not an error.
- Fix: build it from the history's contents including hidden elements.

**E5 — API surface (decision, not code).** Both ship in 26.2, and renaming or dropping either after 26.2.0 is an API break, so now is the time to decide:
- Endpoint naming: `/api/histories/{id}/extraction_summary` vs `/api/pages/{id}/workflow_extraction_summary`.
- The unused `report_title` payload field.

The name is John's call.

</details>

### Retarget to `release_26.2`

Rebase the branch, or the server part (Decomposition Option 3), onto `release_26.2`.

The rule is to target the oldest supported branch that has the bug. #22860 (merge `67a54e12ede`) is in `release_26.2` and not in `release_26.1`, so every notebook-extraction bug here ships in 26.2.0 unless it is fixed there. That includes:
- H3: any history with `"` in a dataset name returns 400, on the legacy HID path too.
- Dangling seeded inputs.
- Instance ids leaking into reports.

| Pros | Cons |
|---|---|
| - Fixes land before 26.2.0 final instead of in 26.2.1+<br>- Extraction modules are identical between 26.2 and dev, so the server side should rebase cleanly<br>- E5 decisions land in the release they affect | - GCard, navigation.yml, `navigates_galaxy.py` and populators differ between 26.2 and dev, so the client/E2E commits would conflict (GCard needed a rebase fix even on dev)<br>- A large PR into an rc branch; Galaxy is liberal about this, but reviewers may ask for a split (Option 3)<br>- The base was recorded as `dev`; changing it is John's call |

### Expand further (not recommended for this branch)

These are other candidates. Each is better done separately or later.

| Item | Why not here |
|---|---|
| Label embeds in invocation reports render the wrong object (`populate_invocation_markdown` numeric `invocation_id` + `_remap_embed_container`) | Affects hand-written reports on 26.1 (`populate_invocation_markdown` exists there). Separate PR against the oldest affected release. Once this and the next item are fixed, a follow-up can rewrite embeds and visualizations to labels instead of dropping them. |
| Visualization label cells keep the decoded `invocation_id` (`ready_galaxy_markdown_for_export`) | Inferred, unverified; same reasoning and dependency as above. |
| User-tool deactivation: owner path ignores `active`; admin path KeyError 500 | Tools manager, not touched here. Separate small PR. |
| `ChatManager.get_accessible_page` vs `PageManager.get_accessible_notebook` | Not a true duplicate: chat checks the page only, not the history. The page half could become `PageManager.get_accessible`, with chat and the notebook check sharing it. The feature text in the notebook helper's error moves with it (thermo #5). Small cleanup PR; `chat.py` is untouched here. |
| Move content-ref helpers out of the 1,133-line `workflow/extract.py` (thermo #4) | Pure layering move across five files. Fits as a prep refactor (Decompositions) or its own PR, not a scope change. |
| HTML notebooks: `reconcile_and_build_report` ignores `content_format` | Would need a decision (skip the report with a warning, or 400). The `d5f6696cc6a` baseline rollback test uses the HTML failure path, so it would need re-pointing to another malformed input. |
| Directive-safe default input names | Changes the plain-history form's long-standing default (raw dataset name). The current fallback (directive dropped with a warning) is acceptable. |

### Out / deferred (one line each)

- **M3** (element of a mapped collection in a report): needs John's design choice between an element identifier and an explicit warning. Already parked.
- **GToast `\n`:** a galaxy-ui package change (`white-space: pre-line` on `.g-toast-body`), in a different package/repo.
- **BBadge/BLink/BFormCheckbox in GCard:** there is no GBadge, and swapping in GLink/GCheckbox restyles 164 cards. Separate dev PRs.
- **Imported histories from another user, zero-input cross-history boundaries, `creating[:1]`:** match history extraction or are covered by tests. Already decided.
- **Remove `test_extract_button_visible_in_notebook_editor`:** redundant, but on dev. Waiting on John's sign-off; not a scope item.

### Contract

Ship only the server correctness fixes (H1–H3, M1, M2, M4, Codex, copies, tool access). Drop or defer the M7 UI lock, client polish and E2E hardening.

| Pros | Cons |
|---|---|
| - Smaller review (~half the lines)<br>- Pairs naturally with a 26.2 retarget | - M7 was John's explicit choice (C+B) and is tested end to end<br>- The E2E round trip is the only browser coverage of the seeding and report fixes<br>- Deferred polish needs its own rebase and re-validation; the GCard conflict already cost a cycle<br>- Decompositions achieve the same review size without dropping work |
