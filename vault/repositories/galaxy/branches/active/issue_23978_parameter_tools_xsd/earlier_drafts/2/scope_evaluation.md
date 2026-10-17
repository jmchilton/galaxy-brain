# Scope evaluation: issue_23978_parameter_tools_xsd

**Recommendation: modest expansion.** Change the `.ci/validate_test_tools.sh` glob from the hardcoded `parameters/*.xml` to every test-tool subdirectory (`"$test_tools_path"/*/*.xml`), and widen the macro exclusion from `*/parameters/macros.xml` to `*macros.xml`. Everything else stays as implemented, still stacked on `issue_18642_framework_tool_coverage` (base `f66d1f0f97d`; commits `977e2f3971a`, `8dcdee07d4b`, `ab7999ce965`). The fix is cheap, and the root cause backs it. #23978 happened because a new subdirectory (`parameters/`) was never added to a hand-maintained glob. Hardcoding one more directory leaves that class of bug open. A dry run of the generic glob selects 431 files: the current 410 plus 21 in `for_workflows/` (17), `expression_tools/` (2, symlinked), `deprecated/` (1) and `for_tours/` (1). Every one validates against the branch XSD, so no tool edits are needed. The same change makes the existing `test/functional/tools/CLAUDE.md` claim ("checks all test tools in the directory") true, with no edit to that file. Two things should be follow-ups, not fold-ins: the `sample_sheet` `collection_type` XSD gap and XSD validation of production tools.

The branch is about +43/-29 lines, so there is no decomposition section. It is already split into a pre-existing CI-script fix (`977e2f3971a`), the issue fix (`8dcdee07d4b`) and XSD docs (`ab7999ce965`).

## 1. As implemented

`977e2f3971a` fixes the CI script's XSD lint path (`tools/xsd` → `tool_util/xsd`), makes it fail fast, and replaces `ls | grep` with a glob plus `case` loop (shellcheck-clean, still top-level only). `8dcdee07d4b` fixes the 14 `ext=` tools (5 now really restrict their formats), adds the 4 missing `title`s, adds `rules` to the `ParamType` enum, and validates `parameters/*.xml`. `ab7999ce965` documents `rules`, `group_tag` and `directory_uri`.

| Pros | Cons |
|---|---|
| <ul><li>Matches the issue's Proposed Approach item for item: fixes plus CI guard, no exclude list</li><li>Fixes a pre-existing CI defect (the XSD lint never ran) in its own commit</li><li>Small and mechanical</li></ul> | <ul><li>Hardcodes `parameters/` as the next directory, the same pattern that let #23978 rot for two years</li><li>Leaves 21 nested test tools unguarded, though all pass today</li><li>5 tools gain real format restrictions, a small behavior change (verified green under both tool APIs)</li></ul> |

## 2. Expand: validate all test-tool subdirectories (recommended)

Change the second glob to `"$test_tools_path"/*/*.xml` and the exclusion arm to `*macros.xml`, so any future subdirectory is covered automatically. Update the script comment to match.

| Pros | Cons |
|---|---|
| <ul><li>Closes the root cause: no per-directory list left to forget</li><li>Zero tool edits. Dry run: 431 files, all `- validates` (positive line checked, not just no errors)</li><li>Exclusions stay three named categories. `*macros.xml` matches only `parameters/macros.xml` and `expression_tools/expression_macros.xml`. No subdirectory has a `*_conf.xml` or `upload.xml`. All 431 selected files contain `<tool`</li><li>Makes the `CLAUDE.md` "all test tools" wording accurate with no edit, so no prettier churn</li></ul> | <ul><li>Goes past the issue's `parameters/` framing. The process doc says that reason has been overridden</li><li>`expression_tools/` is a symlink to production `tools/expression_tools/`. The top-level glob already validates symlinked production tools (`export_remote*.xml`, `ucsc_tablebrowser.xml`), so this follows precedent</li><li>21 more `load_tool` + `xmllint` runs (about 5%) in an already slow CircleCI job</li><li>The `*macros.xml` pattern would silently skip a future tool whose name ends in `macros.xml`. That's unlikely, and an explicit two-path arm avoids it</li></ul> |

<details>
<summary>Details</summary>

Dry run on the worktree, read-only (no file edits):

```sh
set --
for f in test/functional/tools/*.xml test/functional/tools/*/*.xml; do
  case "$f" in *_conf.xml|*/upload.xml|*macros.xml) ;; *) set -- "$@" "$f";; esac
done   # => 431
```

