# Scope evaluation: issue_23978_parameter_tools_xsd

**Recommendation: keep the current (already re-scoped) scope. No further expansion or contraction.** The branch (`f66d1f0f97d..04034197ef7`: `977e2f3971a`, `8dcdee07d4b`, `ab7999ce965`, `04034197ef7`; +43/-29, 18 files) covers everything in #23978's Proposed Approach. It also fixes the issue's root cause, the hand-maintained directory list in `.ci/validate_test_tools.sh`, by validating every test-tool subdirectory with one `*/*.xml` glob. That was the modest expansion, and it is done. I checked the remaining candidates and none clears the bar of being "genuinely better". They are the `sample_sheet` `collection_type` XSD gap, `ftpfile` in the enum, an XSD-enum-vs-`parameter_types` parity test, production/core tool XSD validation, and YAML test tools. Each is a separate concern with its own design question, or it would validate nothing in CI. Treat them as follow-ups (see 3-6). Contracting back to `issue_23978_parameter_tools_xsd_alt_original_scope` (`ab7999ce965`) would put the trap that caused the issue back, to save about 3 lines of shell.

The branch is under 100 lines of non-generated code, so there's no decomposition section. It is already split into a behavior-preserving CI-script fix (`977e2f3971a`), the issue fix (`8dcdee07d4b`), XSD docs (`ab7999ce965`) and the subdirectory glob (`04034197ef7`).

I formed this view before reading `earlier_drafts/{1,2}/scope_evaluation.md`. When I compared afterwards, I had missed none of their candidates. The new candidate here is the parity test (5). The ordering/stacking question is unchanged from draft 2 (see 8).

## 1. As implemented (recommended)

The CI script's XSD-lint path is fixed and now fails fast. 14 `parameters/` tools lose `ext=` (9 drop `ext="data"`, and 5 move to `format=`, so they really restrict now). 4 section/repeat `title`s are added. `rules` is added to the `ParamType` enum, with docs. CI validates every test tool at the top level and one subdirectory down, which is 431 tools, all green.

| Pros | Cons |
|---|---|
| <ul><li>Matches the issue item for item: tool fixes plus a CI guard, no exclude list</li><li>Removes the root cause (the per-directory list) instead of adding one more entry</li><li>Fixes a pre-existing silent CI defect: the XSD lint pointed at a path that never existed</li><li>No tool edits needed for the 21 newly covered tools</li><li>Codex, thermo-nuclear, normal review and test challenge all came back clean</li></ul> | <ul><li>5 tools gain real format restrictions, a small behavior change (verified green under both tool APIs)</li><li>Symlinked production tools (`expression_tools/`, `for_tours/filtering.xml`) are now XSD-gated by this job. That follows the top-level symlink precedent, but the PR description must say so</li><li>Stacked on `issue_18642_framework_tool_coverage`, so the compare shows parent commits until it merges</li><li>`test_inputs_param_type` pins the full enum set (pre-existing brittleness)</li></ul> |

## 2. Contract: back to `parameters/*.xml` only (`_alt_original_scope`)

Drop `04034197ef7` and validate only top-level plus `parameters/`.

| Pros | Cons |
|---|---|
| <ul><li>Literal reading of the issue's "add `parameters/*.xml`"</li><li>21 fewer tool validations in CI</li><li>A 1-commit drop (the alt branch is an ancestor)</li></ul> | <ul><li>Brings back the exact trap behind #23978: the next new subdirectory goes unvalidated</li><li>Leaves `test/functional/tools/CLAUDE.md`'s "all test tools" claim false again</li><li>Saves about 3 shell lines, so the trade isn't worth it</li></ul> |

## 3. Follow-up: `sample_sheet` in the XSD `CollectionType`/`CollectionTypeList` patterns

Both patterns (`galaxy.xsd:8751-8766`) allow only `list|paired|paired_or_unpaired|record`. Core `lib/galaxy/tools/sample_sheet_to_tabular.xml` and `convert_sample_sheet.xml` use `collection_type="sample_sheet,..."`, which the XSD rejects. `origin/dev` still has the gap. Read-only searches found no upstream issue or PR.

