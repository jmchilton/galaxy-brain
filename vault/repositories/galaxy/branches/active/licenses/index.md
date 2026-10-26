# licenses

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:licenses?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/licenses)

Adds `<license_agreement>` tool requirements (#23261) that users must accept before running tools or workflows. Base: `dev`.

## Status

Status: `branches_ready_for_final_review`. Polished and independently reviewed at `b5cfab9adcd` on `dev` `c93175dc985`, awaiting John's read-through.

No PR opened.

Fork CI queued on `b5cfab9adcd`. The original unit/package failure was repaired and verified locally.

## Final review

- [PR description](pr_description.md)
- [Title options](pr_titles.md)
- [Recommended labels](pr_tags.md)
- [Polish debrief and verification](polish_debrief.md)
- [Checklist review](subagents/polish_checklist.md) and [strengthening review](subagents/polish_strengthening.md)
- [Implementation slides](https://jmchilton.net/slides/licenses) and [slides debrief](slides_debrief.md)

## Decisions pending

- gxwf `accept_license_agreements` default (opt-in now) — settle before Planemo adopts it.
- Keep `binds="user"`, per-step one-time pinning, local `Model` in `schema/license_agreements.py` (reviews lean keep).
- PR split — options in [scope_evaluation.md](scope_evaluation.md).

Alt: `licenses_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

[Tracking history](tracking_history.md)
