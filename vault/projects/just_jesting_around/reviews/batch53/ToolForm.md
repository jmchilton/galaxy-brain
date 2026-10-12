# ToolForm — readability iteration 53

Origin: `client/src/components/Tool/ToolForm.test.ts`. Base: `f3ffc6aaa4572195229049ce2b3e7ac7a203c191`.

The original six scenarios and all 11 assertions remain: title, two actions, no-input message, help and creator (5); executed tool becomes the sole recent tool (1); internal validation retains empty backend errors (1); changed input clears real backend errors (1); submission error message renders (1); rejected parameter update produces the exact danger toast and re-enables ToolCard (2). Both validation scenarios retain their two consecutive `onChange` events; the internal-validation scenario also retains the `onValidation` event.

Each scenario now mounts explicitly after installing its handlers. The original setup mounted implicitly and the two validation scenarios mounted again, leaving the first component alive. Each new mount owns Pinia and a router. Auto-unmount runs before disposal, and toast state is cleared even if assertions fail. Existing `getFakeHistorySummary`, `seedCurrentHistory`, `withPlugins`, and `deferred` helpers are reused. Native `props`/`global` remove the component/object and partial-history casts. Required elements use `get`/`getComponent`; FormDisplay remains stubbed and ToolCard and its rendered content remain real. The common build handler now uses the existing local response helper rather than duplicating it.

Two additional scenarios replace meaningful behavior formerly reached through inherited state with direct checks: a pending build for a preloaded history renders `Loading Tool...` then the tool title, and executing an already recent tool moves it to the front without duplication while preserving another recent tool. There are eight final scenarios and 14 assertions. Deferred build requests are released in `finally`.

No production, helper, supporting test, dependency, or guidance files changed. No new shared abstraction is justified by this origin. No README addition is proposed: existing ownership, teardown, and deferred-operation guidance covers the identified defects.

## Validation

- Original baseline coverage completed before edits: six tests passed, seed 530101, one worker.
- Final shuffled coverage: eight tests passed, seed 530101, one worker.
- Commands: `VITE_CONFIG_NATIVE_IGNORE_WARNING=true npm_config_use_node_version=$(cat .node_version) pnpm exec vitest run src/components/Tool/ToolForm.test.ts --maxWorkers=1 --sequence.shuffle --sequence.seed=530101 --coverage --coverage.reporter=json --coverage.reportsDirectory=<before/final>`.
- Full client `pnpm run type-check` passed both before and after the added transition cases.
- Explicit canonical pre-commit config ran all applicable formatting/lint/check hooks; the initial final-format run applied Prettier formatting, followed by a clean rerun.
- Logs: `/private/tmp/readability53-toolform-before.log`, `readability53-toolform-final.log`, `readability53-toolform-final-typecheck.log`, `readability53-toolform-final-hooks.log`.

## Exact coverage comparison

Covered statement source locations, function body source locations, and individual branch-arm source locations are normalized to `/client/...` and compared as sets; executed counts alone are not used. Original 442 files / 2059 normalized locations; final 443 files / 2064 locations. There are 20 added and 15 removed locations. All original ToolForm and Tool/services locations remain covered; final ToolForm raw covered counters are 150 statements, 31 functions, and 90 branch arms.

The remaining losses are in ancillary deferred child/store work. Eliminating shared Pinia and leaked mounts plausibly changes when this work executes, but the exact timing cause was not instrumented: HeadlessMultiselect's asynchronous option/selection watcher (3 locations), userTagsStore's empty-tag handling after awaiting database readiness (4), and assertion helpers used by that handling (8). No original user-visible assertion was removed. They are explicitly reported for independent review rather than described as zero loss or recovered using unrelated production calls. Exact full comparison: `/private/tmp/readability53-toolform-coverage-comparison.json`.

Removed normalized locations:

- `/client/src/components/TagsMultiselect/HeadlessMultiselect.vue` `f` `{"end": {"column": null, "line": 261}, "start": {"column": 16, "line": 258}}`
- `/client/src/components/TagsMultiselect/HeadlessMultiselect.vue` `s` `{"end": {"column": null, "line": 259}, "start": {"column": 8, "line": 259}}`
- `/client/src/components/TagsMultiselect/HeadlessMultiselect.vue` `s` `{"end": {"column": null, "line": 260}, "start": {"column": 8, "line": 260}}`
- `/client/src/stores/userTagsStore.ts` `s` `{"end": {"column": null, "line": 107}, "start": {"column": 8, "line": 97}}`
- `/client/src/stores/userTagsStore.ts` `s` `{"end": {"column": null, "line": 91}, "start": {"column": 25, "line": 91}}`
- `/client/src/stores/userTagsStore.ts` `s` `{"end": {"column": null, "line": 92}, "start": {"column": 23, "line": 92}}`
- `/client/src/stores/userTagsStore.ts` `s` `{"end": {"column": null, "line": 95}, "start": {"column": 32, "line": 95}}`
- `/client/src/utils/assertions.ts` `b` `{"end": {"column": 31, "line": 7}, "start": {"column": 8, "line": 7}}`
- `/client/src/utils/assertions.ts` `b` `{"end": {"column": 47, "line": 7}, "start": {"column": 31, "line": 7}}`
- `/client/src/utils/assertions.ts` `b` `{"end": {}, "start": {}}`
- `/client/src/utils/assertions.ts` `f` `{"end": {"column": null, "line": 11}, "start": {"column": 100, "line": 6}}`
- `/client/src/utils/assertions.ts` `f` `{"end": {"column": null, "line": 26}, "start": {"column": 83, "line": 23}}`
- `/client/src/utils/assertions.ts` `s` `{"end": {"column": null, "line": 10}, "start": {"column": 4, "line": 7}}`
- `/client/src/utils/assertions.ts` `s` `{"end": {"column": null, "line": 24}, "start": {"column": 4, "line": 24}}`
- `/client/src/utils/assertions.ts` `s` `{"end": {"column": null, "line": 25}, "start": {"column": 4, "line": 25}}`
