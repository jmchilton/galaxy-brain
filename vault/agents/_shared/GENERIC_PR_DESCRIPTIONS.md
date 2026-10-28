Read and apply general ./PITCH_ADVICE.md.

In general my factory PRs should have this structure:

```
<OPENER> (see below)

For the main body - use best judgement.

## Risks

(see below)

## Context

(see below)

## Agentic Checks

(see below - exclude section if none available)

(Project PR template stuff - if any - exclude for most projects)

```

## Agentic Checks

Check the branch folder debriefs.

Each check should be the form:

```
### ✅ [CHECK_NAME](CHECK_LINK)

<details><summary>TOP_LINE</summary>

(details)

[Full report](REPORT_LINK). RUN_LINE

</details>
```

- TOP_LINE should be one short sentence - probably pulled from the debrief document for that check.
- GitHub doesn't render Markdown inside `<summary>` - use HTML there (`<b>`, `<i>`, `<code>`, `<a href>`), never `**`, backticks or `[text](url)`.
- Summarize the details of the document concisely and add to details.
- REPORT_LINK is the debrief's page on the galaxy-brain site: `https://galaxy-brain.jmchilton.net/` plus its vault path without `vault/`, the status directory and `.md`, with a trailing `/`. E.g. `vault/repositories/pulsar/branches/active/foo_bar/codex_review.md` → `https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/foo_bar/codex_review/`. It may not be published yet; link it anyway.
- RUN_LINE is the debrief's `Run via <model> at <effort> effort.` line; leave it out if the debrief has none.

Each of these files (if present in the branch) represents one check to document.

- `thermo_nuclear_review.md` CHECK_NAME = "Cursor's Thermo Nuclear Review", CHECK_LINK = https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md
- `codex_review.md` CHECK_NAME = "Second Frontier Model Review" (no link)

## Openers

Every PR should open with a paragraph that is a single line. 

The following should be read as a pretty controlled list but variations on this can work if needed.

- Fix 🎯 #<issue_number> - single, simple line describing the issue.
- Implement 🎯 #<issue_number> - single, simple line describing the feature.
- Refactor ahead of 🔀 #<pr_number> - single, simple line describing the upstream PR.
- Refactor ahead of 🌿<branch_name_and_link> - single, simple line describing the downstream branch.
- Toward 🎯 #<issue_number> - single, simple line describing the partial fix (when the change addresses the issue's mechanism but isn't shown to fix the reported case).
- Groundwork for 🎯 #<issue_number> - single, simple line describing what this prepares (docs, refactors or surveys the issue's work needs).
- Follow-up to 🔀 #<pr_number> - single, simple line describing what this adds on top of that PR (e.g. a response to its review).


## DO: Place PR in Context

Combine sentences into one short paragraph in a "## Context" section above the check lists.

- Builds on 🔀 #<pr_number>, ...    (merged past work)
- Part of 🌿<branch_name_and_link>, used to <function_in_that_branch>.
- Part of 🔀 #<pr_number>, used to <function_in_that_branch>.
- Alternative to 🔀 #<pr_number>.
- Alternative kept on 🌿<alt_branch_name_and_link> - <how it differs, from `alts/<short_description>.md`>. One per file in `BRANCH_DIRECTORY/alts/`.

## DO: Include a risk assessment.

See ./ASSESSING_RISK.md for details and format.
