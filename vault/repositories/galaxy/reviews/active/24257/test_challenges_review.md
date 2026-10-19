# Test challenges review — PR #24257

Profile: gx_test_challenger. Model: Claude Opus 5.5. Effort: low. Reviewed commit: d48fe03e0e7.

Tests are proportionate and DB-backed; the new parametrized test is a genuine reproducer and the edits to existing "at limit" tests follow from the self-exclusion change rather than weakening assertions. No P1/P2. Details in [test_challenges_debrief.md](test_challenges_debrief.md).

### P3 1: Pin the mixed resubmitted/non-resubmitted case

`other_jobs` only lets resubmitted jobs skip *higher-id resubmitted* jobs; non-resubmitted queued/running jobs still count. No test covers a resubmitted job alongside a queued non-resubmitted job at limit (should be refused). Suggest one extra case in `test_queue_limit.py`, e.g. one `queued` job + one `resubmitted` job at limit 1 → resubmitted returns False.

### P3 2: Simplify parametrization helpers

The five `set_*_limit` one-liner functions could be a `pytest.param((attr, key), id="registered_user")` table, giving readable ids and less boilerplate. Nit.
