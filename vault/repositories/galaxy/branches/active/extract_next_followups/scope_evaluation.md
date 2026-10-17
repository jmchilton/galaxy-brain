# extract_next_followups — scope evaluation (second pass)

**Recommendation: expand (modestly), again.** Keep everything as implemented (E1–E4 + Codex F1). Add two small fixes in code the branch already touches: (E6) make the expanded `invocation_inputs()`/`invocation_outputs()` sections emit the invocation's object ids, so PDF export renders them, not raw directives; (E7) give legacy HID `extract_steps` the same "copies of one original are one input" rule, so bioblend's `extract_workflow_from_history` stops leaving a tool input unconnected. (E8) is optional: build a synthesized boundary row from the in-history copy. Do it only if a red test reproduces it cheaply. Separately, three decisions are John's and are not scope changes: Codex F2 (zero-input producers; I suggest keeping them as boundaries), E5 (API names) and retargeting to `release_26.2`. The E5 window closes at 26.2.0, and 26.2 is still rc1.

Each item can be approved on its own:

| Item | Files | Size (est.) | Red test |
|---|---|---|---|
| **E6** ids in expanded invocation sections | `markdown_util.py` (`_invocation_section`, `resolve_invocation_markdown`) | ~15 prod + test edits | `to_basic_markdown` of `invocation_inputs(invocation_id=N)` contains the dataset's rendering, not a ```` ```galaxy ```` fence with `input=` |
| **E7** legacy HID copies → one input | `workflow/extract.py` (`extract_steps`) | ~20–30 prod + 1–2 API tests | Upload hid 1, in-history copy hid 2, cat1 on hid 1. Extract once with `dataset_hids=[1]` and once with `[2]` (plus `job_ids=[cat1]`). cat1 `input1` should be connected both times. Wiring follows whichever copy `summarize` sees last, so only one run is expected to be red today (inferred) |
| **E8** (optional) synthesized boundary row uses the local copy | `workflow_extraction_summary.py` (`HistoryBoundary`, `_synthesize_boundary_inputs`) | ~15 prod + 1 API test | A local seeded step consumes a hidden element of a collection copied from another user's history. The source is unshared. The synthesized row id is the local element and extraction succeeds. Drop E8 if this fixture is not cheap. |

Branch size at `9330c4c8feb`: 63 commits, 35 files, +2585/−1153. About 1,540 changed lines of production code, about 2,190 of test/E2E code (`navigation.yml` and `navigates_galaxy.py` included) and 6 of generated `schema.ts`. Since the re-scope (`d4d504fb3c1..9330c4c8feb`): 10 files, +418/−157.

## Possible Decompositions

These are options, not recommendations.
- SHAs are the current, pre-rebase ones (head `9330c4c8feb`, base `5ff1e46b8c3`).
- `origin/dev` has moved 39 commits since the base, touching `navigation.yml` and `navigates_galaxy.py`. `git merge-tree` of the whole branch onto the current `origin/dev` (`3f82248b5a4`) is still clean.

### Order constraints (all options)

- **Prep first.** `74d1d014267`..`3d0a94fe38e` holds 2 baselines and 4 behavior-neutral refactors.
- **ContentRef.** `f46e1b22043` comes before `32832c19bd3`. Later seeding and report commits use its names.
- **Seeding.**
  - `3ee8b909ea5` and `e7632c80c83` come before `aad705094f0`, `15b99f67f48`, `0a8bcb6d1f7` and `d4d504fb3c1` (HistoryBoundary).
  - Each Codex first-pass fix (`d911fa2ac2c`, `120845ed4d5`, `0a8bcb6d1f7`) sits on its own feature commit.
