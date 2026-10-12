# Batch 53 — independent ToolForm review

Approve the final draft in `/private/tmp/galaxy-readability53-toolform`, against `f3ffc6aaa4572195229049ce2b3e7ac7a203c191`, subject to driver integration gates. No blocking correctness, maintainability, or meaningful coverage findings.

## Behavior and regression checks

The original six scenarios retain all 11 checks: tool title, two available actions, empty-input explanation, help and creator; sole recent-tool entry after execution; empty backend errors retained under internal validation; real backend errors cleared; submission error text; exact danger toast and enabled ToolCard after a rejected update. Both validation cases still emit two consecutive `onChange` events on the same FormDisplay instance. The internal-validation case retains `onValidation`. Required DOM/component access now fails immediately through `get` without weakening assertions.

Two new cases give explicit contracts to meaningful paths previously reached with inherited setup: an existing-history pending build displays loading then the actual tool title; executing a previously recent tool preserves another entry and moves the tool to the front without duplicating it. The deferred build settles in `finally`, including assertion failures. They add three checks, yielding eight cases and 14 assertions.

Independent shuffled Vitest run (Node 22.20.0, one worker, seed 530201) passed all eight cases: `/private/tmp/readability53-toolform-independent.log`. This confirms the draft under a different order from author validation; no implementation mutation was made.

## Exact coverage assessment

Independently recomputed normalized covered statement locations, function locations, and individual branch-arm locations from `/private/tmp/readability53-toolform-before/coverage-final.json` and `/private/tmp/readability53-toolform-final/coverage-final.json`. Baseline has 442 files / 2059 locations; final has 443 / 2064. Twenty locations are added and 15 removed. ToolForm retains every original covered location, with the same 150 statement, 31 function, and 90 branch-arm raw covered counters. No Tool/services location is lost.

Each removed location was inspected against source:

| Source | Removed locations | Assessment |
| --- | ---: | --- |
| HeadlessMultiselect.vue | 3 | Async options/selection watcher waits for `nextTick` then updates popup bounds. No original ToolForm case selects a tag or asserts popup positioning. |
| userTagsStore.ts | 4 | Empty-tag handling waits for database readiness, obtains the user hash, and builds/filter tag sets. No original case supplies or asserts tags. |
| utils/assertions.ts | 8 | `ensureDefined`/`assertDefined` execution associated with the deferred tag path above. No original ToolForm case tests these guards or their error behavior. |

These losses concern incidental asynchronous child/store work, consistent with replacing shared Pinia and unmounted components with owned per-scenario resources. Source inspection establishes that they do not remove the ToolForm behaviors or assertions under review; the precise timing cause was not separately instrumented. Approve these explicitly reported ancillary exceptions. Do not call unrelated production helpers or keep leaking mounts just to restore their coverage counters. The added loading and recent-tool cases protect meaningful original target paths directly.

## Strict maintainability review

One mount per scenario removes the old hidden first mount and validation-case remounts. Owned Pinia/router, shared history factory and seeding, `withPlugins`, and auto-unmount simplify setup without new exports or production branches. Components unmount before store disposal; toast cleanup runs on failure. The small build-response helper remains local and prevents duplicated request setup. Native mount options remove unsafe component/history casts while preserving real ToolCard content and the FormDisplay event seam. The deferred case has an explicit lifetime. No new layer, shared abstraction, oversized file, or arbitrary branching warrants further restructuring.

## Test challenges and scope

These checks cover client validation state, child-event handling, rendered tool metadata, execution errors, recent-tool policy, and loading. They use real stores and component logic with reusable MSW/deferred seams. API tests alone cannot observe FormDisplay's two-change state transition or disabled/rendered bindings. Browser workflows can cover feature integration, but replacing these focused cases would expand setup and obscure the same regressions. Keep the existing assertions and two targeted additions; no screenshots, production edits, or new E2E tests are needed for this test-only change. No actionable guidance gap remains beyond existing README ownership and async-operation advice.
