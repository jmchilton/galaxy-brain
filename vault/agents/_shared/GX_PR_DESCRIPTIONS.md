
In general PRs to Galaxy should be of the structure:

```
<OPENER> (see below)

For the main body - use best judgement.

## Context

(see below)

## John's Checklist

(see below)

(Galaxy template stuff - how to test, license, etc. if changed)

```


## PR checklists

Before finalizing a Galaxy branch or drafting its PR description, work through `gx_pr_checklists/GENERAL.md`, and also `gx_pr_checklists/WORKFLOW_RELATED.md` if the change touches workflows (editor, scheduler, invocations, collection mapping, gxformat2). Any item that fails means the branch isn't ready: fix it, or ask John before writing the description. The general checklist's issue section decides whether an issue should be opened first.
## Openers

Every PR should open with a paragraph that is a single line. 

The following should be read as a pretty controlled list but variations on this can work if needed.

- Fix 🎯<issue_number>  - single, simple line describing the issue.
- Implement 🎯<issue_number> - single, simple line describing the feature.
- Refactor ahead of 🔀<pr_number> - simple, single describing the upstream PR.
- Refactor ahead of 🌿<branch_name_and_link> - simple, single describing the downstream branch.
## DO: Place PR in Context

Combine sentences into one short paragraphs in a "## Context" section in above the check lists.

- Builds on 🔀<pr_number>, ...    (merged past work)
- Part of 🌿<branch_name_and_link>, used to <function_in_that_branch>.
- Part of 🔀<pr_number>, used to <function_in_that_branch>.
- Alternative to <pr_number>.

## DO NOT: Cite an agent as evidence.

- No "an agent found / says / agrees". Agreement between two agents is no evidence at all.
- If an agent surfaced the problem, reproduce it as a failing workflow or real example first. If you can't, don't file.
- Saying an agent was used is fine. Treating it as an authority isn't.
## DO: Use details liberally.

In main body:

- Use detail tags and nested details also.
- Hide implementation details in details if they extend beyond a readable paragraph.
- Hide detailed code walks in details. Do not include detailed code walks unless they are needed.
## DO: Be persuasive.

The purpose of the code and documentation is describe implementation details, describe edges and limitations of features, etc.. The PR description is a pitch. People will want to jump to just looking at the implementation to describe it - they should be convinced there is a problem or this feature is needed before any implementation description.
