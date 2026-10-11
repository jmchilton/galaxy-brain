# Planemo #1739 — Configuration linting from Click definitions

[GitHub issue](https://github.com/galaxyproject/planemo/issues/1739) · [Research](research_2026-10-11.md) · [Published issue body](issue.md) · [Reproduction script](probe.py)

Status: `needs_decision`, open and unassigned. Filed 2026-10-11 after John requested research into reusing CLI validation for configuration files, prompted by the Python-choice finding on [#1704](https://github.com/galaxyproject/planemo/pull/1704).

The specific type-conversion gap already has [#1667](https://github.com/galaxyproject/planemo/issues/1667) and [#1714](https://github.com/galaxyproject/planemo/pull/1714). That PR provides standard Click type conversion for global defaults and profiles; combining it with #1704’s choice list rejects `3` from CLI, global config, and profiles. A separate issue is justified for whole-file structure/key validation, an explicit offline lint entry point, and a clear pure-validation contract for profile callbacks. Avoid duplicating #1714 or maintaining a second list of option constraints.

John’s next decision: settle the validation/lint scope, unknown-key strictness, and whether to retain the shared conversion helper or move effective-option sourcing ahead of Click’s normal pipeline. Keep supported aliases, nested settings, profile-only keys, precedence, source diagnostics, and offline operation in the design. No implementation branch is open.

[October follow-up ledger](../../../../../agents/planemo/PR_FOLLOW_UPS_EARLY_OCTOBER_2026.md) · [#1704 review](../../../reviews/active/1704/index.md) · [#1714 review](../../../reviews/active/1714/index.md)
