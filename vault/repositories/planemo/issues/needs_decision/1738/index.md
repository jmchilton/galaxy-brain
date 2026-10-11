# Planemo #1738 — Galaxy-compatible Python defaults

[GitHub issue](https://github.com/galaxyproject/planemo/issues/1738) · [Published issue body](issue.md) · [PR #1704 review context](../../../reviews/active/1704/index.md)

Status: `needs_decision`, open and unassigned. Filed 2026-10-11 at John’s request for point 2 of [Marius’s review](https://github.com/galaxyproject/planemo/pull/1704#pullrequestreview-5478940924).

#1704 pins the default Galaxy interpreter to Python 3.14. If that interpreter exists on PATH, older `--galaxy_branch` releases or `--galaxy_root` checkouts receive it too, potentially conflicting with their pinned dependencies. This is a review-identified compatibility risk; no particular older-release installation failure was newly reproduced while filing this issue.

The already-merged [companion #13](https://github.com/jmchilton/planemo/pull/13) warns when the requested interpreter is missing and names caches after the interpreter actually used. It does not address an incompatible interpreter that is available. Existing [#1489](https://github.com/galaxyproject/planemo/issues/1489), addressed by #1704, concerns the loosely defined default; this issue tracks compatibility policy across selected Galaxy versions.

John’s next decision: choose checkout-aware selection or a fixed default with documented overrides. Before implementation, identify an authoritative compatibility source and how local/custom checkouts, missing metadata, explicit CLI/config/profile choices, absent interpreters, incompatible interpreters, and existing virtualenvs should behave. Validate the chosen policy with current and older Galaxy installation/startup evidence as well as interpreter-selection tests.

The issue is a separate design follow-up; no implementation branch is open. [October follow-up ledger](../../../../../agents/planemo/PR_FOLLOW_UPS_EARLY_OCTOBER_2026.md).
