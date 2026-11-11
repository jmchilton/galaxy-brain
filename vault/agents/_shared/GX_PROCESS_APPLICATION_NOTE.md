# Writing an Application Note for a Branch

Given a Galaxy branch record (BRANCH_RECORD) and its worktree, write an application note: a short, real piece of science (or, for a developer feature, a technical use case) that the branch enables or makes noticeably better, run on a Galaxy with the branch checked out.

| File in BRANCH_RECORD | Written by | Holds |
|---|---|---|
| `applications.md` | 1. brainstorm | candidate applications, ranked |
| `application_<shortname>_preparation.md` | 2. prepare | the chosen application, the Galaxy setup, what was verified through the API |
| `application_<shortname>_note.md` | 3. note, 4. review | the note |
| `screenshots/application_<shortname>_*.png` | 3. note, 4. review | captures for the note (gitignored, like other branch screenshots) |

Read [PITCH_ADVICE.md](PITCH_ADVICE.md) and [SHOW_ME_RULES.md](SHOW_ME_RULES.md) and pass them to subagents 3 and 4.

## 1. Brainstorm

Have an Opus (high) subagent list possible applications in `applications.md`: scientific ones, or technical ones if the branch is a developer feature.

- Search IWC (`~/projects/repositories/iwc`) and the Galaxy Training Network (`~/projects/repositories/training-material`); pull both first. Each candidate should be related to something already out there but not the same, and say what it's near and how it differs.
- Aim for science that's impressive and that highlights the branch's features, not one that merely runs on it.
- Rank them, and note for each the tools, workflows and data it needs, and whether those are public and small enough to run locally.

## 2. Prepare

Have an Opus (high) subagent pick one, give it a `<shortname>`, and get a Galaxy ready for it. Be methodical.

- Start Galaxy from the branch worktree per the `/drive-scenario` skill's preconditions and config: no test-tools mode. Use a free port; don't stop other agents' servers.
- Install the tools and workflows the application needs; build the install YAML with `/tool-install-yaml`.
- Run each required tool on this machine, then take the application as far as the API allows: upload data, run the workflow or tools, check outputs.
- Don't run Playwright or touch the UI; that's step 3's job.
- Write `application_<shortname>_preparation.md`: why this candidate, how to start and reach the server (port, config, API key), what's installed, what ran and what it produced, and anything that isn't ready. Leave the server running for step 3.

## 3. Note

Have an Opus (high) subagent run the application and write `application_<shortname>_note.md`. If the branch has a UI component, exercise it in the browser via `/drive-scenario` and capture screenshots; otherwise run it through the API.

The note tells a concise, interesting scientific story and shows how the feature helped or enabled it. Every number and result in it comes from the run.

## 4. Review

Have an Opus (high) subagent review the note against the branch and the run, and strengthen it.

- If the note would be stronger with a change to the feature, or a small expansion of scope, make it on the branch and commit it per [GX_DEVELOPMENT.md](GX_DEVELOPMENT.md). Keep it small; anything larger goes to John as an offer.
- Rewrite the note, rerun steps and regenerate screenshots to match.
- Add an application section to `pr_description.md`, and swap in any note screenshots that beat the ones it already has.

## On Finish

- Report the chosen application, the note's path, branch commits the review made, and anything that didn't run.
- Stop any Galaxy server this process started.