| Pros (fold in) | Cons (fold in) |
|---|---|
| <ul><li>Same "XSD rejects what the runtime supports" class as `rules`, in the file this branch touches</li><li>Affects third-party `planemo lint` if sample sheets are meant for tool authors</li></ul> | <ul><li>No XML test tool uses it (`parameters/gx_data_collection_sample_sheet.yml` is YAML, so XSD doesn't apply). This branch's CI would not exercise it without a new fixture or linter test</li><li>It needs a design call from whoever owns sample sheets on which nestings are legal (`sample_sheet:paired`, etc.) and whether tool authors should use them</li><li>Unrelated to `ext=` / test-tool hygiene, and it's a public tool-language change deserving its own changelog line</li></ul> |

Queue via `GX_QUEUING_ISSUE_CREATION.md`. Don't fold in.

## 4. Follow-up: add `ftpfile` to the `ParamType` enum

`ftpfile` is in `parameter_types` and in the hand-written doc list, but not in the enum. It's the only remaining difference between the two after this branch.

| Pros | Cons |
|---|---|
| <ul><li>The enum would then match `parameter_types` exactly</li><li>The doc list would stop advertising a value the XSD rejects</li></ul> | <ul><li>Its only user is `tools/data_source/upload.xml`, which stays excluded (its param-less conditional is invalid), so CI would validate nothing new</li><li>Arguably the doc entry should be removed instead. It's an internal upload-only type. That's a judgment call outside #23978</li></ul> |

## 5. Follow-up: unit test pinning XSD `ParamType` enum == `parameter_types` keys

This applies the re-scope's root-cause logic to the XSD side. `rules` (and, historically, `directory_uri`) went missing because the enum is maintained separately from `parameter_types`. A parity test would catch the next one.

| Pros | Cons |
|---|---|
| <ul><li>A reusable guard against the whole class, not one instance</li><li>Small: one test</li></ul> | <ul><li>Forces the `ftpfile` decision (4) first, or an allow-list exception</li><li>Couples the `galaxy-tool-util` XSD to app-side `galaxy.tools.parameters.basic`, so it needs a test location that can import both (`test/unit/app/tools/`)</li><li>Doesn't fix a current bug, since the enum is in sync apart from `ftpfile`. That makes it a marginal tweak here, and it would park the branch</li></ul> |

Bundle it with (4) as one small follow-up PR.

## 6. Rejected: XSD-validate core/production tools or YAML test tools

`lib/galaxy/tools/*.xml` and `tools/**` have no CI XSD check (draft 2 found 43/202 failing, mostly core-only `tool_type`s and legacy attributes). The 24 YAML test tools can't be XSD-checked and would need the YAML tool model instead.

| Pros | Cons |
|---|---|
| <ul><li>Same "nothing catches it" argument</li></ul> | <ul><li>Many unrelated XSD and tool-language questions, far bigger than the issue</li><li>YAML validation is a different mechanism, already partly exercised by the parameter specification tests</li><li>Each needs its own issue</li></ul> |

## 7. Rejected: recurse past one directory level, or a single-process Python validator

Recursing would need a `cwl_tools/` prune, and no tool sits deeper today (the script comment states the depth). Replacing `scripts/validate_tools.sh` (one python + xmllint per tool) with one Python driver using `TOOL_XSD` is the real structural cleanup here, but the branch never touches that script.

| Pros | Cons |
|---|---|
| <ul><li>Recursion would future-proof deeper nesting</li><li>The single driver is faster and removes the duplicated `xsd_path`</li></ul> | <ul><li>Recursion: no current tool benefits, and it adds a prune and changes portability</li><li>Driver: a refactor of a generic shared script, so it belongs in its own PR</li></ul> |

## 8. Stacking: stay stacked (no change)

Unchanged from earlier drafts. The parent supplies the stray-`g` fix and drill_down `option selected` in the XSD, and the issue says to "land with or after" it. Rebasing onto dev would need duplicated fixes or an exclude list. Folding into the parent mixes test-tool hygiene into a coverage PR. Targeting dev is right: the change is test infrastructure plus an XSD enum, with no user-visible bug to backport.
