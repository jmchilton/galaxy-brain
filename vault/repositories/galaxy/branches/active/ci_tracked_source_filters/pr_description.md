Follow-up to 🔀 #23999 — restore CI selection for source files Git still tracks under `lib/`.

Editing `packages/schema/src/galaxy/schema/history.py` changes `lib/galaxy/schema/history.py` in Git's diff: the package source directory is a symlink. After #23999 replaced the tracked source filters with package-alias paths, source-only changes could miss their checks, while Selenium-only changes could select unrelated suites.

| Single changed path | After #23999 | With this change |
| --- | --- | --- |
| `lib/galaxy/schema/history.py` | BioBlend not selected | BioBlend selected |
| `lib/tool_shed/webapp/frontend/package.json` | Tool Shed frontend not selected | Tool Shed frontend selected |
| `lib/galaxy_test/selenium/test_tool_form_harness.py` | API selected; tool-form harness not selected | API excluded; tool-form harness selected |

***This changes which CI checks contributors' edits select; Galaxy's runtime behavior and the jobs themselves stay unchanged.***

Eight workflows regain tracked source/dependency inclusions, and seventeen regain Selenium exclusions. Source filters use the current tracked layout; broad package filters and package Selenium exclusions remain for real package changes.

***The source tree stays in place: these filters must be revisited when the files actually move into packages.***

## Risks

This is a two-way door: the event-filter changes are cheap to revert. Incorrect inclusions can miss validation; incorrect exclusions can skip relevant suites or cause unnecessary runs. Local validation covers all 59 restored pattern/event cases, but does not execute GitHub's scheduling service.

## Context

Builds on 🔀 #23999's uv workspace migration. Package symlinks work for reading files in job commands, but descendant alias paths do not appear in Git's changed-file list. Requirements reads through those symlinks remain unchanged.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The repair covers both missed source checks and unnecessary Selenium-triggered runs.</summary>

The scope review favored repairing both consequences in the existing workflow declarations, without introducing a filter framework or moving sources. John's subsequent simplification removed redundant source aliases; existing package policies remain.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The static workflow declarations need no new abstraction.</summary>

The initial review found no actionable code-quality issues. A subsequent independent revision review covered the removal of 23 symlink-alias filters and found no corrections needed. The initial review's preference for retaining source aliases was superseded by John's simplification request.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Maintainers see missing expected CI runs or unnecessary runs; failures in triggered jobs retain their existing GitHub Actions logs.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A: no unit tests changed; recorded validation exercises scheduling decisions against actual tracked source paths.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?

- [x] Instructions for manual testing are as follows:
  1. Use `git ls-files -s packages/schema/src/` to confirm the schema source alias is a tracked symlink. Temporarily edit a file through it and inspect `git diff --name-only`; restore the edit afterward.
  2. Compare the changed paths in the table with the corresponding workflow's ordered `paths`/`paths-ignore` lists on `dev` and this branch. Repeat for push and pull-request declarations where present.
  3. Inspect CI runs for workflow validity and job failures. Runs triggered by edits to workflow files do not demonstrate source-only selection.

<details><summary>Local validation passed; fork CI is still pending.</summary>

All 25 edited YAML workflows parsed. The audit checked 25 restored inclusions and 34 restored exclusions against actual tracked files, verified all 23 removed alias filters descend through tracked symlinks, and demonstrated the schema-alias edit produces only the lib path. Job bodies, non-path event configuration, real package policies, and explicit workflow-file triggers remain unchanged. `git diff --check` and commit-time Validate GitHub Workflows passed.

On 2026-10-14 the current fork head had six queued runs and two skipped runs, with no failures. Earlier-head runs remained queued/in progress or were cancelled/skipped. CI completion is pending.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
