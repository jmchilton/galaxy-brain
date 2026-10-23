# Implementation debrief: licenses (hardening, 2026-10-22/23)

**STATUS: READY.** Head `cd37d851bb2` on `jmchilton/licenses`, 21 commits on `dev` `0073b5e9224`. Final scope evaluation: keep as implemented. Fork CI running.

## What happened

1. **Rebase** ([rebase_debrief.md](rebase_debrief.md)) from `b9f94242617` (~2.7k behind) onto `0073b5e9224`. Profile gate moved 26.2 → 27.0 (`release_26.2` cut); Vue 3 port of the license UI; schemas regenerated per commit. Old head on `licenses_pre_rebase_backup`.
2. **First hardening pass** (archived in `earlier_drafts/2/`): test challenges, E2E polish, Codex (fixed FOLLOW_UPS #1 mixed-binds dedupe, #2 DOM ids, empty history on refused invocation), thermo-nuclear (unified refusal payload on `describe()`), baseline refactor (commits 3–4 split out). Scope evaluation → modest expansion.
3. **Typed `UnmetPrecondition`** (John's request): discriminated union on `kind` ([subagents/typed_precondition_details.md](subagents/typed_precondition_details.md)).
4. **Re-scope** ([implementation_rescope_debrief.md](implementation_rescope_debrief.md)): discovery access check, converter listing filter, 403009 + missing-tools tests, creation-bound/`when=false` contract tests, gxwf `accept_license_agreements` opt-in, PostgreSQL purge tests. Found and fixed an 80-char constraint name that broke PostgreSQL. Pre-expansion head is `licenses_alt_original_scope`.
5. **Re-harden pass** (current debriefs): [test_challenges_debrief.md](test_challenges_debrief.md), [polish_e2e_tests_debrief.md](polish_e2e_tests_debrief.md) (celery on, async path exercised), [codex_review.md](codex_review.md) (fixed per-step run-form terms leak and missing terms file in externally referenced paths), [thermo_nuclear_review.md](thermo_nuclear_review.md), [baseline_refactor.md](baseline_refactor.md) (commits 5–6: `parsed_tool` whitespace, converter cache reset — with red-to-green tests), [scope_evaluation.md](scope_evaluation.md) (keep), [screenshot_debrief.md](screenshot_debrief.md) (10 screenshots; compact refusal dialog; editor ToolCard notice E2E).

## Commit layout

1–6 pre-feature: baseline tests, precondition extraction (403009), `walk_tool_steps`, missing-tools-before-history fix, `parsed_tool` whitespace fix, converter cache fix. 7–21 feature: parsing → models/migration → manager → API → job/workflow enforcement → UI → indirect paths → converters → gxwf → docs.

## Validation (latest runs, per step)

Unit 369 passed; `make mypy` clean; lint clean; vitest 302; API 18; integration 18 + 17; framework workflows 2+2 (both rerun modes); pgcleanup 12 on PostgreSQL (rescope pass); 17 license E2E pass under Playwright and Selenium. Full suites left to CI.

## Decisions for John

- gxwf `accept_license_agreements` default False (opt-in) vs True like tool tests — settle before Planemo.
- `binds="user"`: kept (issue chose both; needed for MCP/agent runs). Scope eval lists dropping it as the only real contraction.
- Per-step vs whole-tree one-time pinning: kept per-step.
- Local `Model` copy in `galaxy/schema/license_agreements.py` vs moving models into `schema.py`: kept.
- Tool refusals now return full agreement records (`terms`, `accepted`), same as workflow refusals.
- PR split: options in scope_evaluation.md (commits 1–6 are separable).

## Follow-ups (not in branch)

- `pgcleanup.py` exits 0 on SQL errors — standalone fix.
- Fold duplicated client "accept remembered, then submit" try/catch into `useLicenseAgreementAffirmations`.
- Planemo one-time acceptance support; tools-iuc wrapper pilot.
- #23261 body still says profile 26.2.
- Unrelated: tool panel `id:<tool>` search not filtering after re-login.
