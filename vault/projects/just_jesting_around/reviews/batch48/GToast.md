# GToast — readability batch 48

Originating file: `client/src/components/BaseComponents/GToast.test.ts`.
Base: `5838667ee6e1d2f89bf995f9eb6fab0ebabd5472`.

## Changes and assertion audit

Replaced arbitrary untyped mount options, the `as object` component cast, legacy `propsData`, and top-level router injection with a small typed host/router/realTransitions options object, native `props`, and `global: withPlugins(...)` router replacement. Retained full mounting: the close button, router integration, and actual transition leave classes are behavior under test.

All original checks remain: active modal/root visibility; warning variant/title/message; rendered toast count, close-button presence, queue removal and real leave class; accessible dismiss label; timed queue removal and real leave class; all four convenience variants/default titles/messages; clickable class and actual router navigation. Added two checks that unregistering the modal restores its toast to the root host and hides it in the modal. The host scenario name now describes that behavior.

Registered hosts are tracked for unconditional teardown even if the test fails before its explicit unregister. Every wrapper unmounts before host removal and singleton queue cleanup. Queue timers clear while the original clock remains installed; both real-transition cases use fake timers, cleared before restoring real timers, to avoid leftover animation work.

## Validation

- Baseline and final: 10 tests, no skips; final shuffled seed 480101, maxWorkers 1.
- ESLint, Prettier, diff whitespace check, and explicit canonical pre-commit configuration: passed.
- Default V8 coverage: 14 source files, no previously covered statement/function/branch location lost.
- Because default coverage omits the real UI package behind the shared dependency symlink, also ran paired baseline/final coverage with `--coverage.allowExternal` and explicit GToast/toast/toastHost includes. Real component statement/function/branch counts: 18/8/5 unchanged; toast composable: 30/10/18 unchanged; host composable: 9/3/2 → 9/3/3. No previously covered location lost. Duplicate local package paths are unexecuted in both runs; executed sources resolve to the canonical worktree package.
- Logs: `/private/tmp/readability48-toast-{baseline,final}.log`; package logs and coverage use the `readability48-toast-package-{baseline,final}` prefix. Coverage comparison JSON files use the same default/package prefixes.

## Guidance and scope

README guidance on native plugin replacement and meaningful full mounts was sufficient. Unconditional cleanup of singleton registration is a concrete missed step in the old file: `unregisterToastHost` appeared only after assertions. `ToolForm.test.ts` separately clears singleton toasts; it has no modal-host registrations. UI package toastHost tests already unregister their fixed hosts in afterEach. These consumers have different setup, so no shared helper is warranted. No production code, fixtures, shared helpers, supporting tests, or later-lane files changed; no security findings.
