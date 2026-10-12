# activity_settings_availability — polish debrief

Polished on 2026-10-11. Final head `ab57bd6901dc429f5b189837128456313a309b67`, based on `dev` at `3347e84bc5e9c7fba4a800503336a9da1f343bea`. Ready for John's final review; the human-read checkbox remains unchecked. No PR opened or GitHub comments posted.

## Restack and scope

Parent [#23921](https://github.com/galaxyproject/galaxy/pull/23921) merged on 2026-10-09. Replayed only the settings follow-up from old head `6c0307b4b35` onto current dev, without conflicts, yielding `75120e401b0d`. Added test commit `ab57bd6901d`. Final diff is two files: 104 insertions, 5 deletions. The settings filter requires `optional` and the existing shared availability helper. Upload/Tools stay available in the activity bar. No new availability rules, workflow behavior, APIs, persisted formats or migrations.

## CI triage

Live prior-head CI checked before polish:

- [Client Unit Testing](https://github.com/jmchilton/galaxy/actions/runs/37323495085) and [Client linting](https://github.com/jmchilton/galaxy/actions/runs/37323495084): green.
- [Selenium](https://github.com/jmchilton/galaxy/actions/runs/37323495954), [Integration Selenium](https://github.com/jmchilton/galaxy/actions/runs/37323495854) and [Tool Shed](https://github.com/jmchilton/galaxy/actions/runs/37323495195): green.
- [Playwright](https://github.com/jmchilton/galaxy/actions/runs/37323495681), attempt 2, all three shards, and [first startup](https://github.com/jmchilton/galaxy/actions/runs/37323495845), Python 3.10/3.14: failed restoring `galaxy-static-6c0307b4b35...` client cache with `fail-on-cache-miss`; tests never ran. These are cache/infrastructure failures, not activity assertions.
- [macOS startup](https://github.com/jmchilton/galaxy/actions/runs/37323495831): dependency install got HTTP 503 from wheels.galaxyproject.org for cwltest, then startup reported missing boltons. Unrelated to the client settings change.

Fresh fork CI is queued on the polished SHA: [client tests](https://github.com/jmchilton/galaxy/actions/runs/38154055918), [client lint](https://github.com/jmchilton/galaxy/actions/runs/38154055828), [Playwright](https://github.com/jmchilton/galaxy/actions/runs/38154056268) and [integration Selenium](https://github.com/jmchilton/galaxy/actions/runs/38154056229). Earlier green checks are historical, not checks of the new SHA.

## Checklist and strengthening

A fresh checklist reviewer evaluated all applicable General items and found no blockers. The workflow checklist does not apply. [Checklist evidence](checklist_review.md).

One fresh strengthening round proposed two scoped tasks, both applied: mounted reactive configuration/permission tests and a highlighted scope sentence making clear that Upload/Tools remain in the activity bar. No production defect or broader work was identified. The checklist reviewer rechecked the changed test item and found no blockers.

The new tests cover null configuration arriving, independent Interactive Tools/GalaxyAI feature flags, Custom Tools permission false → true → false, unchanged saved visibility, and always-on activities remaining excluded. The PR description leads with a before/after table, identifies the merged parent, and explains the reversible risk. No screenshot review or fresh E2E run is claimed.

## Validation

- Refreshed client dependencies using `pnpm install --frozen-lockfile`; tracked dependency files unchanged.
- `NODE_OPTIONS=--no-experimental-webstorage pnpm exec vitest run src/components/ActivityBar src/stores/activitySetup.test.ts src/components/CommandPalette/providers/navigation.test.ts`: 36/36 across five files.
- `pnpm exec vue-tsc --noEmit`: passed on the restacked production code; the later strengthening change is test-only JavaScript.
- eslint, prettier, diff whitespace checks and commit hooks: passed.
- Base comparison: temporarily replaced only the component with current dev, preserving the branch tests and restoring the original in `finally`. Exactly two original regressions failed at the bug's assertions (`to not include Upload`, `to not include Interactive Tools`); six existing tests passed. An initial comparison omitted the Node 25 storage flag and failed during setup; discarded it and repeated with the flag before claiming regression evidence.
- galaxy-brain `make validate`: 122 files, 0 errors, 15 existing advisory warnings.

## Handoff

[PR description](pr_description.md) and [four title options](pr_titles.md) are ready. Human read-through and new-head CI remain outstanding. The branch is ready for final review; approval is not inferred.
