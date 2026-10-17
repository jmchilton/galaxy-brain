# Scope evaluation: issue_23978_parameter_tools_xsd

**Recommendation: keep scope as implemented, still stacked on `issue_18642_framework_tool_coverage` as its own PR. No scope change.** The branch (`85f79a9ab6c..2a42bff3bfc`, 2 commits, 18 files, +40/-26) does what #23978's Proposed Approach describes. It fixes the 14 `ext=` tools, adds the 4 missing `title`s, adds `rules` to the XSD enum, and adds `parameters/*.xml` to `.ci/validate_test_tools.sh`. The parent covers the stray `g` and drill_down `selected`, which is the issue's own plan ("land with or after" that branch). Recommended follow-up, not a blocker: also validate the other nested test-tool dirs (`for_workflows/` 17, `deprecated/` 1, `for_tours/` 1). All 19 already pass `xmllint` (each printed `- validates`), so that is CI-only hardening with no bug to fix. The issue frames its problem and fix around `parameters/`. Do the `test/functional/tools/CLAUDE.md` "all test tools" wording with that follow-up. `ftpfile` is out of scope. Stacking stays. Both contractions are worse.

## 1. As implemented (recommended)

The 14 `parameters/` tools drop `ext="data"` (9) or move to `format=` (5, which now really restrict their inputs). The 3 sections and the repeat gain `title`. The XSD enum and docs gain `rules`, and the type list catches up with `group_tag` and `directory_uri`. CI validates `parameters/*.xml`, and the script's XSD-lint path is fixed.

| Pros | Cons |
|---|---|
| <ul><li>Matches the issue's Proposed Approach item for item, including "both together" (fixes plus CI guard)</li><li>No exclude list: all 98 `parameters/` tools pass, so CI covers 410 tools</li><li>The XSD-lint path fix (`tools/xsd` → `tool_util/xsd`) and the shellcheck rewrite are forced by touching the script: the old lint silently errored</li><li>Small, mechanical, easy to review</li></ul> | <ul><li>5 tools gain real datatype restrictions, a small behavior change (verified 10/10 under both tool APIs)</li><li>The `group_tag`/`directory_uri` doc additions go slightly beyond the issue (doc-only)</li><li>Depends on the parent PR, so the compare shows its commits until it merges</li><li>Leaves other nested test dirs unvalidated (see 2)</li></ul> |

## 2. Expand: validate the other nested test-tool dirs (candidate a)

Add `for_workflows/*.xml`, `deprecated/*.xml` and `for_tours/*.xml` (19 tools) to the `case` loop in `.ci/validate_test_tools.sh`. `expression_tools/` is a symlink to production `tools/expression_tools/`: 2 tools that pass, plus `expression_macros.xml`, which would need excluding. `data/` and `realtime/` have no tool XML.

| Pros | Cons |
|---|---|
| <ul><li>Same drift argument as the issue ("nothing catches it"): these dirs are also never validated</li><li>Cheap: a few globs and one macro exclusion, no tool edits; all 21 tools already validate</li><li>Would make the `CLAUDE.md` "all test tools in the directory" claim true (see 4)</li></ul> | <ul><li>No failures today, so it prevents future drift rather than fixing a bug; the issue is framed as a `parameters/` problem</li><li>`expression_tools/` are production tools reached through a symlink, a different ownership question</li><li>Adds runtime to an already "expensive" CI job</li><li>Fits better as a one-line follow-up PR or as a fold-in at PR time if John wants it</li></ul> |

<details>
<summary>Details</summary>

Checked on this worktree with `find -L test/functional/tools -mindepth 2 -name '*.xml' -not -path '*/parameters/*'`. Each tool was macro-expanded with `galaxy.tool_util.loader.load_tool` and piped to `xmllint --schema lib/galaxy/tool_util/xsd/galaxy.xsd`. The check required the positive `- validates` line, not just the absence of an error. Results:

- `for_workflows/`: 17/17 validate
- `deprecated/`: 1/1 validate
- `for_tours/`: 1/1 validate
- `expression_tools/`: 2/2 validate, plus `expression_macros.xml` (not a tool)

