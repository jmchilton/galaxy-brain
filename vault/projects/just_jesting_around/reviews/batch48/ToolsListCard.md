# ToolsListCard readability worker — batch 48

Originator: `client/src/components/ToolsList/ToolsListCard.test.ts`.
Base: `5838667ee6e1d2f89bf995f9eb6fab0ebabd5472`.
Worker commit: `4d317eaf3f82f43cc02ec27faf449a866cde90ee`.

## Changes and assertion audit

All ten cases remain. All 23 original `expect` call sites remain, with three additional guards: the keyboard trigger has an `aria-describedby` reference, that reference resolves to a popover, and both favorite-tag controls exist before interaction. Required DOM queries use `get`, and indexed tags/buttons no longer use optional chaining that could skip the intended interaction. Markdown rendering, button naming, focused-popover persistence, exact tag-filter emission, tag/operation/topic favorite dispatch, all six anonymous affordance attributes, spaced tool IDs, and the sanitizer profile/rendered markup assertions retain their original values.

The mount helper accepts actual component props and the user store's favorites type, uses native `props` and `global: withPlugins(...)`, and returns its own user store alongside its wrapper. The spaced-ID scenario reuses this helper while keeping all changed domain inputs visible. The action composable mock and explicit setup-store action spies remain scoped to this file.

Every wrapper now unmounts through `enableAutoUnmount(afterEach)` before host cleanup and spy restoration. The one attached host is removed by reference; the previous `document.body.innerHTML = ""` was removed. GPopover's existing `onBeforeUnmount` removes its own relocated element and listeners, so no unrelated DOM is deleted and failed assertions still trigger cleanup. Full mount is retained because these cases exercise real child help rendering, sanitization, popover focus behavior, tag links, and favorite buttons; shallow child stubs would remove the tested contracts.

## Validation

- Pinned Node 22.20.0; no `--project` or `NODE_OPTIONS`.
- Baseline: 10/10 cases passed with coverage.
- Final: 10/10 cases passed with coverage and shuffled seed `480101`, `--maxWorkers=1`.
- Baseline/final coverage each includes 169 source files. Every previously covered statement, function, and branch location remains covered; compared normalized source paths and source location maps, not just totals.
- ToolsListCard itself retains 112 covered statements, 47 covered functions, and 83 covered branch arms.
- ESLint, Prettier check, canonical explicit pre-commit, and `git diff --check` passed.
- Pre-existing GCard Vue migration warnings appear in both runs; no test errors.
- Root will perform the combined batch typecheck and review.

Evidence: `/private/tmp/readability48-tools-baseline.log`, `/private/tmp/readability48-tools-final.log`, `/private/tmp/readability48-tools-{baseline,final}-coverage/coverage-final.json`, `/private/tmp/readability48-tools-coverage-comparison.json`, `/private/tmp/readability48-tools-precommit.log`.

## Guidance and reuse

The existing README guidance already covers native plugins, reusable domain setup, and behavior assertions, and `withPlugins`/`enableAutoUnmount` solve the concrete gaps. No new shared helper or documentation is warranted for this single owned host. Neighboring `BaseComponents/GPopover.test.ts` and `GTooltip.test.ts` also create body targets and contain whole-body cleanup, but they test their own complex fixture DOM; this batch does not modify those downstream/supporting files. Their cleanup patterns are evidence for a possible separate audit, not justification to generalize this one-host arrangement.