- **Labels before the report sweep.** `7a020aed471` and `aa13aab937a` come before `46e074806bc`, `4c8415bd359` and `9c89b613861`.
- **M7 chain, in order:** `b49cb6450a6` → `4ba5bddc8a2` → `1b57f3d2ce6` → `5bc374636d4` → `1c51a09feb7`. `c4d86acfa02` comes after `b49cb6450a6`.
- **E2E round trip** `9fd7117b474` needs the seeding work, the report sweep and `6fe154dcf8f`. It is later edited by `14e515e558b`.
- **Re-scope edges (new):**
  - **E1** `471aa003bac` comes after `d911fa2ac2c`, because it deletes the `names[len(content_ids):]` tail that `d911fa2ac2c` added. Its legacy-HID half depends on nothing on the branch.
  - **E3** `087d2dffc23` is **standalone**. It uses dev's `is_quotable_argument_value`, and `merge-tree` cherry-picks it cleanly onto `release_26.2`.
  - **E4** `05ab09a4b2c` and `7a566a5d723` come after `d4d504fb3c1` and the seeding commits.
  - **E2** `df78226dea9` and `737377a6efa` come after E1, `586aed86e42`, `d911fa2ac2c`, `15b99f67f48`, `0a8bcb6d1f7`, `32832c19bd3` and `d4d504fb3c1`.
  - **`dce789aa030`** (test tightening + `copy_library_dataset` populator) comes after E1 and E2.
  - **Codex F1** `96ed111849a` and the tidy `9330c4c8feb` come after E2.
- **Shared test helpers** `e42576bd387` touch tests from every group. They land last or get split per group.
- **GCard** `3e42cac57c9` stands alone.

### Option 1 — original scope + re-scope (2 PRs)

1. **`extract_next_followups_alt_original_scope`** (`d4d504fb3c1`, already pushed): everything through the first hardening.
2. **Re-scope:** `471aa003bac`..`9330c4c8feb`, that is E1–E4 + F1 + tightening (10 files, +418/−157), plus E6–E8 if done.

This is the cheapest option, because both branches already exist and have been tested. PR 2 is reviewable on its own. PR 1 is still large.

### Option 2 — prep + rest (2 PRs)

1. **Prep:** `74d1d014267`..`3d0a94fe38e` (~270 lines, no behavior).
2. **Everything else.**

### Option 3 — by concern (7 PRs)

1. **Prep** (as in Option 2).
2. **Labels + default report:**
   - H3: `7a020aed471`, `aa13aab937a`, `df834fe609e`, `6545eb88d2d`.
   - M1: `9713a561f34`.
   - Dead selectors: `ff4e13ec5b6`, `04d279774c4`, `084a50dcd72`.
3. **Content refs + seeding + copies:**
   - Content refs: `f46e1b22043`, `80868fe3e6b`, `32832c19bd3`.
   - Seeding: `3ee8b909ea5`, `aad705094f0`, `e7632c80c83`, `15b99f67f48`, `0a8bcb6d1f7`, `d4d504fb3c1`.
   - E4: `05ab09a4b2c`, `7a566a5d723`.
   - Copies: `586aed86e42`, `d911fa2ac2c`.
   - E1: `471aa003bac`.
   - E2: `df78226dea9`, `737377a6efa`, `dce789aa030`.
   - F1 and tidy: `96ed111849a`, `9330c4c8feb`.
   - Tool access: `7fd69bac8a3`.
   - E7, if done.
4. **Report sweep (H2/M4):** `46e074806bc`, `5de77780dd8`, `4c8415bd359`, `9c89b613861`, `120845ed4d5`, `a847302530b`.
5. **Report-output lock (M7) + report notes:** `b49cb6450a6`..`1c51a09feb7`, `c4d86acfa02`, `6fe154dcf8f`, `9fd7117b474`.
6. **Invocation-section export:** E3 `087d2dffc23`, plus E6 if done. This PR is independent and can target `release_26.2` on its own.
7. **Client/E2E polish:**
   - 7a, independent: `3e42cac57c9`, `ee79e7c87c8`, `db33e0c8801`, `ff0492f1cbe`, `78a5426664f`, `03f985cc473`, `344a89bfda4`, `581e21473fe`.
   - 7b, after PR 5: `d121abc1ff0`, `ada891818a0`, `14e515e558b`.

Order: 1 → 2 → 3 → 4 → 5 → 7b. PRs 6 and 7a can land at any time. Docstring trims (`21e0f1f2230`) and test-helper commits (`e42576bd387`, `db0e944665b`) are split across PRs 3–5.

### Option 4 — by target branch (2–3 PRs)

