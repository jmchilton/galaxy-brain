# Embedded Galaxy in Planemo

Planning material for an opt-in Planemo engine that runs a package-installed Galaxy in the Planemo process.

## Start here

1. [`PLAN.md`](PLAN.md) is the canonical implementation handoff. It contains the settled architecture, work order, and acceptance tests.
2. [`UPSTREAM_23360_REVIEW.md`](UPSTREAM_23360_REVIEW.md) records what Galaxy [PR #23360](https://github.com/galaxyproject/galaxy/pull/23360) provides and what must be fixed or released before Planemo can depend on it.
3. [`RESEARCH_RESOLUTIONS.md`](RESEARCH_RESOLUTIONS.md) answers the questions embedded in the original notes and explains decisions that would otherwise look arbitrary.

The other Markdown files are retained as deep research. They predate the reconciliation on 2026-08-24 and contain superseded proposals, notably Celery-off, `use_metadata_binary: true`, a CWD-relative AMQP default, and a custom SIGINT handler. Do not use their open-question sections as the implementation backlog.

## Current gate

The Planemo work can be prototyped against wheels built from Galaxy PR #23360. A released extra must wait for the first Galaxy package release that contains that PR, and the dependency floor must name that release rather than the broader `>=26.1` range used in the early notes. Checkout-free behavior will be proven by Planemo's real embedded-engine integrations, not by restoring #23350's heavily mocked package smoke test.
