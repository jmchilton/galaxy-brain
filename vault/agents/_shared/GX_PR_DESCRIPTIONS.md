
Read and apply general ./PITCH_ADVICE.md.

In general PRs to Galaxy should be of the structure:

```
<OPENER> (see below)

For the main body - use best judgement.

## Risks

(see below)

## Context

(see below)

## Agentic Checks

(see below - exclude section if none available)

## John's Checklist

(see below)

(Galaxy template stuff - how to test, license, etc. if changed)

```

## PR checklists

Before finalizing a Galaxy branch or drafting its PR description, work through `gx_pr_checklists/GENERAL.md`, and also `gx_pr_checklists/WORKFLOW_RELATED.md` if the change touches workflows (editor, scheduler, invocations, collection mapping, gxformat2). Any item that fails means the branch isn't ready: fix it, or ask John before writing the description.

## Agentic Checks

Check the branch folder debriefs.

Each check should be the form:

```
### ✅ [CHECK_NAME](CHECK_LINK)

<details><summary>TOP_LINE</summary>

</details>
```

- TOP_LINE should be one short sentence - probably pulled from the debrief document for that check.
- GitHub doesn't render Markdown inside `<summary>` - use HTML there (`<b>`, `<i>`, `<code>`, `<a href>`), never `**`, backticks or `[text](url)`.
- Summarize the details of the document concisely and add to details.

Each of these files (if present in the branch) represents one check to document.

- `scope_evaluation.md` CHECK_NAME = "Scope Evaluation", CHECK_LINK = https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md
- `thermo_nuclear_review.md` CHECK_NAME = "Cursor's Thermo Nuclear Review", CHECK_LINK = https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md
- `test_challenges_debrief.md` CHECK_NAME = "John's Galaxy Test Challenges", CHECK_LINK = https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md
- `codex_review.md` CHECK_NAME = "Second Frontier Model Review" (no link)
- `baseline_refactor.md` CHECK_NAME = "Refactoring of base branch", CHECK_LINK = https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md

## Openers

Every PR should open with a paragraph that is a single line. 

The following should be read as a pretty controlled list but variations on this can work if needed.

- Fix 🎯 #<issue_number>  - single, simple line describing the issue.
- Implement 🎯 #<issue_number> - single, simple line describing the feature.
- Refactor ahead of 🔀 #<pr_number> - simple, single describing the upstream PR.
- Refactor ahead of 🌿<branch_name_and_link> - simple, single describing the downstream branch.
- Toward 🎯 #<issue_number> - single, simple line describing the partial fix (when the change addresses the issue's mechanism but isn't shown to fix the reported case).
- Groundwork for 🎯 #<issue_number> - single, simple line describing what this prepares (docs, refactors or surveys the issue's work needs).
- Follow-up to 🔀 #<pr_number> - single, simple line describing what this adds on top of that PR (e.g. a response to its review).
## DO: Place PR in Context

Combine sentences into one short paragraphs in a "## Context" section above the check lists.

- Builds on 🔀 #<pr_number>, ...    (merged past work)
- Part of 🌿<branch_name_and_link>, used to <function_in_that_branch>.
- Part of 🔀 #<pr_number>, used to <function_in_that_branch>.
- Alternative to <pr_number>.
- Alternative kept on 🌿<alt_branch_name_and_link> - <how it differs, from `alts/<short_description>.md`>. One per file in `BRANCH_DIRECTORY/alts/`.

Always end the paragraph with `Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).`, so the section is present even when nothing else applies.

## DO: Clean the Galaxy checklist.

- Drop the "(Select all options that apply)"
- Drop any unchecked items in "## How to test the changes?"
- Wrap any notes under the first two "How to test the changes?" checkboxes in a details tag.

## DO: Include a risk assessment.

See ./GX_ASSESSING_RISK.md for details and format.
## DO: Predict possible misunderstandings and highlight specific sentences addressing them in context.

Highlight with bold and italics and try to keep it above folds and away from large blocks of text (if any).
### Misunderstanding Audience

A developer-docs PR used this line:

***It's a reference for Galaxy developers, not a tool-author guide, so it documents legacy behavior, including the parts nobody should start depending on, to show where the edges are.***

### Misunderstanding Scope

Don't have an example yet but something like the above.
