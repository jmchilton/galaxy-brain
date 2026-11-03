# Deck review (stage 4, editorial)

I reviewed [slides.md](slides.md) cold and checked every linked image by eye. I edited the deck and made two crops. The deck now has 13 main slides, down from 14, and 8 extras, up from 7.

## What changed and why

### Structure

- **Filters moved to the extras, as E3.** The old slide 6 couldn't show its point: every demo run succeeded, so "State: successful" removes nothing. A main slide whose picture doesn't prove its claim costs more than it adds. The filters are now one sentence in the notes of slide 11, the page and export slide, where the claim that they travel with the link is true and needs no picture.
- **The editor slide moved up, to slide 6.** It is an entry point to mode 1, so it now closes the mode 1 group (slides 3–6) instead of sitting between mode 3 and batches. The arc is now:
  - the problem (slide 2);
  - mode 1 (slides 3–6);
  - mode 2 (slide 7);
  - mode 3 (slides 8–9);
  - batches (slide 10);
  - page and export (slide 11);
  - known gaps (slide 12);
  - status and the ask (slide 13).
- **The subworkflow slide became a text-only "Known gaps" slide (12).** The screenshot didn't prove the claim. Measured, "All runs" is dark grey (64,72,98) where its sibling tabs are blue (37,83,123), so it reads as an unselected tab rather than a disabled one, and the tooltip can't be captured. The slide now lists four gaps a scientist would care about: subworkflow steps, unlabelled steps and outputs, outputs compared by metadata rather than contents, and no tool-form panel. The screenshot moved to extra E7 (Known limits) as a tighter crop.
- **Extras renumbered:**
  - E3 is now the filters slide.
  - The API slide moved from E3 to **E4**.
  - Export is E5, matching E6, known limits E7 and open questions E8.

### Titles

All titles are now noun phrases with no hype:

- 2: "The question after many runs" became "Five runs that look the same".
- 6: "Comparison from the workflow editor" became "One step's runs, from the editor".
- 11: "A page to share and export" became "A page to bookmark and export". "Share" implied team views, but each user sees only their own runs, and the notes say so.
- 12: "Subworkflow steps, not yet" became "Known gaps".

### The flagged weak spots

- **Slide 4 ("This run" against "Run you are viewing").** This is a real product inconsistency. The ★ "this run" badge marks the *viewed* run (v3), but the "This run" column in the parameter diff means the *expanded row* (v1). The fix is in the text:
  - a second subtitle line maps the two headings to v1 and v3;
  - the Focus line asks for callouts on both headings;
  - the notes tell John to read the columns as v1 and v3.

  A product fix is suggested below.
- **Slide 8 (dataset crop without its header).** I re-cropped `slides/11_dataset_details_other_runs_action_crop.png` as two strips from the original:
  - the "19: Long exons" header, summary and tabs, with Details active;
  - a dashed grey band marking the cut;
  - the bottom of the job card, with "Other runs of this tool" beside "Rerun".

  It now plainly shows a dataset page, it is 772 px tall instead of 1408, and the API ids and UUID are still out. The notes and alt text disclose the cut.
- **Slide 6 (the state filter removed nothing).** The slide is now extra E3, captioned on the version filter. Its Focus line and notes say plainly that the state filter has nothing to remove because every demo run succeeded.
- **Slide 13 (subtle disabled tab).** Handled by the restructure above. The new `slides/14_subworkflow_all_runs_disabled_crop.png` keeps two strips, the nested run's header bar and the step card's tab row, so the tab is larger relative to the frame. It is still subtle; see the recapture and product notes below.

### Honesty and sources

- **Product fixes.** The brief says two screenshots depend on the uncommitted fixes. Per `polish_debrief.md`, it is more than that:
  - **Fix 2** changes what **slide 4** shows: without it, the changed parameter has no highlight.
  - **Fix 1** affects **eight shots**: slides 5, 7, 9, 10 and 11 and extras E1–E3. But it only lets `/comparisons` accept `hide_panels`, which is how those shots were taken without side panels. Without it the pages still work, with the panels showing.

  The deck header now states this, and each affected slide's `[Sources]` line says so.
