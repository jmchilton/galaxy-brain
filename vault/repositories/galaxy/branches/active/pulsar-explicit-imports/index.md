# pulsar-explicit-imports

Status: `branches_implemented_needs_ci`. Base: `dev`. Existing [PR #23898](https://github.com/galaxyproject/galaxy/pull/23898) remains a draft.

[Implementation debrief](implementation_debrief.md) · [incremental review](../../../reviews/active/23898/release-pin-review-2026-10-11.md)

[John’s branch](https://github.com/jmchilton/galaxy/tree/pulsar-explicit-imports) and [PR branch](https://github.com/mvdbeek/galaxy/tree/pulsar-explicit-imports) are at `d2a95eff002f6ca9cb4c7040303dceea64029438`.

The migration now uses published Pulsar 0.16.0 and has no temporary source-build settings. Merged current dev, resolving only the runner-test imports and preserving both parents’ tests. All 33 focused runner tests pass with the PyPI wheel. The PR is mergeable and fresh GitHub Actions checks are queued; no current-head CI result is claimed.
