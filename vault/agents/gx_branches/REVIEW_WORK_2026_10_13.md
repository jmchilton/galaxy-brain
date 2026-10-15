# Review work — 2026-10-13

Checked mvdbeek’s comments, review bodies and inline threads on **163 jmchilton Galaxy PRs**: all 16 currently open PRs plus PRs updated since 2026-09-13. No API errors or truncated discussion pages. Unresolved GitHub thread flags are not treated as proof that work remains: later replies, commits, branch notes and merged follow-ups were checked. No replies or reviews were posted on your behalf.

## PRs opened against your fork

- [jmchilton/galaxy #87 — collection-type picker review fixes](https://github.com/jmchilton/galaxy/pull/87), targeting `issue_19049_collection_type_picker` / upstream #24055: **reviewed and merged** at `216bc728e6c931665589d11d00b0d1a340c8efbb`, against base `d37a9e903038064bbc1ed9eb2830ef013150a48d`. All eight commits hold up; 370 relevant tests pass, and all remaining CI failures were diagnosed as unrelated. Exact head/base typecheck has the same three existing errors. Merged 2026-10-13 16:58 UTC as `79454e885e4d2f38db552f019d4fcea21d4f01e9`; upstream #24055 remains draft. No local live-browser run was performed. [Review record](../../repositories/galaxy/reviews/archived/fork-87/index.md).
- [Fork #86 — repository data-table review fixes](https://github.com/jmchilton/galaxy/pull/86), linked from [#23229’s review](https://github.com/galaxyproject/galaxy/pull/23229#pullrequestreview-5265410975), is already merged; no second merge needed.
- [Fork #76 — dependency-view scoping workaround](https://github.com/jmchilton/galaxy/pull/76) remains open, but was created in 2019 and last updated in 2019. It does not target a recent tracked PR; excluded from this maintenance request.

## Open PRs

### #24050 — Sample sheet Vue 3 grids

**All five findings fixed and pushed at `ea019fe4700`; fresh CI pending.** [Review](https://github.com/galaxyproject/galaxy/pull/24050#pullrequestreview-5500793156) · [Workbook-reload thread](https://github.com/galaxyproject/galaxy/pull/24050#discussion_r4256376934) · [Branch record](../../repositories/galaxy/branches/active/sample_sheet_vue3/index.md).

- [x] Preserve collection-backed mode when reloading a workbook downloaded from an existing collection. The generic workbook parser returns identifiers and metadata without URLs or model objects; the grid then switches to URI mode and emits URL elements without URLs. Use the collection-specific workbook-parse endpoint, or join the parsed metadata back to the existing elements by identifier. Add a regression covering collection → downloaded workbook → edited/reloaded workbook → valid collection-create payload, with metadata edits retained.
- [x] Follow-up: when FetchGrid’s target changes from supported to unsupported, reset to raw view and clear the old rows so edited stale URLs cannot be submitted; test the target swap.
- [x] Follow-up: distinguish model-object and URI rows using the explicit mode, so a permitted metadata column named `__model_object` does not break import; cover that column name.
- [x] Follow-up: allow clearing an optional restricted sample-sheet column to `null`, matching backend validation; test clearing an existing value.
- [x] Follow-up: update references in other rows when an identifier is renamed, or prevent a rename that would leave invalid references; test the submitted payload.

The first item is Marius’s explicit request for this PR. The other four were described as acceptable follow-ups; they do not independently require holding this PR.

Completed 2026-10-13: 168 affected tests and type/lint/format checks pass. No requested item deferred. [Implementation and verification](../../repositories/galaxy/branches/active/sample_sheet_vue3/marius_followups_2026-10-13.md).

### #24055 — Collection-type picker

[Review](https://github.com/galaxyproject/galaxy/pull/24055#pullrequestreview-5500931990) · [Fork fixes #87](https://github.com/jmchilton/galaxy/pull/87) · [Branch record](../../repositories/galaxy/branches/active/issue_19049_collection_type_picker/index.md).

- [x] Exercise `workflow_editor_set_collection_type` through a live browser for `list`, `paired`, a nested type and a custom type, and confirm each saves the exact requested type. New `test_collection_input_bare_collection_types` at `18cb3407412` covers `paired` and `list`; it was red with the old bare-type search and is green with #87's fix. That test and the existing nested, custom/Any and `sample_sheet:paired` tests pass under local Playwright, headless. The Selenium backend was left to CI.
- [ ] Verify fresh upstream CI on `18cb3407412`. It was pending at the time of this pass.
- [ ] Finish the existing human read-through and UX/scope decisions before taking the upstream PR out of draft. The explicit draft instruction remains in force.

Completed by merged #87: the workbook 2+3 layout, selector search, untouched empty-field styling, blank section names, unlisted empty values, options removing a selection, sample-sheet connection notes and simplification changes are all covered; do not open duplicate implementation tasks.

### #24069 — Storage badge popovers

**Optional follow-ups; Marius approved the PR.** [Review](https://github.com/galaxyproject/galaxy/pull/24069#pullrequestreview-5501066796) · [Branch record](../../repositories/galaxy/branches/merged/issue_24031_badge_tooltip_html/index.md).

- [x] Prevent nested non-interactive badge popovers from becoming orphaned when the outer preferred-storage/template popover closes. Done in `b21056e70b8`: non-interactive and message-less badges use the non-hoverable `v-g-tooltip.html`, which closes on leave. Links in that mode render but are inert.
- [x] Rewire GPopover ARIA attributes and keyboard handlers when a reused badge’s message changes after mount and switches interactive mode. Done structurally: the popover is `v-if`'d on the mode and remounts. Both directions are tested. Tabled: the general GPopover rewire on prop change, which badges no longer hit.
- [x] Avoid a redundant Tab stop and duplicate spoken label for badges without messages. The Tab stop is gone. Tabled: the duplicate label, because `v-g-tooltip` sets both `aria-label` and `aria-describedby` everywhere it is used.
- [x] Strengthen coverage. Added Tab into a message link, a linked message in non-interactive mode, and the mode swap. Tabled: a unit-level real-sanitizer check, because DOMPurify is unreliable under happy-dom. The E2E already exercises the real path.

Details: [branch record](../../repositories/galaxy/branches/merged/issue_24031_badge_tooltip_html/index.md#marius-review-follow-ups--2026-10-13).

Keep draft until you explicitly request readiness. These review notes were not blocking approval and should be scoped as follow-ups unless you choose to include them here.

### #24051 — Fake HTTP provider / async initialization

[Discussion](https://github.com/galaxyproject/galaxy/pull/24051#issuecomment-6138884846) · [Branch record](../../repositories/galaxy/branches/active/plugins_test_fake_provider/index.md).

No new code TODO from Marius: his comment supports the async-layer fix. The production initialization fix at `cc3fe81fbc50` has passing upstream integration CI. Preserve the explicit draft instruction; finish the human read-through before requesting readiness.

## Follow-ups from merged PRs

### #23922 — Workbook import browser coverage

Merged 2026-10-13. All three suggestions are optional follow-up test improvements. [Review](https://github.com/galaxyproject/galaxy/pull/23922#pullrequestreview-5491654666) · [Archived branch](../../repositories/galaxy/branches/merged/workbook_import/index.md). The fetched dev snapshot still contains the loose URL assertions and mapping-only checks.

All three implemented on [`workbook_import_followups`](../../repositories/galaxy/branches/active/workbook_import_followups/index.md) (`4aacb2ca03c`), awaiting CI and PR.

- [x] Parse the workbook download URL query and compare `type == ["collection"]` and `collection_type == ["list:paired"]` exactly. The current substrings also accept `collections` and `list:paired_or_unpaired`. [Thread](https://github.com/galaxyproject/galaxy/pull/23922#discussion_r4248713499).
- [x] Assert transformed row count and representative forward/reverse identifiers in paired and nested workbook tests, beyond inferred mapping alone. [Thread](https://github.com/galaxyproject/galaxy/pull/23922#discussion_r4248713513).
- [x] Assert that uploading a collection workbook switches the builder from datasets to collections mode; the current tests would pass without the reset. [Thread](https://github.com/galaxyproject/galaxy/pull/23922#discussion_r4248713519).

### #23921 — Shared activity availability

Merged. These remain optional refinements. [Review](https://github.com/galaxyproject/galaxy/pull/23921#pullrequestreview-5459367059) · [Archived branch](../../repositories/galaxy/branches/merged/shared_activity_availability/index.md).

- [ ] Choose a typed registry-ID strategy for availability gates, accounting for custom activities, so misspelled or renamed built-in IDs cannot silently fall through as available. Current dev still accepts a plain string.
- [ ] Correct the original description’s claim about anonymous filtering, or centralize the duplicated anonymous check with regression coverage. Current code explicitly says callers handle anonymous access; the activity bar still applies the check itself.
- [ ] Accept `null` in the configuration input type and add a not-loaded-yet case, matching what the configuration store sends.
- [ ] Optional cleanup: simplify the small availability computed value/comment if it improves readability.

The ActivitySettings availability filter already landed in [#24052](https://github.com/galaxyproject/galaxy/pull/24052); no task remains for that planned follow-up.

### #23992 — Multiple text workflow parameters

Merged 2026-10-13. [Review](https://github.com/galaxyproject/galaxy/pull/23992#pullrequestreview-5488375909) · [Archived branch](../../repositories/galaxy/branches/merged/issue_21015_multiple_text_param/index.md).

- [ ] Polish/read/approve the existing float-only capability follow-up, rather than reimplementing it. Relevant CI passes; it remains in `branches_implemented`. [Float branch](../../repositories/galaxy/branches/merged/workflow_multiple_parameter_review_followups/index.md).
- [ ] Decide whether restricted multiple text inputs should allow empty-valued connected options, and add a request-level regression if supported. The current rejection is documented and was deliberately deferred; it is not an unaddressed merge blocker.
- [ ] Carry forward the separately queued shared integer/text normalization work: fallback defaults and subworkflow values should reach tools in the same list representation as submitted values. Link/reuse its existing task and cover runtime handoff rather than only conversion validation.
- [ ] Reconcile the static-restriction default branch with the now-merged multiple-text changes, then finish its human review. [Static-default branch](../../repositories/galaxy/branches/active/issue_23980_static_restriction_default/index.md). This is the existing branch for Marius’s static-options/default observation.

Already addressed in #23992 at `299a5936747`: newline default rows/error guidance, numeric text default conversion and connected-option preselection, boolean rejection and required-`None` validation. Do not requeue those nits.

### #23995 — Datatype provider error handling

Merged. [Review thread and your response](https://github.com/galaxyproject/galaxy/pull/23995#discussion_r4227980971).

- [ ] Reconcile the existing upload-composables branch with current dev, then review/approve its handling of datatype/dbkey request failures in callers. The implementation and final-review evidence already exist; do not start a duplicate error-handling branch. [Branch record](../../repositories/galaxy/branches/active/upload_datatypes_composable/index.md).

### #23933 — Job-files FastAPI performance

Merged. [Performance review](https://github.com/galaxyproject/galaxy/pull/23933#pullrequestreview-5474610232) · [Applied-patch history](../../repositories/galaxy/branches/merged/job_files_fastapi/tracking_history.md).

All four supplied gist patches were already applied at `8a693a7583c`: larger download chunks, job-state recheck, batched threadpool work and the fast-small-upload optimization. The description already records the benchmark and append-temp-file cleanup. No patch remains to merge.

- [ ] Optional deployment validation: rerun the benchmark on Linux/network storage or split filesystems and cover form-auth uploads, the environments Marius explicitly did not measure.
- [ ] Decide whether the append temporary-file cleanup deserves a release backport; do not backport the complete performance change without a separate scope decision.

## Checked and already addressed / superseded

- **#23799 workflow refactoring:** the saved final description includes transient post-job actions, detached subworkflow annotations and older-version `changed` semantics; Marius’s three findings are recorded as addressed in that final merged description. [Final description](../../repositories/galaxy/branches/merged/workflow_refactor_detached_executor/pr_description.md).
- **#23995 datatype provider error handling:** your reply points to the existing `upload_datatypes_composable` follow-up, already awaiting final review. Preserve that task; its current conflict reconciliation is recorded in the [branch record](../../repositories/galaxy/branches/active/upload_datatypes_composable/index.md).
- **#23939 multiple integers:** the comma-separated-value discussion was followed by fixes and Marius’s “Thank you”; no outstanding request identified.
- **#23976 weekly Selenium coverage:** the requested schedule/issue mechanism landed in #24014; Marius’s actionlint note on #24014 explicitly required no code change.
- **#23955 Tool Shed migration scope:** Marius withdrew his split request in the same thread.
- **#23831 Cheetah reserved names:** your reply records the requested static comparison test.
- **#23829 missing version command:** current dev reports the condition at info level, matching Marius’s preference.
- **#23821 Pulsar version source / #23792 old refactor approach / #23729 import optimization:** closed or explicitly abandoned/superseded; do not resurrect old threads as active implementation requests.
- **#23436 FINISHING propagation:** implemented in `16c2f4202b`; the branch record says you manually posted the response. [Evidence](../../repositories/galaxy/branches/merged/22087-finishing-state-fixes/23436_finishing_state_review_response.md).
- **#23433 pick-value readiness:** the paused/runtime-null test discussion has your response and Marius’s later thanks; optimizing further was a possible later improvement, not an outstanding correction request.
- **Fork #86 / #23229 data-table validation:** already merged.

## Tracking sync

This file is an agent record and needs no vault frontmatter. Required vault validation currently fails on existing `vault/reviews/Untitled.md` (missing frontmatter), blocking galaxy-brain commit/push under the vault instructions. Unrelated edits are preserved; no note or schema was changed to bypass that rule.