- **Status (slide 13):** unchanged in substance. It is built and tested on a branch; it has not been submitted to Galaxy, merged or released, and fork CI isn't recorded.
- **Own runs only:** slide 11 says it explicitly. Its sources now also cite the code (`lib/galaxy/managers/comparisons.py` filters by the caller's user id). Nothing in the deck implies team-wide views.
- **Images:** every image link and full-size link resolves (19 files checked). Every label, value and badge named in the text, alt text and Focus lines is visible in its image.
- **Speaker notes:** trimmed to 2–4 sentences where they ran long (slides 2, 3, 5 and 13) and rewritten where they restated the slide. Slide 4's notes add the read-the-columns-as-v1-and-v3 line, and slide 12's give the practical advice to label the steps you care about.

## E3 (now E4) API verification

I checked the slide against `lib/galaxy/webapps/galaxy/api/comparisons.py` at `be7415d94dd`, which matches the worktree head. I also read `schema/comparisons.py`, `services/comparisons.py`, `managers/comparisons.py` and the client's `comparisonQuery.ts` and `router.js`.

- **Correct as written:**
  - the three routes: `GET /api/workflows/{workflow_id}/step_runs` with `step_label` required, `GET /api/workflows/{workflow_id}/output_runs`, and `GET /api/tool_runs` with `tool_id` required;
  - read-only GET;
  - newest first by default (`sort_by=create_time`, `sort_desc=true`);
  - restricted to the caller's runs (anonymous callers get an empty table);
  - the `/comparisons?kind=…` page takes the same keys as each endpoint;
  - no migration: the only model change adds `copied_from_job_id` to a dict-visible key list.
- **Added, because the slide omitted them:**
  - `versions`, which is **0-based** and repeat-only (the UI shows v1–v3);
  - `instance=true`, for a workflow version id;
  - `output_labels` for mode 2;
  - `tool_versions`, `history_id` and `include_workflow_jobs` (default true) for mode 3;
  - the shared `limit` (default 25), `offset`, `sort_by`, `sort_desc`, `states` and `metadata_elements`;
  - the `total_matches` response header.
- **Removed** the "parameter names weren't re-checked" caveat. The `[Sources]` line now cites the files.

Nothing on the slide was wrong. It was incomplete.

## Remaining weak slides and recapture recommendations

- **Slide 4 / shot 03.** It works with callouts. Recapture after the product rename suggested below, so the headings read "This row (v1)" and "Viewed run (v3 ★)" and the callouts can go.
- **Extra E3 / shot 08.** Add one failed run to the demo data, for example a v2 run on a malformed BED file, or a tool step forced to fail. Then capture "State: failed", which should leave a single red row, next to "State: successful". With that, the filter could return to the main deck.
- **Extra E7 and slide 12 / shot 14.** A native `title` tooltip can't be screenshotted. Two options:
  - after a product change (below), capture the tab's own empty-state message;
  - or capture the parent "Exon selection (nested)" run with the subworkflow step expanded, so the context reads "inside a subworkflow" without the header.
- **Slide 8.** The new composite is fine. If a single-frame image is wanted instead, recapture shot 11 scrolled so that the header and the link fit in a shorter viewport (about 1600×700 CSS px), with the parameters collapsed.
- **Extra E2 / shot 05.** The transposed column headings are relative times. Readable with the Version row, but see the product note below.

## Product suggestions that would strengthen the story

1. **Give `/comparisons` a viewed-run parameter**, such as `compare_to=<invocation_id>` or `baseline=<row id>`, or a "Set as baseline" action on any row.
   - Today the ★ badge and the changed-cell highlights exist only on the invocation's All runs tab.
   - The full page (E1), the Compare outputs page (slide 7) and the tool table (slide 9) show raw values with no highlighting.
   - Slide 7 is the strongest "read the history off the table" moment, and it would be much stronger with v3's drops highlighted against a chosen baseline.
2. **Rename the row-detail diff headings.** Use "This row" and "Viewed run", or better, the runs' versions and the ★ icon ("v1 · 14 min ago" against "★ v3"). The current "This run" collides with the "this run" badge.
3. **Make the disabled All runs tab explain itself without hover.** Let the tab open and show an empty-state message ("Steps inside a subworkflow can't be compared across runs yet"), or render the reason inline. A `title` tooltip is invisible on touch devices and to many screen-reader flows, and it can't be screenshotted. Use a clearly disabled style as well, not just grey text next to blue.
4. **Head transposed columns with the version as well as the time**, for example "v3 · 13 min ago". Runs of the same version are otherwise told apart only by relative times.
5. **Show the workflow version on the stock invocation list (slide 2).** A version column there is a cheap, independent win. It would also make the "Compare outputs" button the obvious next step rather than the only way to tell runs apart.
6. **Commit `product_fixes.patch` to the branch.** Both fixes are bugs in the branch's own code. Fix 1 also matters for real users, because Galaxy's window manager appends `hide_panels` to every URL it opens.
7. **Keep a failed run in the presentation fixture**, as above, so the state filter and the "failed" state can be shown honestly.
