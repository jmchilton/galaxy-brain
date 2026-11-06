Run via claude-opus-5-5 at medium effort.

# Normal review debrief

Acted on the corrections to the notes and description. Pin, bytes and scope were confirmed correct at `a449e174`.

Acted on:

- Copilot note said casting consumes `upstream.prompt`. No Mold or cast declares it, so the line now says so.
- "Except one" overclaimed. Added the unlabelled-output gap and the command's union rule.
- Description now says the command reads the base branch's Copilot copy, so a reader doesn't conclude Copilot policy stops reaching reviews.
- Dropped the undefined "one-pass", and the refresh procedure now moves both prompts to one commit.
- Description wording: comparison came from reading both files, Copilot blob added, "drift on 8 entries", "items 3 and 4", items 1, 2 and 5 named.

Didn't act on, left as questions for John:

- `examples/clean-passing/` and `examples/with-foundry-context/` `galaxy-workflow-pr-context.json:58` say base Copilot requirements are the ones the checklist carries, which now sits awkwardly with the recorded gap. Fixtures are test data.
- Whether to raise semver and unlabelled outputs with IWC.
- `content/meta/roadmap.md:109` describes #535's goal, so it's accurate while the issue is open.

Not rerun by the reviewer: `make test` in the real worktree, because it writes `site/dist`. The coordinator's results are in the [implementation debrief](../implementation_debrief.md).

Side effect: `npm run check:vendored` runs `pnpm install` and a build in `~/projects/repositories/galaxy-tool-util-ts` through the manifest's `build:` step. That repo's tracked tree stayed clean.

<details><summary>Details</summary>

Superset table, by Copilot section against the command:

| Copilot section | Coverage |
| --- | --- |
| Scope C6 | R9 |
| Dockstore C13-16 | R30-34 |
| Genericity C19-22 | R43-46 |
| Annotation C25-28 | R50-52 |
| Names C33-38, C49-53 | R56-57, R63-64 |
| Folder naming C56-61 | R68-73 |
| Grammar C64-76 | R77-83 |
| Changelog C87, C89, C90 | R95-96 |
| Test files C93-95 | R105-106 |
| Code Suggestions C107-111 | R117-120, R51, R58 |
| Review Comments C115-119 | R26, R44, R59, R77, R108, R110 |

Gaps: C88 against R99 (semantic versioning), C41 against R58 and R108 (unlabelled outputs). Softenings too small to record: C81 against R88, C26 against R51.

Pin: `fa25be5` is the `merge_commit_sha` of iwc#1366, 0 ahead and 489 behind IWC `main`, with parents `b54c9de` and `d7012eb`. All SHA sites agree. `b80bc92` hits in `tabular-to-collection-by-row` pin a workflow file and are correctly left alone.

</details>
