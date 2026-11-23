<!-- profile: gx_risk_assessment; model: Claude Opus 5.5; effort: low; reviewed commit: 4c330c4ed47de5048ea172e64ec186604767c24e -->
Mostly a two-way door, but it newly documents (in `galaxy.xsd`) and enforces a tool-author contract on a release branch: regex-discovered files whose pattern yields no `designation`, `name`, or `identifier_N` value are now silently skipped with only a server log warning, rather than failing the job.

<details><summary>Risk Details</summary>

- The `ext` fallback (an unmatched optional `ext` group falls back to the collector default, then `data`) only turns a crash into the behavior a pattern without an `ext` group already gets. Low risk.
- The skip lives in `DatasetCollector.match`, which every regex-based discovery uses, not only collection population. This includes primary/data-output discovery and `assign_primary_output`. A tool whose pattern has no identifier group at all (not just an optional one) now has its matches dropped before they reach any downstream code that might have handled them.
- Users get no signal that files were skipped; the warning goes only to the server log. A tool with a buggy pattern goes from a failed job to a successful job with missing outputs or an empty collection, which is harder to notice.
- Once the XSD text ships in 26.1, the skip semantics become documented behavior that tool authors and linters may rely on, so changing it to a hard error or a lint later is harder.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should check that no supported discovery path, such as single data outputs, `assign_primary_output`, or `discover_via="tool_provided_metadata"` fallbacks, previously worked with a pattern that lacks identifier groups, because those matches are now silently skipped. They should also decide whether a release-branch fix should hard-code the "skip with a log warning" contract in the XSD, or only make the `ext` fallback change and leave the missing-identifier case to fail, or lint it, on `dev`.

</details>