Each nested tool was macro-expanded with `galaxy.tool_util.loader.load_tool` and piped to `xmllint --schema lib/galaxy/tool_util/xsd/galaxy.xsd`. All 21 printed `- validates`. `data/` and `realtime/` contain no `.xml`, and no tool XML sits deeper than one subdirectory level.

Choosing a generic glob over explicit directories: the issue's own diagnosis is that "nothing catches it" because `parameters/` was never listed. An explicit `for_workflows/ deprecated/ for_tours/ expression_tools/` list repeats that trap for the next new subdirectory.
</details>

## 3. Follow-up: `sample_sheet` `collection_type` XSD gap

The XSD's `collection_type` patterns (around `galaxy.xsd:8756` and `:8764`) allow only `list|paired|paired_or_unpaired|record`. `sample_sheet` is a real runtime collection type: `lib/galaxy/tools/sample_sheet_to_tabular.xml` fails XSD on `collection_type="sample_sheet,..."`, and the XSD doesn't mention `sample_sheet` anywhere. It's the same kind of gap as `rules` and drill_down `selected`, in the file this branch touches. No tracking issue was found (read-only `gh` searches).

| Pros (fold in) | Cons (fold in) |
|---|---|
| <ul><li>Same kind of gap the branch already closes for `rules`</li><li>Can affect third-party `planemo lint` if sample sheets are meant for tool authors</li></ul> | <ul><li>No test tool in `test/functional/tools` uses it, so this branch's CI wouldn't exercise the fix without a new fixture tool</li><li>Whether `sample_sheet` is for tool authors or core-only, and which nestings are legal, is a design question for whoever owns sample sheets</li><li>Unrelated to `ext=` / `parameters/`</li></ul> |

Recommend queueing an issue via `GX_QUEUING_ISSUE_CREATION.md` rather than folding it in.

## 4. Rejected: XSD-validate production tools (`lib/galaxy/tools/*.xml`, `tools/**`)

These have no CI XSD check either. A sweep found 159 valid and 43 failing. Almost all core collection-operation tools fail on `tool_type` values missing from the enum (`build_list`, `filter_null`, ...) and on a `<type>` element. The legacy `tools/` failures are things like `metadata_name`, `err_level`, `url_method`, a comma-plus-space `format`, and `upload.xml`'s param-less conditional.

| Pros | Cons |
|---|---|
| <ul><li>Same "nothing catches it" argument</li></ul> | <ul><li>43 failures across several unrelated XSD and tool-language questions (should the XSD describe core-only tool types at all?)</li><li>Far bigger than the issue, so it needs its own issue</li></ul> |

## 5. Rejected: add `ftpfile` to the `ParamType` enum

It's in the doc list and in `parameter_types` but not in the enum. Its only user is `upload.xml`, which is excluded for its non-standard conditional, so the enum change would validate nothing new. Both the doc entry and the omission predate this branch.

| Pros | Cons |
|---|---|
| <ul><li>Makes the doc list and the enum agree</li></ul> | <ul><li>Nothing in CI exercises it</li><li>It's a legacy type and arguably shouldn't be advertised. Leave it for a doc-cleanup pass</li></ul> |

## 6. Stacking: stay stacked / fold into parent / rebase onto dev

The parent already fixes the stray `g` and drill_down `option selected`, and the issue says to "land with or after" it.

| Pros | Cons |
|---|---|
| <ul><li>Stay stacked (current): two focused PRs, matches the issue's sequencing</li><li>Fold in: one PR, no ordering</li><li>Rebase onto dev: independent review</li></ul> | <ul><li>Stacked: the compare shows the parent's commits until it merges</li><li>Fold in: the issue says this cleanup "was kept out of that branch's scope", and it would mix 14-file test-tool hygiene into a coverage PR</li><li>Rebase: CI would be red on `gx_drill_down_code`/`gx_drill_down_exact_with_selection` unless the parent's fixes were duplicated or an exclude list was used, which the issue rejects</li></ul> |

## 7. Contract options (all rejected)

- **Drop the CI change (fix tools only).** The issue explicitly rejects this: fixes without a CI guard regress. It would also leave the broken lint path.
- **CI with an exclude list, or accept `ext` as an input alias.** Both are listed and rejected in the issue's Alternative Approaches.
- **Drop `ab7999ce965` (docs).** Saves about 8 doc lines but leaves the hand-maintained `type` list missing `rules`/`group_tag`/`directory_uri`, which the enum accepts. `data_ref` really is read for `rules` (`RulesListToolParameter`).
- **Split `977e2f3971a` into its own PR.** Possible, since it's already a standalone, behavior-preserving commit, but it is only about 20 lines of shell. That's John's call at PR time, not a scope change.