Top-level symlinked tools (`upload.xml`, `export_remote*.xml`, `ucsc_tablebrowser.xml`) are already covered or excluded by the existing top-level glob, so nothing changes for them.
</details>

## 3. Expand: add `ftpfile` to the XSD `ParamType` enum (candidate b)

`ftpfile` appears in the `type` attribute's doc list and in `parameter_types`, but not in the enum.

| Pros | Cons |
|---|---|
| <ul><li>Makes the doc list and the enum agree</li></ul> | <ul><li>Unrelated to the issue: no `parameters/` tool uses it</li><li>Its only user is `lib/galaxy/tools/bundled/data_source/upload.xml`, which CI excludes anyway (non-standard conditional), so the enum change alone validates nothing new</li><li>The doc entry was already there before this branch</li><li>An XSD API change for a core-only type deserves its own small issue</li></ul> |

## 4. Expand: fix the `test/functional/tools/CLAUDE.md` wording (candidate c)

Line 227 says `tox -e validate_test_tools` "checks all test tools in the directory". Before this branch it was top-level only. Now it is top-level plus `parameters/`.

| Pros | Cons |
|---|---|
| <ul><li>Removes an inaccurate agent-facing claim</li></ul> | <ul><li>The claim stays inaccurate unless (2) is also done, so pair them</li><li>Editing the file makes pre-commit prettier reformat the whole pre-existing, unformatted file. That churn is unrelated to the issue</li><li>Agent docs aren't part of the issue's contract</li></ul> |

## 5. Stacking alternatives (candidate d)

Options: (i) stay stacked on `issue_18642_framework_tool_coverage` (current), (ii) fold these commits into the parent PR, or (iii) rebase onto dev as an independent PR. Neither branch has a PR open yet (`gh pr list --head …` is empty for both).

| Pros | Cons |
|---|---|
| <ul><li>(i) Matches the issue's own sequencing ("land with or after" the parent); two focused PRs (bug fix + coverage vs. test-tool hygiene + CI)</li><li>(ii) One PR, no ordering dependency</li><li>(iii) Reviewable and mergeable without waiting on the parent</li></ul> | <ul><li>(i) Ordering dependency: the compare shows the parent's diff until it merges</li><li>(ii) The issue says this cleanup "was kept out of that branch's scope"; folding it in mixes a parser bug fix with 14-file test-tool hygiene and grows the parent's review</li><li>(iii) Would need to duplicate the stray-`g` and drill_down `selected` fixes, or keep an exclude list, so it conflicts with the parent and CI goes red until both settle. That is the path the issue rejects</li></ul> |

## 6. Contract: drop the doc catch-up (`group_tag` / `directory_uri`)

Keep the `rules` enum and its doc section. Revert the second commit's additions to the `type` list and the `data_ref` doc.

| Pros | Cons |
|---|---|
| <ul><li>Strictly what the issue asks</li></ul> | <ul><li>Saves 3 doc lines. The list would then omit types the enum already accepts, right next to the new `rules`</li><li>`data_ref` is read for `rules` (`RulesListToolParameter`), so that doc line is accurate and related</li><li>Not worth the churn</li></ul> |

## 7. Contract: fix tools only, no CI change

Ship the XSD and tool fixes without touching `.ci/validate_test_tools.sh`.

| Pros | Cons |
|---|---|
| <ul><li>Smaller, and avoids the shellcheck-driven script rewrite</li></ul> | <ul><li>The issue rejects this explicitly: "fixes without CI coverage regress (the pattern was copied forward for two years)"</li><li>Would also leave the script's broken XSD-lint path in place</li></ul> |

## 8. Contract: CI with an exclude list, or accept `ext` as an alias

Both are listed and rejected under the issue's Alternative Approaches.

| Pros | Cons |
|---|---|
| <ul><li>Exclude list: smallest CI change</li><li>Alias: no tool edits</li></ul> | <ul><li>An exclude list tends to become permanent and hides the real XSD gap (`rules`)</li><li>The alias adds a second spelling to the tool language just to accommodate test-tool typos, and it changes these tools' behavior anyway</li></ul> |
