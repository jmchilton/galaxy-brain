Profile: generic_risk_assessment, via Opus 5.5 at low effort, reviewed commit 0fe5ce4b.

The only one-way-ish risk is the changed stdout contract: the autoupdate bot (and any other scraper) parses `tool: old -> new` lines, and pre-check lines now read `tool: old (newer version new)`, so downstream consumers silently see fewer lines; otherwise this is a two-way door (no file writes are added, and skipping unchanged workflows is easy to revert).

<details><summary>Risk Details</summary>

- Output format change: `->` lines now appear only after a successful refactor; dry-run mode never prints them, so any consumer relying on `--dry_run` output for `->` lines breaks.
- Prediction narrowed to the max-`numeric_revision` installable revision; repos where the newest revision drops a tool (e.g. md_converter case) now report "no update" instead of a phantom one, which may hide genuinely available tools in older revisions.
- `latest_installable_revision` assumes every revision dict has `numeric_revision`; a Tool Shed response missing it raises `KeyError`/`ValueError` where the old code did not.
- Workflows where Galaxy made no tool change are no longer rewritten or release-bumped, and are dropped from the `--test` run set; non-tool edits `fix_workflow` used to apply alongside are skipped too.
- `updated_tools` ignores base ids absent from the original workflow and compares id sets, so a refactor that downgrades or swaps one of several same-base steps is reported as an update.

</details>

<details><summary>Risk Review Advice</summary>

Confirm with the IWC autoupdate bot owners that only post-refactor `->` lines are consumed and that dry-run output is not parsed. Reviewers should also sanity-check that trusting only the newest installable revision matches what `shed_install` actually installs (latest downloadable, non-malicious), since that equivalence is the whole premise of the fix.

</details>
