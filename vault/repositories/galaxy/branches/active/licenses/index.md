# licenses

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:licenses?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/licenses)

Adds `<license_agreement>` tool requirements (#23261) that users must accept before running tools or workflows. Base: `dev`.

## Status

Status: `branches_implemented_needs_ci`. Rebased onto `0073b5e9224`, hardened, re-scoped (modest expansion) and re-hardened; READY, head `cd37d851bb2` (21 commits; see [implementation_debrief.md](implementation_debrief.md)).

No PR opened.

Fork CI running on `cd37d851bb2`.

## Decisions pending

- gxwf `accept_license_agreements` default (opt-in now) — settle before Planemo adopts it.
- Keep `binds="user"`, per-step one-time pinning, local `Model` in `schema/license_agreements.py` (reviews lean keep).
- PR split — options in [scope_evaluation.md](scope_evaluation.md).

Alt: `licenses_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

[Tracking history](tracking_history.md)
