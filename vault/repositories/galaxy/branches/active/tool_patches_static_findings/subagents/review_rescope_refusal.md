# Review: re-scope to refusal (1186a1d9990, 87fd7d9d087, 206c34d1318)

Run via Claude Opus at high effort (general-purpose subagent).

**Acted on** (in `a3ad4c935f9`): the isort order in `tools/__init__.py`; ruff UP042 (`RefusalCode` is now a `StrEnum`, a change the sibling's copy needs too); a bad severity value now raises a `ConfigurationError` at startup (`validate_static_findings_config`) instead of failing every tool load and job, and the refused-rules log moved inside the `try`; `load_tool_source` was renamed `patch_and_review_tool_source`; the module docstring is now one line; the comment says "job's info"; the docs and the config description say capability findings count; the duplicate, trivial `test_failed_review_refuses_nothing` was dropped.

**Not acted on:**
- Default `high` refuses many stock `tools/` tools (54 of 171, 49 on capability findings only). This is documented now. A kind filter (vulnerabilities only) is left to John.
- `INDEX_SCHEMA_HASH` bump discards deployed indexes on upgrade, even with the option off. That follows from adding the field. For John.
- `REVIEW_VERSION = VERSION` doesn't change between dev commits. Kept for zero maintenance. An analyser version constant, or a package hash, is the alternative. For John.
- The sibling reviews lazily at prepare, with a different exemption rule. This branch computes at load, as the task specified. Merge overlap and the lazy alternative are listed for John.
- The lib/galaxy exemption is broad (it covers the spec tools and site-packages/galaxy). It's harmless unless an admin loads them, so it's kept and recorded.
- Nits kept: `stored.source_path` vs `entry.source_path`, the freshness helper name, inlining `refused_rules` (it serves as the tool's flag).

<details><summary>Full review</summary>

Verdict: the approach is sound and works. Every tool-creation path traced reviews the patched source or carries a current stored review. The prepare check can't be bypassed (the only `JobWrapper.prepare` callers are `BaseJobRunner.prepare_job` and Pulsar, both catch `ToolInputRejected`; tasks prepare through `prepare_job`; celery `setup_fetch_data` is the exempt `__DATA_FETCH__`; job-cache hits are refused too, because the check runs first). Tests are meaningful. 238 unit tests passed in the reviewer's run.

Bugs: (1) isort on `tools/__init__.py`; (2) ruff UP042 on `codes.py`; (3) with severity `"High"`, `with_static_review` raises `ValueError` after its `try`, so every non-lib tool fails to load and every job fails with a traceback. The schema enum is not enforced at startup.

Paths: the eager store return is reviewed fresh (it runs only without patches); the parse return is patched, then reviewed; materialization uses a current entry review, else reviews the stored, patched source; the eager fallback and reload go through `create_tool`; the populator fast path requires a current review; "skipped" entries are built from the fresh review. Freshness covers the file hash, the patch token, on/off and the version. Severity is applied at prepare. Macro-only edits are an existing gap.

Message: the code comes first, then the rules, then the tool. A shed guid gets cut around character 200, which is acceptable.

Design points for John: the default refuses many stock tools mostly on capability findings; the schema hash bump; `VERSION` granularity; overlap with the sibling's lazy reviewer (about 4 ms per tool) and its `tool_type_local` exemption; the broad lib/galaxy exemption.

Nits: docstring length; the `load_tool_source` name; `refused_rules` has a single caller; the trivial, duplicate failed-review test.

Sensitive: none.

</details>