1. **`release_26.2`: server fixes + minimal client counterparts.** This is everything except the GCard style, the M7 lock UI, card-test moves and E2E polish. Evidence from `git merge-tree --merge-base 5ff1e46b8c3 origin/release_26.2 HEAD`:
   - The whole branch, **squashed**, conflicts only in `GCard.test.ts` and `navigation.yml`. A commit-by-commit rebase may conflict elsewhere. Tests were not run on 26.2.
   - The server modules, `populators.py`, `services/workflows.py` and `navigates_galaxy.py` auto-merge.
   - The extraction modules are identical between 26.2 and the dev base.
2. **`dev`: the rest** (GCard, M7 lock UI, E2E round trip, waits, test-helper sharing).
3. Optional: E3 (+E6) as its own 26.2 PR (Option 3 PR 6).

The ContentRef/HistoryBoundary refactors go to 26.2 too, because the fixes are written on them. The 26.2 PR is about 70% of the branch.

### Option 5 — server vs client (2 PRs)

1. **Server + API/unit tests + `schema.ts`.**
2. **Client + Selenium.**

Cross-edges:
- `d911fa2ac2c` spans both halves.
- The M7 UI needs `referenced_by_report`.

So PR 2 lands after PR 1, or `d911fa2ac2c` moves whole into PR 1 together with its vitest. E2 and F1 changed no client logic, so they add no new cross-edge.

## Scopes considered

### As implemented

This is the original scope (H1–H3, M1, M2, M4–M7, first-pass Codex F1–F3, copies collapse, user-tool 500) plus the re-scope: E1 (400 for names not parallel to ids), E2 (one card and one grouping rule per original), E3 (quote or skip labels in expanded sections), E4 (`HistoryBoundary.of` over `all_contents`) and second-pass Codex F1 (copied-collection cards list local ids).

