# Polish debrief

Run via claude-opus-5-5 at medium effort. One strengthening round.

Applied:

- **Showed the Foundry gap instead of inferring it.** Rewired the final flagstat step in the CUT&RUN workflow to an earlier stage on a scratch copy. `gxwf validate --connections --strict` gave identical results, and the run's assertions don't tell the stages apart on kept outputs. Recorded in [the probe](probe/results.md). No branch change was needed, and the page's claim stands.
- **Fixed a claim that wasn't true yet.** The description said the lessons were in an issue comment before it was posted. The comment is now posted once the PR opens, and the description links it.
- **Answered misreadings in prominent text:** one prompt versus staged artifacts rather than agents versus no agents, no agent ranking, and what the no-run constraint implies.
- **Pre-empted an objection to "no check".** The description names the template eval, which judges a draft and not the finished workflow.
- **Softened "would otherwise have become false"** to "false or misleading", and disclosed the verification limits and Codex's full list of unchecked areas.

While checking the probe, I caught my own error: `final flagstat` also feeds MultiQC. I checked the MultiQC assertions, and the conclusion holds.

Not applied, as scope questions for John:

- Whether merging should close #568. The description has no closing keyword, matching #749.
- Whether the named gap should get a tracking issue and a link from the page.
- Whether `README.md` and `guiding-principles.md` should mention the new contrast. Low value.

Codex reviewed before the probe existed, so the probe and the description's table have had no independent review.
