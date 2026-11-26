# Re-scope debrief (second re-scope: refuse tools with remaining findings)

John split the work into four branches. This one became branch 4: static review, tool patches, and refusal of tools that keep static findings after patching. The report-only head `9fc1faf4440` is kept as the alt `tool_patches_static_findings_alt_report_only` (`alts/report_only.md`). The coordinator then rebased the branch onto the squashed parent `d4e4f68dd25`; its tree is identical to `d4ae281e442`. This branch's own work is now `a62581cfdd0..HEAD`.

## Commits added

- `1186a1d9990`: `galaxy.tool_util.security.refusal.StaticReview`, the worst severity per rule plus the reviewing Galaxy version. `refused_rules(threshold)` is the decision. `charsets.at_or_above` is shared with `FailOn.met` (`--fail-on <severity>`).
- `87fd7d9d087`: `RefusalCode`, ported from `tool_security_review_spec@d5f7cb05e91`, plus `static-findings`.
- `206c34d1318`:
  - `galaxy.tools.security_review` holds the ported `ToolInputRejected`, plus `with_static_review`, `patch_and_review_tool_source`, `static_review_is_current` and `check_static_findings`.
  - It is wired into `ToolBox.get_expanded_tool_source` (both returns), the populator's `process_tool` (stored on `ToolIndexEntry.static_review`), its carry-forward check and the freshness token, `CachedToolBox._create_tool_from_stored_source` (falling back to a fresh review) and `Tool.parse`.
  - `JobWrapper.prepare` refuses. The base runner and Pulsar fail the job like `InsufficientPermissionsException`, with no traceback.
  - Adds config, docs and tests.
- `a3ad4c935f9`: fixes from the review (`subagents/review_rescope_refusal.md`).

## Decisions

- **Compute at load on the patched source.** `review_tool_source(patched)` is `PatchReview.after`. `review_patches()` itself is not called at load: it would re-apply patches, double-counting patch states and logs, and run the analyser twice. Lowered findings refuse at their new severity automatically.
- **Severity-free storage.** The threshold is applied at prepare, so changing it needs no re-review.
- **Config.** `tool_security_refuse_static_findings` (bool, default off) and `tool_security_refuse_static_findings_severity` (`critical`/`high`/`medium`/`low`, default `high`), validated at startup.
- **What doesn't refuse.** Uncheckable codes, unchecked locations and a failed review (logged) refuse nothing, and there is no option to make them refuse. The legacy `upload1` carries `uncheckable-template-code`, so such an option would be a footgun.
- **Exempt.** Tools under `lib/galaxy` (`set_metadata_tool.xml` would otherwise be refused over a server-set hidden param), and dynamic tools, which don't load from a tool file.
- **Freshness.** The stored review records `galaxy.version.VERSION`. When refusal is on, the carry-forward, materialization and `tool_confs_token` require it. `INDEX_SCHEMA_HASH` is bumped.
- **Flag on the tool.** `Tool.static_review`, with `refused_rules(tool, config)`. Nothing is exposed in the API or UI.
- **Refusal shape.** `[static-findings] This job was not run: the security review of this tool reports <rules>, and this Galaxy server does not run such tools. Please contact the administrators of this server. Tool '<name>' (<id> version <v>).`
  - Deviation from the pin: `RefusalCode` is a `StrEnum` (ruff UP042), and branch 3 needs the same change.
  - The runner catch joins the existing tuples rather than the pin's separate `except`.

## Tests

- Unit, red first:
  - decision (`test_refusal.py`);
  - load and prepare (`test_static_findings_refusal.py`);
  - populator: review kept, off, toggled, stale version, token (`TestStaticReview`);
  - eager toolbox parse and store returns;
  - materialization with a current, missing or stale entry review.
- Integration (`test_tool_static_findings_refusal.py`): a refused tool that still loads, a tool patched clean that runs, and a lowered-but-above-threshold awk tool that is refused. All run under both the eager and the cached toolbox: 6 passed, and the job-prep check removed gives red.
- Existing `test_tool_patches.py`: 12 passed.
- About 1,820 related unit tests pass.

## Still open

- The pending `lowered` reporting expansion, and the flag name `uncleared`, are untouched.
