# Converting a Branch to a Poster

Given a branch record (BRANCH_RECORD), build a one-page poster that sells the branch. The poster is also a way to reflect on the branch: whatever the poster wants to show but can't, because the branch lacks it, is a finding.

Everything goes in `BRANCH_RECORD/poster/`:

| File | Written by | Holds |
|---|---|---|
| `PLAN.md` | planner | concept, visual hook, layout, content per region |
| poster source and `poster.png` | implementer, reviewer | the poster and a full render of it |
| `SOURCES.md` | implementer, reviewer | each claim, number and image on the poster → its source |
| `branch_recommendations.md` | all three | ideas to strengthen the branch itself (see below) |
| `implementation_debrief.md` | implementer | what was built, choices, friction |
| `review_debrief_<N>.md` | reviewer, pass N from 1 | fixes made, render check, what's still weak |

Read [PITCH_ADVICE.md](PITCH_ADVICE.md) and [SHOW_ME_RULES.md](SHOW_ME_RULES.md) and pass them to each subagent; they apply to posters as is.

## Branch recommendations

Each subagent appends a section to `branch_recommendations.md` under its own heading (`## Plan`, `## Implementation`, `## Review <N>`), ranked, most valuable first. Each item says what to add or change in the branch, its record, or its PR description, and what it would let the poster show. Look for:

- evidence the pitch needs but the record doesn't have: who hit the problem, linked issues and forum threads, a real-world example;
- screenshots that don't exist yet, or that show stale UI or raw internals;
- numbers that are claimed but not measured, or that drift between the record, the debriefs and the PR description;
- gaps in the feature or UX that come up when you try to draw it end to end;
- a PR description that would be stronger in a different order, or with the poster's images.

Model it on "Recommendations for the source work" in `vault/repositories/galaxy/branches/active/workflow_run_exposed_step_params/subagents/slides_clarity_review_1.md`.

## 1. Plan

Have an Opus (high) or Sol (high) subagent come up with the poster idea. It shouldn't implement it, but its plan should guide the implementation.

- DO find the core ideas and build a cohesive set from them: UI concepts, API concepts, developer workflow concepts, etc.
- DO put effort into a clever visual hook or metaphor to give the poster some splash.
- DO NOT make it a code architecture document. Architecture diagrams can appear, but they shouldn't be the central organizing concept.
- DO highlight implementation details where they make sense.
- DO show what existed before the branch if it strengthens the poster or makes a visual before/after.
- DO be persuasive. The goal is usually to sell the branch in a pull request.
- DO show instead of tell when possible.
- DO NOT do the work if the branch doesn't warrant it. John assigns this on purpose, but push back if there isn't a good poster here: write the reasons to `PLAN.md` under `Verdict: no poster`, and stop. The coordinator reports that to John and runs nothing else.

The planner writes `PLAN.md`, and starts `branch_recommendations.md` with the gaps it found while reading the branch.

## 2. Implement

Have an Opus (high) or Sol (high) subagent implement and refine the plan.

- If the branch name has an even number of characters, use [styles/STYLE_GALAXY_PLUS.md](styles/STYLE_GALAXY_PLUS.md); otherwise use [styles/STYLE_GALAXY.md](styles/STYLE_GALAXY.md). The style sets look only; the concept comes from the plan.
- Build it as SVG, HTML or Typst, whichever suits the plan.
- Render to `poster.png` and look at it before finishing.
- Write `SOURCES.md`: every claim, number and screenshot on the poster, with its source (commit, file path, test, URL, record note) and what the number does and doesn't measure. No claim on the poster without a source.
- Write `implementation_debrief.md`, and append to `branch_recommendations.md` what it couldn't show because the branch lacks it.

## 3. Review

Have an Opus (medium) or Sol (medium) subagent check the poster against the branch, not just against the plan.

- **Correctness.** Check every `SOURCES.md` row against the code and record at the branch head. Fix wrong claims, names that don't match the code, and stale screenshots.
- **Render.** Render it, look at the full poster and at a downscaled copy the size of a PR-description image, and check overflow, the size floors and the style guide's do and don't list.
- **Clarity and persuasion.** Can a reader get the point in ten seconds? Does it show more than it tells? Does the hook carry the argument, or just decorate it?
- Fix errors and make improvements directly. Write `review_debrief_<N>.md`, and append the ranked review recommendations to `branch_recommendations.md`.

If the reviewer made big changes (new regions, a new layout, new images), run one more review pass as `review_debrief_2.md`.

## On Finish

- Report: path to `poster.png`, format, style guide used, review passes run, and any claims in `SOURCES.md` still marked unsourced or soft.
- Summarize the top items from `branch_recommendations.md`, and offer to file them as tasks or launch a subagent to work on them, whichever fits.
- Don't edit `pr_description.md` or open PRs unless the launcher says so.
