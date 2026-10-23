# Re-scope debrief

First hardening pass (rebase onto `0073b5e9224`, test challenges, E2E polish, Codex, thermo-nuclear, baseline refactor, typed `UnmetPrecondition` details) ended with a scope evaluation recommending a **modest expansion** — close gaps in touched code (items a–h). Those debriefs are now in `earlier_drafts/2/`.

- Pre-expansion head saved as `licenses_alt_original_scope` (`29171b3c054`), see [alts/original_scope.md](alts/original_scope.md).
- Expansion implemented: [subagents/rescope_implementation.md](subagents/rescope_implementation.md). Head `30246b37ef6`, 19 commits (new: "Accept license agreements in workflow framework tests").
  - (a) workflow agreement discovery honors tool access; (b) `/api/datatypes/converters` uses `Registry.offered_datatype_converters()`; (c) 403009 API test in commit 2; (d) missing-tools no-history test in commit 4; (e) creation-bound rerun/remap/resubmit/resume contract tests; (f) `when=false` preflight test; (g) gxwf runner `accept_license_agreements` opt-in + fixture; (h) pgcleanup/GDPR tests on PostgreSQL.
  - Real defect found: an 80-char unique constraint name broke PostgreSQL (63-char limit); renamed in model + migration.
- Normal review: [subagents/rescope_review.md](subagents/rescope_review.md). No bugs; reused `TOOL_ACCESS_PRECONDITION` in discovery, replaced hand-rolled sleep loops with `wait_on`. Head `b3a9b588a60`.

Open decisions carried forward:
- gxwf `accept_license_agreements` defaults False (opt-in) whereas tool tests auto-accept; flipping it changes Planemo's follow-up.
- Dropping `binds="user"` (scope eval contraction option) — not done; issue thread chose both scopes.
- `galaxy/schema/license_agreements.py` local `Model` copy vs moving models into `schema.py` (see [subagents/typed_precondition_details.md](subagents/typed_precondition_details.md)).

Next: re-harden.
