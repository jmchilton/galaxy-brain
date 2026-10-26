Launchers for Galaxy branches records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 🛡️ Harden
status: active
agent_dir: gx_workhorse
name: hd-{name}

Re-harden branch {name}. BRANCH_DIRECTORY is {record}.

## ✨ Polish
status: active
agent_dir: gx_branches
name: po-{name}

Run ./POLISH_BRANCH.md {name}

## 🚦 Fix CI
agent_dir: gx_branches
name: ci-{name}
profile: Sonnet (high)

Fix CI on branch {name}. BRANCH_DIRECTORY is {record}. Diagnose each red check; fix the ones the branch caused, rerun the unrelated ones, and record the diagnosis in the branch notes.

## 🔀 De-conflict
status: active
agent_dir: gx_branches
name: dc-{name}
profile: Sonnet (high)

De-conflict branch {name}. BRANCH_DIRECTORY is {record}. Rebase it onto its actual base branch per the rebase rules in AGENTS.md, resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record, and note the rebase in the branch notes.

## 🚀 Open PR
status: active
agent_dir: gx_branches
name: pr-{name}
profile: Sonnet (medium)

Open the PR for branch {name}. BRANCH_DIRECTORY is {record}. If the CI is done and green, open it directly otherwise open it as a draft waiting on CI. This launch is my approval of the PR open. Stop and ask if pr_description.md is missing. If no title is chosen, please pick the first one.

## 💬 Respond to review
status: active
agent_dir: gx_branches
name: br-{name}

Respond to the review of branch {name} per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is {record}.

## 💭 New session
agent_dir: gx_branches
name: br-{name}

Let's talk about branch {name}. The branch record is {record}.

## 🛝 Build Slides - Pitch
agent_dir: gx_branches
name: brslide-{name}

Yo agent - let's talk about branch {name}. The branch record is {record}. I'd like to implement slides according to `../_shared/PROCESS_SLIDES.md`. The aim for a five minute pitch for this feature. If this branch has a pr_description.md please update it so the second line is a link to the slides - do not rewrite the PR description around the slides though - just amend that line with a link. The PR description should standalone as it is and should not depend on the slides. That said - if the slides contain images that would improve the `{record}/pr_description.md` those could be incorporated (probably the PR description should have its own images already though). If the implementation of the slides results in ideas for strengthen the branch's implementation or ideas - please offer to John to expand the scope and implement these.

## 🗣 Build Slides - Implementation
agent_dir: gx_branches
name: brslide-{name}

Yo agent - let's talk about branch {name}. The branch record is {record}. I'd like to implement slides according to `../_shared/PROCESS_SLIDES.md`. The aim for a 10 minute implementation description for this feature. If this branch has a pr_description.md please update it so the second line is a link to the slides - do not rewrite the PR description around the slides though - just amend that line with a link. The PR description should standalone as it is and should not depend on the slides. That said - if the slides contain images that would improve the k`{record}/pr_description.md` those could be incorporated (probably the PR description should have its own images already though). If the implementation of the slides results in ideas for strengthen the branch's implementation or ideas - please offer to John to expand the scope and implement these.

## 📝 Address diff comments
status: active
agent_dir: gx_branches
name: diff-{name}

Address the open differential-review comments in {record} following ../_shared/PROCESS_DIFFERENTIAL_REVIEW_COMMENTS.md.
