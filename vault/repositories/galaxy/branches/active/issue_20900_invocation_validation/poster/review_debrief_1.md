# Poster review 1

Reviewer pass 1 for the `issue_20900_invocation_validation` poster at `bcbd2de187c` (STYLE_GALAXY). I checked it against the code at head, dev `7e16f446410`, the tests and the record. Nothing was run against Galaxy.

## Correctness: what was checked

- **Rail order.** Both rails match the real call order in `invoke_workflow` and `build_workflow_run_configs`, and every function name on the poster exists at the stated SHA.
  - Dev: `_check_workflow_tools` / `_check_on_complete`, then the per-entry `_get_target_history` commit before `input_param.validate` and the copy, then `queue_invoke` (which populates step state first), then `_create_landing_request_association`.
  - Branch: the landing claim check before `build_workflow_run_configs`, then target history, replacement/resource params, the per-entry loop, populate once per `param_map`, then the second loop's `History` + `commit()`, then `queue_invoke`.
  - The branch rail leaves out the moved batch-flag check (RR:544). That's a simplification, not an error, and it's already implementation recommendation 2.
- **Board.** All 12 tests exist at head under the names shown.
  - Each branch chip matches its test's assertions: status, "no history" only where the test uses `new_history_name`, "no invocation" only where asserted (restrictions asserts neither, and its chip says only "400").
  - The message substrings match the assertions and the code (`WORKFLOW_PARAMETER_VALUE_TYPE_CHECKS`, MOD:1197/1392/1402/3831).
  - The dev cells match `test_challenges_debrief.md` "Red/green evidence".
  - The † sample-sheet dev cell holds up as code reading: `derefence_collection_to_model` validates at `dereference.py`:202, after RR:436's commit.
- **Other regions.** The baseline commit has exactly the 5 tests / 7 cases cited. All 8 patches are MERGED on the stated dates. The 543 / 91 / 297 head counts match ID decision 2. The type table matches the `_is_*_value` helpers.

## Fixes made

1. **"A No-Go is a 400" → "a 4xx"**, in the thesis and the branch-rail stamp. Directly under it, the board shows 404 and 409 No-Gos, so "400" contradicted the poster's own evidence.
2. **Scrub callout.** "It fails later, at scheduling" became "the error surfaces later. #20900 links a Sentry error for this case (via planemo run)". The #20900 comment says a text parameter got an integer via planemo run. It doesn't say the failure happened at scheduling.
3. **Legend.** "queued = invocation created and scheduled" became "created and queued". A 200 shows the invocation was created and handed to the scheduler in state NEW, not that scheduling ran.
4. **Board messages added.** The URL-for-collection row (`input1: a dataset collection is required`) and the sample-sheet row (`Sample sheet metadata (…) can only be used…`) had no message, although their tests assert one. Both cells were already two lines tall on the request side, so the board's height barely changed.
5. **Cost chip.** "50 steps" became "a 50-step tool chain". The perf harness was a 50-step `cat1` chain plus 2 inputs, and the record says both "50-step" and "52-step".
6. **`SOURCES.md`.** Updated the rows for the fixes above, cited the source of each added message, corrected two line references, and added a "Review 1 verification" section.

No wrong function names, test names, statuses or PR facts were found.

## Render check

- Re-rendered `poster.png` at 4224 × 4224 with the implementer's `render.js`. Quadrant crops came from a scratch `crop.js` (playwright clip), plus a 1000 px downscale.
- No text overflows. The overflow checker flags only the side-effect zones' −0.06 in margins and the rotated gate diamond: decorative boxes, 6–21 px, that were there before this review.
- The smallest text is 24 pt. `main` now ends 0.1 in above the footer (was 0.3 in). The two added message lines made those board rows slightly taller.
- At 1000 px:
  - The title, region heads, the two rails' ignition positions (large blue zone on dev, small one on the branch) and the red/green column pattern all read.
  - The messages and test names don't, as expected.
- Do/don't list:
  - Gold appears only on the masthead bar, hero word, accent, featured bar and key rings, plus the footer's boundary heading on `gx-deep` (dark ground, allowed).
  - No gold text on light ground. Status chips carry their words. The highlighter sits on white pills.

## Clarity and persuasion

- **Ten-second read.** Yes: the title, then two rails where the ignition node and its blue side-effects zone sit near the left on dev and near the right on the branch. The hook carries the argument; it isn't decoration.
- **Show vs. tell.** Regions 1–2 show; region 3's two footnotes and region 5's cost chip tell. That's acceptable for a reviewer audience.
- **No big changes.** No new regions, layout or images, so **no pass 2 is needed** for this review's changes.

## Still weak

- The board stays dense, and at PR-image size only its color pattern reads.
- The two "unmeasured" cells and the † cell are honest, but they're the center of the evidence.
- The scrub callout still rests on a private Sentry event. The poster's best missing image is a real trace (plan recommendation 2).
- The dev debris slip shows one history. By the code, dev commits a history for entry 2 too, before checking it, so a failed batch may leave more than one. The record doesn't say how many (Review 1 recommendation 2).
- The main/footer gap is now 0.1 in. Any added line in regions 2–5 will collide with the footer.
