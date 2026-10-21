You will be given a BRANCH_DIRECTORY with relevant implementation details and WORKING_DIRECTORY with the Galaxy changes.
## The Task

Review the work that has been done in the target branch and relevant notes and the initial issue.

Another agent has reviewed the code for correctness and clarity and checked the tests out. Please don't check those kinds of things - but please do review the scope of the issue/feature and prepare a scoping document.
## Scopes to Consider

Generate a list of alternative scopes to consider - did any of the review agents of the implementation notes mention issues around potentially expanding or contracting scope. If yes, please pay special attention to those and make sure all of them are considered.

## The Appropriate Scope

Agents here have consistently scoped narrower than Galaxy reviewers want. Default toward a modest expansion: if the change could be slightly generalized to cover more use cases, or related bugs in touched code could be fixed alongside it, recommend that. When torn between as-implemented and a modest expansion, recommend the expansion.

Reasons we've previously used to stay narrow that user has overridden:

- Targets a release branch. Galaxy is fairly liberal about what goes into a release branch and what counts as a bug.
- Outside the original issue. The issue is often one symptom of a broader bug. Reviewers usually want related bugs in touched code fixed together, and prefer a general feature over a specific one.
- A reusable abstraction proposed in the issue thread is a follow-up. It's part of the work: build the general piece and route the issue's case through it.

## The Scope Evaluation Report

The top-line of the document should be a final recommendation on scope size. Below that should be section for each scope considered - including as implemented. Provide a dense, readable one-three sentence description of the scope (preferring brevity here) and then a short table with pros and cons as bullet points.

If there is detailed discussion to be had place it under a `details` tag below the pros and cons list.

If the branch has more than 100 lines of non-generated code, add a "Possible Decompositions" section right below the top-line. Lay out how the branch as implemented could split into logical PRs: what each piece contains and the order they'd land in. Don't recommend a split; it's for John to decide on later. Above 1000 lines, spend extra time and lay out several options.

Write the final report to the branch notes directory with the name `scope_evaluation.md`.
