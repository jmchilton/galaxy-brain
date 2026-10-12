# ToolHelpRst — readability batch 60

All two original cases and two assertions remain. The first still checks the complete formatted HTML fragment, including heading demotion, nested bold markup, preserved heading attributes, paragraph/span content, and blank-target links. The second still checks the exact formatted external link and the links sanitizer profile.

Both mounts now use native props/global options. Required help lookup uses get. The first scenario name describes its formatting contract instead of “modifies help text.” Automatic unmount owns both wrappers, and shared sanitizeHtml call history is cleared before each scenario and after unmount. Clearing retains the canonical pass-through implementation; this suite never replaces it, so implementation restoration is unnecessary. No new helper or mocking layer is introduced.

Pristine/final shuffled seed 600101 runs pass two cases. Covered-source-location comparison retains all 75 covered statement/function/branch-arm locations across 16 files, with zero lost or added. File ESLint/Prettier and explicit absolute-config repository pre-commit gates passed. Evidence: `/private/tmp/readability60-help-before.log`, `/private/tmp/readability60-help-after.log`, `/private/tmp/readability60-help-hooks.log`, and matching before/after coverage directories. This JavaScript-only originator introduces no new type declarations; the driver owns the integrated client type check.

No production, shared helper, supporting-test, dependency, or README changes. Current README cleanup ordering and native mount guidance already covers the change; no evidenced guidance gap proposed.
