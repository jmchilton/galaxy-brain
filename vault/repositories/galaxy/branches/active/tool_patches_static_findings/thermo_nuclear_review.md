Run via Claude Opus at high effort.

# Thermo-nuclear review: static findings refusal (`817454ed1e8..65194bb4453`)

Verdict: the design is sound and small (`security_review.py` is about 110 lines; the wiring is a line or two at each site). There is no structural regression and no file crosses 1k lines because of this round. Three cuts were worth making, and all three are in `e0e05449bfe`. The docs rewrap is `538ef35c060`; `fb189f06a5b` pins the severity list to the schema enum.

**Acted on**
- **Freshness branch moved out of `CachedToolBox`.** `_create_tool_from_stored_source` had an if/else: reuse the entry's review when current, else review. That was feature logic in a 2,157-line file (2,153 now). `with_static_review` now takes `kept=`, so the cached site is one call and the "current" rule lives only in `security_review`.
- **Nullable mode removed.** `expected_review_version(config, path) -> str | None` mixed "is this tool reviewed" with "which version". The freshness token called it with `path=None` to mean "skip the exemption". It is now a `reviews_tool(config, path)` predicate, and `static_review_is_current` checks `REVIEW_VERSION` explicitly. `tool_confs_token` reads the option and `REVIEW_VERSION` directly, and its bytes are unchanged.
- **Thin helpers folded.** `refused_rules(tool, config)` had one caller and shared a name with `StaticReview.refused_rules`. `static_findings_message` also had one caller. Both now live in `check_static_findings`, and the message is byte-identical. The tool's "flag" is `tool.static_review.refused_rules(threshold)`.
- **Severity validation moved to the canonical layer.** `validate_static_findings_config` (in `galaxy.tools`, called from `MinimalGalaxyApplication.__init__`) becomes a check in `GalaxyAppConfiguration._process_config`, next to `calculate_dataset_hash` and `hash_function`.
  - **Bug fixed with it.** The old check accepted `info`, because `SEVERITIES` includes it and the schema enum does not.
  - `galaxy-config` can't import `tool_util`, so the list is `galaxy.config.STATIC_FINDINGS_SEVERITIES`. A test pins it to `SEVERITIES` minus `info`.
- **Test changes.**
  - `test_unknown_severity_is_a_configuration_error` now builds a real `GalaxyAppConfiguration`, with `High` and `info` cases. The off case is still allowed.
  - Added `test_configurable_severities_are_the_findings_severities_but_info`. It pins `STATIC_FINDINGS_SEVERITIES` to `SEVERITIES` minus `info`, and to the schema `enum` (`fb189f06a5b`).
  - `test_materializing_keeps_a_current_review...` gains an assertion that refusal off drops a kept review. A mutation that checks `kept` before `reviews_tool` turns it red. These changes only strengthen tests.
- **Docs.** Rewrapped an overlong line in `tool_security_review.md` and in the schema `desc`. `make config-rebuild` reflows both, so `galaxy.yml.sample` and `galaxy_options.rst` are unchanged.

**Not acted on**
- **A single review site in `ToolBox.get_expanded_tool_source`.** This would mean store-or-parse, then one `with_static_review`. It changes the existing try/except structure, and the gain is one call, so it isn't worth it. `patch_and_review_tool_source` keeps its two callers. It also encodes the order: patch, then review.
- **Severity type.** Severities are plain `str` constants across the analyser. A `Literal` would ripple through `tool_util.security`, which is out of scope.
- **Grouping the may-this-job-run checks in `JobWrapper.prepare`.** The dynamic-tool role check, the container allowlist and static findings are inline, one after another. Pulling them into a helper would mostly reshape pre-existing code, and this round adds only one line.
- **`ToolSource.static_review` on the `tool_util` parser interface.** It follows the `patch_state` precedent and transports the review to `Tool.parse`. Kept.
- **`StaticReview.error`.** Nothing reads it. It is diagnostic state on the index that tells a failed review from a clean one. Kept.
- **Pinned constraints, recorded rather than changed.**
  - `ToolInputRejected` is a misnomer for a whole-tool refusal, but it is pinned to `d5f7cb05e91`.
  - The `lib/galaxy` path exemption differs from the sibling's `tool_type_local` rule, which will matter at merge time. The earlier review already recorded it.
  - Eager review at load is a given.

**File sizes** (before → after this round): `populator.py` 1355 → 1362, `cached_toolbox.py` 2148 → 2153, `tools/__init__.py` 5257 → 5262. All were already over 1k.

**Tests**
- Unit: 454 passed, 2 xpassed. This covers `test_static_findings_refusal`, `test_refusal`, `test_cached_tool`, `test_toolbox`, `test_populate_store`, `test_build_index_entry`, `test_freshness`, `test_index_versions`, `test_job_wrapper` and `test/unit/config/`.
- Integration: `test_tool_static_findings_refusal.py`, 6 passed.
- ruff, black and isort are clean. mypy on the changed lib and test files shows only the environment error at `galaxy/managers/notification.py:995`.

<details><summary>Full review</summary>

1. **`cached_toolbox._create_tool_from_stored_source`.** It took a new five-line if/else that called `static_review_is_current` and then either assigned the stored review or called `with_static_review`. The cached toolbox had to know the freshness rule, while the populator and the parse path got it through `security_review`. Fix: `with_static_review(..., kept=)`. Behaviour:
   - When the tool is not reviewed, the result is None, whatever was kept.
   - When the kept version is current, the kept review is used.
   - Otherwise the source is reviewed, with the same logs and the same error capture.
2. **`expected_review_version`.** It returned `str | None`, where None meant "not reviewed" and the string was the version. The freshness token passed `path=None`, while `stored.source_path` can really be None. One call relied on None meaning "no exemption" and the other on it being "an unknown location", so the reader had to work out which. A boolean predicate plus `REVIEW_VERSION` removes the double meaning.
3. **`refused_rules(tool, config)` / `check_static_findings` / `static_findings_message`.** These were three functions for one decision, and the first had no other consumer. The "unused infrastructure" search found nothing that reads it: the API, the panel and the job cache don't. Folded.
4. **`validate_static_findings_config`.** Config validation sat in the tools layer and was called from app init, while every other enum-like option is validated in `GalaxyAppConfiguration._process_config`. It also used `SEVERITIES`, which admits `info`, contrary to the schema enum and the docs. Moved and tightened.
5. **Checked and fine.**
   - `charsets.at_or_above` is shared with `FailOn.met`, which is a good reuse.
   - The runner and Pulsar catches join the existing tuples.
   - The populator carry-forward mirrors `indexed_patch_is_current`.
   - The `ToolIndexEntry.static_review` field is the right home.
   - `RefusalCode` and `ToolInputRejected` match the pin, except for the recorded `StrEnum` change.
6. **Legibility nits.** The overlong doc and schema lines are rewrapped.

Sensitive: none.

</details>
