	# selenium_stories_core

Status: `branches_ready_for_final_review` (polished 2026-10-14 at `6628929522b`). Base: `dev`.

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Polish debrief](polish_debrief.md)

Writes Selenium and Playwright test screenshots as Markdown, HTML and PDF stories.

[Decomposition debrief](decomposition_debrief.md) · [Implementation debrief](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md)

Earlier: [Polish](old/polish_debrief.md) · [PR description](old/pr_description.md) · [Titles](old/pr_titles.md)

Recovered 2026-10-09. The fork has `233a2dc31e8`, rebased onto dev. The approval of `6f1f67e0cd2` (2026-10-05) has lapsed.

## TICK — 2026-10-11

Current head has a relevant package mypy failure in `tests/seleniumtests/test_selenium_test_decorator.py:25` (“Class cannot subclass …”); no promotion. Tool-framework shapefile test times out and Playwright workflow step-parameter test times out; release-script fork-master failure is separate.

## TICK — 2026-10-12

Requested failed-job reruns for the recorded unrelated failures: [run 38018966250](https://github.com/jmchilton/galaxy/actions/runs/38018966250). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.

## GOOD_MORNING — 2026-10-13

Requested failed-job reruns for diagnosed unrelated failures: [run 38018966250](https://github.com/jmchilton/galaxy/actions/runs/38018966250). All requests accepted; reruns are pending, not passing coverage.

## Decomposition — 2026-10-13

Stories now reach below the framework through tours: `gx-dump-tour` and the stock tour tests narrate into stories, and galaxy-test-selenium has its own package suite. Head `69ff23fbe68`. Includes a fix for galaxy-test-base's module-level `galaxy.celery` import, which can be split into its own PR. See the [decomposition debrief](decomposition_debrief.md).


## Review follow-ups — 2026-10-14

Applied all four findings: real tour-loop coverage, clean stale-highlight exception context, CLI write failure propagation, and partial stories on Ctrl-C. Follow-up review found no new blocking issues. See [implementation and review evidence](review_followups_2026-10-14.md).

## TICK — 2026-10-14

Fork head 593434f661e639c59bad167038531f2d8e700aa0 has passing browser, unit and Python lint checks. Package run 38538152875 logs successful story artifact/state tests and all nine selenium-test-decorator tests; its only failures are later collection errors importing removed pulsar.client.build_client_manager, unrelated to stories. Promoted to branches_implemented and reran failed package jobs. No polish or PR approval inferred.

## Polish — 2026-10-14

Rebased onto dev and polished to `6628929522b`. CI on that head was queued at hand-off. The CSS move is now a pure rename, and its `MANIFEST.in` entry moved to galaxy-util. A failed test's story names its exception and error directory, and `gx-dump-tour` says where a partial story went. Live Playwright runs of `gx-dump-tour core.history` and `test_run_apply_rules_tutorial` wrote stories, and a real `story.pdf` rendered. Waiting for John's read-through. Open questions: split out the celery import fix, and keep the stale-highlight fix. See the [polish debrief](polish_debrief.md).
