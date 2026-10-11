# selenium_stories_core

Status: `branches_implemented_needs_ci`. Base: `dev`.

Writes Selenium and Playwright test screenshots as Markdown, HTML and PDF stories.

[Implementation debrief](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md)

Earlier: [Polish](old/polish_debrief.md) · [PR description](old/pr_description.md) · [Titles](old/pr_titles.md)

Recovered 2026-10-09. The fork has `233a2dc31e8`, rebased onto dev. The approval of `6f1f67e0cd2` (2026-10-05) has lapsed.

## TICK — 2026-10-11

Current head has a relevant package mypy failure in `tests/seleniumtests/test_selenium_test_decorator.py:25` (“Class cannot subclass …”); no promotion. Tool-framework shapefile test times out and Playwright workflow step-parameter test times out; release-script fork-master failure is separate.
