# Scope evaluation

Recommend as implemented (narrow): the three truthiness checks in `verify_collection` are the only drops of 0 on `origin/release_26.0`. I re-grepped parser, verify, linters, XSD, test models and workflow test paths for sibling bugs and found none, so there is no related bug to fold in. Lint/XSD/helper ideas are new features or refactors with no bug behind them; defer to `dev`.

No "Possible Decompositions": diff is ~6 lines of code plus a 56-line test file (already split: baseline tests commit, then fix commit).

## As implemented

`verify_collection` compares `count`/`min`/`max` with `is not None` (restores 25.1 semantics for `count`); new `test_verify_collection.py` with zero cases.

| Pros | Cons |
|---|---|
| - Fixes all of #24485 (count=0 silently passes on non-empty collections) and the same bug for min/max | - Doesn't touch anything else, but nothing else is broken |
| - Minimal, low-risk, fits release_26.0 | - Could surface latent wrong `count="0"`/`max="0"` in downstream tests (IWC, tools-iuc); that is correct behavior |
| - Baseline-then-fix commit order already splittable | |

<details>

Sibling verification against `origin/release_26.0` (all correct, no change needed):
- `interactor.py` `verify_output` (discovered datasets, ~L334-370): `count`/`min`/`max` all `is not None`.
- `interactor.py` nested element checks (~L1389-1402): `count`/`max`/`min` all `is not None`.
- `parser/interface.py` `TestCollectionOutputDef.__init__`: `element_count`/`count`/`min`/`max` all `is not None`; `from_dict` passes `element_count` through.
- `parser/xml.py` (~L922-935): int-converts with try/except KeyError, `has_count_assertions` uses `is not None`.
- `linters/tests.py`: count/min/max checks are attribute-presence (`"count" not in output.attrib`, xpath `@count or @min or @max`), not value truthiness; unaffected by 0.
- `tool_util_models/__init__.py` `element_count: Optional[int]`: typed model only; no truthiness use. `galaxy_test/workflow`: no drops (per normal review; recheck grep found none).
- XSD already documents `count`/`min`/`max` (with `gxdocs:added="26.0"` on min/max) for both test output and `output_collection`; nothing to add.

Prior reviews (normal review 1, codex): neither raised scope expansion/contraction.

## Expansion: shared count/min/max helper

Factor the three near-identical count/min/max assertion blocks (`verify_output`, nested element checks, `verify_collection`) into one helper used by all.

| Pros | Cons |
|---|---|
| - Removes the duplication that let the truthiness bug diverge in one copy | - Refactor, not a bug; 3 differing message formats (quotes, "datasets" vs "elements") to preserve |
| - Reusable abstraction | - More churn on a release branch; risk of changing messages tests match |

Better as a `dev` follow-up.

## Expansion: lint / validate conflicting count/min/max (min>max, count with min/max)

Add a tool linter and/or runtime check for contradictory bounds on output and output_collection tests.

| Pros | Cons |
|---|---|
| - Catches author mistakes early | - New feature, no bug; not backport material |
| | - Runtime failure already occurs naturally (test can never pass) |
| | - Needs linter tests, docs; unrelated to #24485 |

## Contraction: fix only `count`

Only fix `count` as in the issue.

| Pros | Cons |
|---|---|
| - Smallest diff | - Leaves identical `min`/`max` zero bugs (`max="0"` ignored) in the adjacent lines; reviewers would object |

## Expansion: XSD / galaxy-tool-util test schema models

Docs/schema changes for count/min/max/element_count.

| Pros | Cons |
|---|---|
| - None needed: XSD already documents them; `element_count` already modeled | - Pure churn, no gap found |

</details>
