# ConfirmDialog — batch 57 author review

Originator: `client/src/components/ConfirmDialog.test.ts`.
Worker commit: `ebe1f523b6bd762b3dc02ee3ffa6c5dc187d0134`.

All six original scenarios and eight assertions remain: OK true, Cancel false, dismissed null, all three custom message/title/button strings, first concurrent request false, and abort false. Required controls now use `get()`. Rendering still reads the complete dialog text, preserving each original assertion's scope.

A local mount factory creates an owned host per scenario and mounts the real component with inferred types. The service ref accepts `wrapper.vm` directly, removing both the component-to-object cast and the double cast on its exposed instance. Setup is visible in each scenario. VTU auto-unmount runs before shared ref reset and owned-host removal; cleanup does not erase other tests' body contents. The rendering case now closes its dialog and awaits its pending service request after the original checks.

Validation: six shuffled cases pass with seed 570101; full `vue-tsc --noEmit`, file ESLint, Prettier, and explicit repository pre-commit gates pass. Default pristine/final V8 coverage has exactly eight files and 76 covered statement/function/branch-arm locations, with zero lost or added. An additional pristine/final pair explicitly includes the actual shared GModal/GAlert/GButton implementations despite their dependency symlink: 428 covered locations also match exactly. Its broad include reports 1,934 files, mostly uncovered; comparison uses covered locations only. Evidence is in `/private/tmp/readability57-confirm-{before,after}*` and the corresponding typecheck/hooks logs.

No production, shared helper, dependency, README, or supporting-test edits. Existing guidance on public behavior and teardown order suffices; no new general advice proposed. Accessing `vm` solely to register the required public exposed service boundary is appropriate and now checked by the compiler.