| Pros | Cons |
|---|---|
| - Reviewed again after the re-scope (phase reviews, test challenge, Codex, thermo-nuclear); no bugs open<br>- Copies rule now has one home (thermo #3 resolved)<br>- Red-to-green throughout; baselines still first<br>- An existing alt branch makes Option 1 free | - E3 makes the PDF sections *valid* but still not *rendered*: expanded lines carry no ids, so they print as raw directives (pre-existing, but in E3's own helper)<br>- The legacy HID path is now the only extraction path that doesn't treat copies as one input, and bioblend reaches it<br>- One untested F1 corner (synthesized boundary rows) |

### Expand (recommended): E6 + E7, with E8 optional

Keep the branch as is and add three small fixes:
- E6: give the expanded invocation sections real object ids.
- E7: bring the legacy HID path under the copies rule.
- E8 (optional): build synthesized boundary rows from local copies.

| Pros | Cons |
|---|---|
| - All three sit in functions the branch wrote or already edits<br>- E6 completes E3: PDF export of every default report shows the input/output datasets. Labels then appear only in headings, so the quote-or-skip only guards the heading<br>- E7 closes the last path with the old copies behavior; reachable from bioblend, not just the dead UI path<br>- E8 completes Codex F1 using data `HistoryBoundary.of` already walks | - About 60–80 more production lines + tests on a large branch<br>- Under workhorse rules a second scope change parks the branch for John (BLOCKED), even though each item is small<br>- E6 changes the expectations of the branch-added E3 unit tests (the section for `my "reads"` is kept with an id rather than dropped). Their assertions change; none are weakened<br>- E7 is only inferred (reviewer said "likely"); it needs a red test before code<br>- With E6, the basic walk access-checks each section's dataset. A viewer who can open the invocation but not one of its datasets gets an error block where they used to get a raw directive. Custom reports with label directives already behave this way; say so in the PR description |

<details>

**E6: emit ids in expanded sections.**
- Where: `markdown_util.py`. `_invocation_section` is the branch's helper; `resolve_invocation_markdown`'s `_remap` calls it.
- Today it emits `history_dataset_display(input="label")` with no invocation id. The expansion output isn't rescanned, and `to_basic_markdown` is the only caller, so every expanded section prints as a raw directive in PDF. The phase A debrief and review both saw this. They parked it as "needs a rescan or an id in each emitted line, out of scope".
- The fix is the "id in each line" half:
  - Both input association types already carry `.dataset` / `.dataset_collection`, and so do both output association types (`model/__init__.py` ~11065–11200).
  - Emit `history_dataset_display(history_dataset_id=N)` or `history_dataset_collection_display(history_dataset_collection_id=N)`.
  - `ToBasicMarkdownDirectiveHandler` resolves both of those unencoded ids through the normal `walk_directives` access check (`markdown_util.py` ~293 for datasets, ~349 for collections).
- Label handling: the label only goes into the `####` heading. Collapse line breaks to a space. A label with a quote no longer needs the section dropped. Skip a section only if its association has no content. An unlabeled input could still be skipped, to match today's behavior.
- Reach: PDF/basic export of any invocation report using these containers, and every default report does. That's a pre-existing dev bug, and it is also on 26.1 in the old inline form. Fixing it in the helper the branch just wrote is the cheap moment.

**E7: legacy HID `extract_steps` copies.**
- Where: `workflow/extract.py` `extract_steps`, around lines 257–358.
- Tool inputs resolve through `summary.hid(original)`, which is `hda_hid_in_history[original.id]`. That value is overwritten by each copy, so the last-summarized copy's hid wins. Input steps are keyed by the hid the caller sent, so a different copy's hid leaves the tool input unconnected, silently.
- Reach:
  - `POST /api/workflows` with `from_history_id` + `dataset_hids`, which is what bioblend `extract_workflow_from_history` sends.
  - `/api/histories/{id}/extract_workflow` (`WorkflowsService.extract_from_history`).
  - The re-scope notes said "the client doesn't use it". True for the Vue form, but not for API clients.
- Fix sketch:
  - Map each selected hid to its content, key the input step by `summary.hid(original)`, and make copies of one original one input.
  - Two copies with different names get a 400, the same as E2's rule. This reuses `original_content_ref` and E2's error-field naming (`_INPUT_FIELDS`).
  - Don't force it through `group_inputs_by_original`, which takes ids and access-checks by id. The shared part is the "group by original, one name" rule.
- Risk: this changes how wiring is chosen on a long-standing path. Red-first is essential: send each copy's hid in turn, because only the copy that `summarize` does not see last fails today.

**E8: synthesized boundary rows (Codex F1 remaining half).**
- `_synthesize_boundary_inputs` calls `resolve_content(trans, ref)`, which returns the original, possibly in a source history.
- It matters only when a *local* seeded step consumes content with no summary row. In practice that is a hidden element of a copied collection, and the element is copied with the collection, so a local copy exists.
- If a foreign seeded step consumes it instead, extraction needs `get_accessible_job` on the foreign job anyway, so revocation fails there regardless.
- Fix sketch: let `HistoryBoundary` keep `ref -> local contents` (it already walks `all_contents` and computes `original_content_ref`), and have the synthesizer prefer a local item. This could also replace `_collections_by_original`'s separate walk on the page path (thermo noted three walks).
- Narrow reach. Include it only if the red fixture (another user publishes, we copy, they unshare; like `test_copies_from_a_history_no_longer_shared_extract_by_local_ids`) extends cheaply.

</details>

### Decisions for John (not scope changes)

**Codex F2: zero-input cross-history producers stay boundaries. Suggest: keep (no code change).**

| Change (make them steps) | Keep (as implemented) |
|---|---|
| - A whole copied/imported history keeps generator tools (`create_2`, random data) as steps, consistent with "copied history keeps its producers"<br>- A narrower heuristic is possible: make one a step only when the closure already kept another step from the same source history | - With no history-level "copied from" signal (`History` has none), a single copied dataset made by a zero-input tool would pull a foreign job in as a step, which is the case the boundary exists for<br>- The heuristic depends on closure walk order and adds a special case to a rule that is clean today<br>- The current result is a working workflow with one extra input, not an error<br>- Pinned by `test_cross_history_producer_is_boundary` |

**E5: API names. Decide before 26.2.0 (26.2 is rc1).**
- `/api/histories/{id}/extraction_summary` already shipped in **26.1**, so it can't be renamed.
- `/api/pages/{id}/workflow_extraction_summary` and the payload's `report_title` are **new in 26.2**.
- If the names should match, the only option is renaming the pages route to `/api/pages/{id}/extraction_summary`.
- `report_title` is read by the server (`payload.report_title or payload.workflow_name`) but the client never sends it. Keep it for API clients, or drop it before it ships.

**Retarget to `release_26.2`.**

Rebase the branch, or its server part (Option 4), onto `release_26.2`, the oldest release that has #22860.

| Pros | Cons |
|---|---|
| - #22860 (`67a54e12ede`) is in 26.2 and not 26.1, so every notebook-extraction bug here ships in 26.2.0 unless it is fixed there<br>- Measured textually: the whole branch, squashed onto `origin/release_26.2`, conflicts only in `GCard.test.ts` and `navigation.yml`, and the server code auto-merges. A commit-by-commit rebase may hit more conflicts. A clean merge says nothing about tests passing on 26.2<br>- E3 cherry-picks cleanly on its own<br>- Lets E5 land in the release it affects | - Client/E2E polish (GCard, waits, M7 lock UI) belongs on dev; a split (Option 4) means two PRs and two rebases<br>- A large PR into an rc branch; Galaxy is liberal, but reviewers may want the split<br>- The recorded base is `dev`; changing it is John's call |

### Expand further (not recommended for this branch)

| Item | Why not here |
|---|---|
| Codex F1 tool-row half: a copied collection that is a *step's* output serializes as the source id | It only feeds output-label hints. Extracting that step needs `get_accessible_job` on the source job, so revocation fails there anyway. Fixing it needs a `summarize` redesign. |
| `group_inputs_by_original` runs twice per by-ids request | Performance, not scope. Threading groups through moves the per-id access check out of `extract_steps_by_ids` (a change in who owns security). It matches dev's validate-then-extract pattern. |
| Rewrite inline embeds to labels instead of dropping them | **Partly unblocked upstream:** `cfae9a44940` (mvdbeek, 2026-10-08, in dev + 26.2) fixed "label embeds render the wrong object". But the client's `resolveInlineDirectives.ts` resolves only `history_dataset_as_image` inline labels, so name/type/peek embeds would render as raw text. That makes it a one-directive feature plus E2E, so do it separately. Either way, the "do not render yet" docstring in `_drop_instance_references` and the inline-drop warning are now stale for image embeds. A one-line wording fix could go with E6. |
| Rewrite visualization cells to labels | Still blocked. `process_invocation_ids` re-encodes `invocation_id` only in `export_markdown`; the report's `markdown` field (`export_markdown_embed_expanded`) keeps the decoded id (`reports/generators/__init__.py`). This is inferred from code. |
| User-tool deactivation (owner path ignores `active`, admin path KeyError) | Unchanged on `origin/dev`; tools manager not touched here. Separate PR. |
| `ChatManager.get_accessible_page` vs `PageManager.get_accessible_notebook` | Still on dev, and not a true duplicate (chat checks the page only). Small cleanup PR. |
| Move content-ref helpers out of `workflow/extract.py` | The thermo second pass found no layering or size win. |
| HTML notebooks (`content_format` ignored) | Needs a decision, and the rollback baseline relies on this failure path. |
| Directive-safe default input names | Changes the plain-history form's long-standing default. The current fallback (drop with a warning) is acceptable. |
| GToast `\n`, a top-level `toast` nav component, dev's `sleep_for` in `test_workflow_extraction.py`, `setup_copied_cat1_history` raw post | Other package or untouched dev tests. Follow-ups. |

### Out / deferred (one line each)

- **M3** (element of a mapped collection in a report): waiting on John's design choice.
- **BBadge/BLink/BFormCheckbox in GCard:** no GBadge exists; separate dev PRs.
- **Imported-from-another-user histories, `creating[:1]`:** already decided.
- **Remove `test_extract_button_visible_in_notebook_editor`:** redundant, waiting on John's sign-off.

### Contract

Ship only the server correctness fixes. Defer the M7 lock UI, client polish and E2E hardening.

| Pros | Cons |
|---|---|
| - About half the lines<br>- Pairs with a 26.2 retarget | - M7 was John's explicit choice (C+B), tested end to end<br>- The E2E round trip is the only browser coverage of seeding and the report<br>- Decomposition Options 1/4 get the same review size without dropping work |
