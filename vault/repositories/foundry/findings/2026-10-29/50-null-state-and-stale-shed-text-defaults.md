# `mc: null` masked with NUL bytes: `null` is never the wrapper default, and Tool Shed parsed tools served `value: null` for text params that have a default

- Target: galaxyproject/foundry (implement-galaxy-tool-step rule and eval; local fix 52808616 needs revising). Upstream half: galaxyproject/galaxy (Tool Shed parsed-tool cache served pre-26.0 parses without text defaults; likely fixed by af96641091b once toolshed.g2 deploys v26.1.2). Optional: tools-iuc bedtools `maskFastaBed.xml` could guard an empty `-mc`. Foundry tracking needed: yes for the Mold; galaxy only if the stale defaults survive a v26.1.2 deploy.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-viralrecon-v0-2026-10-31, phase 5 L77 (bound `mc: null`), phase 10 attempt 5 (Illumina `test`, 82.7 min, 2 job errors), Galaxy release_26.1, 2026-11-01. Ledger `null-text-param-state-renders-empty-not-wrapper-default` (major). Repair R5 (`mc: N`).
- Existing issues/PRs: none found (galaxy "parsed tool cache text default", Foundry "null state"). Related: finding [44](44-gxwf-stateful-convert-when-and-null-data.md)(b) (null for optional *data* params; opposite direction, gxwf too strict there).

## Symptom
iuc bedtools_maskfastabed 2.31.1 rendered `bedtools maskfasta -mc '' ...`; bedtools masked with NUL bytes (656 `\x00`), and bcftools consensus 1.24 failed on REF mismatch (exit 255) for two samples. The step doc said "wrapper defaults: ... mc unset". `gxwf validate --strict` accepted the state.

## Root cause
1. **`null` means "empty", not "default".** The wrapper template is `-mc '${mc}'` with `value="N"`. Galaxy infers text optionality from validators: no validators, so `''` validates and the param is optional (`tool_util/parser/util.py:107-129` `text_input_is_optional`). So `null` is legal state for both Galaxy's model and gxwf (`gx-text.js`), and Galaxy renders it as an empty string. gxwf is right to accept it.
2. **The summary hid the default.** The run's `galaxy-tool-summary.mask-reference.json` (Tool Shed API, cached 2026-11-01) shows `mc`: `optional: true, value: null`. A local parse with galaxy-tool-util 26.1.2 gives `value: 'N'`. Across the run's Tool Shed summaries (39 tool versions, 315 text params) none shows a non-empty default; 7 show `''`, the rest `null`. Older wrappers look stale (bcftools_query 1.24 non-optional `chrom` → `null`, where current parsing gives `''`), a recent one is current (artic_minion 1.7.3+galaxy1 non-optional text → `''`). Text defaults entered the parser in c5f5a3136d5 (2025-09, v26.0.0) without a schema change, so the shed's model cache (`tool_shed/managers/model_cache.py`, keyed by a hash of the model JSON schema) kept old parses. af96641091b (2026-10-18, in v26.1.2) adds `MODEL_PARSING_VERSION` to that hash; toolshed.g2 reports `26.1.2.dev0`, so it probably isn't deployed yet. Confidence: medium-high (code and data agree; shed deploy state inferred).
3. **The local fix 52808616 doesn't catch this case.** Its rule and eval forbid `null` only for params `parsed_tool` declares *non-optional*. `mc` is declared optional, so the eval passes on the exact state that broke the run.

## Evidence
Run ledger entry (job 453 command, NUL count); `maskFastaBed.xml` (tools-iuc main) lines quoted above; summary file vs `input_models_for_tool_source` on the same XML; `git show c5f5a3136d5`, `af96641091b -- lib/tool_shed/managers/model_cache.py`.

## Proposed fix
1. Revise implement-galaxy-tool-step rev 12 → 13: "To take a wrapper default, omit the key (or write the default literally). `null` is never the default: Galaxy renders it as empty for text params, including optional ones, whose optionality Galaxy infers from validators. Use `null` only to pass an explicitly empty value the source passes, or for an unconnected optional data param. A Tool Shed `parsed_tool` `value: null` does not prove there is no default; check the wrapper XML." Eval: every `null` in a tool step's `state` is on a data/collection param or carries a `_plan_context` justification for an empty value.
2. After toolshed.g2 runs v26.1.2, re-fetch `iuc~bedtools~bedtools_maskfastabed/versions/2.31.1` and check `mc.value == "N"`; if still null, file the galaxy issue below. galaxy-tool-cache could also re-summarize from wrapper XML when available (finding 04).
3. Optional tools-iuc: `#if str($mc)` guard in maskFastaBed.xml.

## Draft issue
**galaxy — Title (file only if still stale after v26.1.2 is deployed):** Tool Shed parsed-tool API returns `value: null` for text params with a default (stale model cache)

`GET /api/tools/iuc~bedtools~bedtools_maskfastabed/versions/2.31.1` returns `mc` with `value: null`; the XML has `value="N"` and galaxy-tool-util 26.1.2 parses `'N'`. None of 315 text params across 39 Tool Shed tool versions showed a non-empty default. Text defaults were added to parsing in c5f5a3136d5 without a model schema change, so `ModelCache` entries from earlier parses kept being served. af96641091b's `MODEL_PARSING_VERSION` should invalidate them on deploy; please confirm, and bump it whenever parsing changes.

**Foundry tracking comment:**
> implement-galaxy-tool-step: a `null` state value bound as "wrapper default" rendered `-mc ''` in bedtools maskfasta (viralrecon wb2g, 2026-11-01). Rev 12 (local 52808616) forbids `null` only on non-optional params, which misses this optional-by-inference text param. Revise to "omit the key or write the default; `null` is an empty value" and don't trust a Tool Shed `parsed_tool` `value: null` as "no default" until the shed cache is refreshed.
