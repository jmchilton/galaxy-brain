# BarChart — batch70

Originator `f258eea51022883514a6e8e20849b357dc5aad96`, pinned base `e18fb0be8360e47ed3e682eddf0192d3589f5bf5`.

All15 original cases/20 checks remain, with exact data, zero-value empty state, explicit new-view emissions, legend order/text/style checks, selection-disabled call observation and selection-info presence checks. Original per-case await order is retained. Native component props replace the duplicate interface/object assertion, required targets use get/getComponent, and canonical nth replaces the mock palette's unchecked index. The intentionally partial Vega view mock retains its original operations and fallback behavior; its unused input array now accepts unknown rather than any.

The existing mount helper now installs and owns its actual testing Pinia through canonical withPlugins. Completion disposes that instance after automatic unmount. Each case starts with clean mock call history and an empty default view; the seven original explicit data-view arrangements remain unchanged. Cleanup flushes pending mock embed work while mounted, then unmount finalizes the view before disposal. This also covers synchronous cases and failed assertions without changing assertion timing or production cleanup.

Pristine/final Node22.20 shuffled700101 pass15 cases. Native V8 comparison144files380→384 covered statement/function/branch-arm locations, zero loss; four gains are VegaWrapper's actual unmount/finalize path. Supplemental external shared UI26files13 locations is exact; those are import/setup locations, since this suite's present scenarios do not render GAlert or the selected-data GCard. Actual BCard/VegaWrapper integration remains mounted. No production, support or later-lane edit.

Native ESLint/Prettier and absolute sample hooks passed before the originator commit. Driver owns final integrated types. Evidence: /private/tmp/readability70-chart-{before,after}/coverage-final.json and corresponding -ui reports, run logs and -eslint/-prettier/-hooks.log. Current guidance covers native plugin ownership, canonical helper reuse and pending lifecycle cleanup; no new evidenced guidance gap.
