# gxui polish

Long-running task (John, 2026-10-09): get the `gxui` CLI and the `galaxy-ui-driver` skill
polished and done.

## Work already planned

`GALAXY_UI_SKILL_DESIGN.md` holds the work list:
- "429s and hardening plan": open items 4 (report-editor verbs), 7 (`workflow-output` timeout),
  8 (one-based step numbers), 9 (live-check `5a5b1455281`), 10 (playwright-cli session drops),
  11 (harness stall watchdog), 12 (version skew).
- "Next, in order" item 2: run the `collections` tutorial and add its EXPECTED.
- "Known gaps the first runs will hit": still unverified.
- "Open questions for John": skill home, REST during runs, retiring `drive-scenario`, test-server
  leftovers.

## Not planned yet: what "done" means

Draft criteria:
- **Coverage.** Every refinement tutorial passes in a fresh arm A run with no recorded gaps.
  `collections` is one of them.
- **Reviewable.** The gxui commit (about 4,300 lines) is read through for reuse and dead code.
  Verbs call public `NavigatesGalaxy` methods only, with nothing re-implemented in gxui.
- **Documented.** `packages/selenium/README.rst` covers install, profiles, login and the verb
  list. `gxui help` matches the skill.
- **Shippable.** The skill has a home (open question) and works against a released
  `galaxy-selenium`.

## Open questions

- Are these the right done criteria? Is anything missing, such as a token budget or a model
  matrix?
- Does the parked arm A/B comparison come back before "done", or stay parked?
- Does gxui go up as a single PR once the upstreaming PRs land, or in pieces (daemon + core verbs,
  then config/login)?
