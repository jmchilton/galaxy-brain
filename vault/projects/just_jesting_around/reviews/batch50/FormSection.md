# FormSection — readability batch 50

Originator: `client/src/components/Workflow/Editor/Forms/FormSection.test.ts`.
Base: `15ba2c4a57710c6b0715adbda5319465cfc44cc9`.
Worker commit: `6dcd293a4f53dcc8f11a9479e49ef9d3f7c9f113`.
Ledger checked before edits: no later-lane ownership flags on this file.

## Changes and assertion audit

Removed the component `as any` cast and migrated legacy localVue/propsData to native global/props. Automatic unmount owns both component instances. Fixtures use Pick of the canonical Step identity/type and DataOutput name because this shallow child boundary does not exercise full graph-step or output models; no complete API response is claimed.

Both original cases and original exact counts remain: two job-based action controls by default and none when explicitly unsupported. Added exact visible action titles (Email notification and Output cleanup), so unrelated FormElements cannot satisfy the count silently. Shallow mounting retains the original parent capability contract while stubbing expensive child forms. There are no private-method assertions or production changes.

## Validation

- Baseline and final: 2 cases passed, no skips. Final shuffled seed 500101, maxWorkers 1, pinned Node 22.20.0; no project/NODE_OPTIONS override.
- V8 coverage: 374 source files, 643 covered statement/function/branch locations both before and after. Source-path and location-map comparison found zero lost locations. FormSection.vue retains 16/54 statements, 11/18 functions, 6/29 branch operands.
- Diff whitespace check and explicit canonical pre-commit checks (including ESLint and Prettier) passed. Root owns combined client typecheck.
- Evidence: `/private/tmp/readability50-section-{baseline,final}.log`, `/private/tmp/readability50-section-{baseline,final}-coverage/coverage-final.json`, `/private/tmp/readability50-section-coverage-comparison.json`, `/private/tmp/readability50-section-hooks.log`.

## Guidance and reuse

README native mounting and lifecycle guidance addresses both concrete gaps. Existing getLocalVue and VTU automatic unmount suffice; this suite has no replacement plugins, timers or mocks, so withPlugins and teardown-order coordination are unnecessary. No new helper or README advice is warranted. No shared/supporting/production/later-lane files were modified.
