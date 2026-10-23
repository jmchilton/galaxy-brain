# Codex review debrief

Codex found 1 finding (P1). It's reproduced (throwaway API test: the plain run was served from the cache and wrote `sample_a\n`) and needs a decision. No code changes.

Not acted on:
- **Job cache lets a plain UDT run reuse a mapped job** (`managers/jobs.py:845-856`, `_build_stmt_for_hda`): a request with no identifier only requires an HDA name match, and the parameter loop skips `|__identifier__`. With `use_cached_job`, a plain run on HDA D (named `sample_a`) can reuse the mapped job's `sample_a\n` output instead of producing `null\n`. Before the branch both rendered `null`, so it was harmless. XML tools have the same tolerance, mostly masked because their plain fallback is the HDA name. Options for John: (a) a plain request rejects cached jobs carrying `|__identifier__`, which also changes XML caching; (b) the deferred plain-dataset HDA-name fallback, which gives UDT/Cheetah parity, and then the existing name-match rule is sound.

<details><summary>Full review</summary>

Reviewed every changed file plus meta/execute/managers/jobs/model/convert. Runtime unit tests passed (53); API tests not run.

- P1 correctness, `lib/galaxy/tools/runtime.py:195`, "Cache matching must distinguish plain inputs from mapped inputs". Scenario: run TOOL_WITH_ELEMENT_IDENTIFIER over a list containing HDA D as `sample_a`, then run it directly on D with `use_cached_job=true` and D's name/metadata unchanged. The mapped job is reused and returns `sample_a\n` instead of `null\n`. Confidence: certain.
</details>
