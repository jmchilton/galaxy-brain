# Normal review debrief

Verdict: approve with nits, no bugs. Acted on: dropped the `value.id` fallback in `adapt_dataset` (production map only holds the job's own input ids) and re-keyed its unit test to the converted id; moved the id-keyed lookup onto `ElementIdentifierMapper.identifiers_by_dataset_id`; set `element_identifier` only on a hit; commit message now notes the `to_cwl` DCE behavior change and the converted-input gap. Fix commit is now `93a7976d096`.

Not acted on:
- Carrying the identifier onto implicitly converted HDAs (`actions/__init__.py`): this would change Cheetah behavior for XML tools too, so it's out of scope. It's listed as a known gap in the issue text.
- Limiting `to_cwl` DCE `element_identifier` to the UDT path: kept. It's additive and matches runtimeify's DCE branch, and it's documented in the commit.
- Plain-dataset `null` vs the Cheetah name fallback: kept and pinned by a baseline test, flagged as an open question.
- Populator helper for the `{identifier: content}` comprehension (3 uses): no existing helper. Left for the test challenge step.
- Max-hid lookup in the `/api/jobs` test: left for the test challenge step.

<details><summary>Full review</summary>

- Nested key alignment OK: `actions/__init__.py` writes `incoming[f"{name}|__identifier__"]` with `inp_data` names (prefixed, e.g. `cond|input`), the same names the mapper keys on.
- Same HDA in two params collapses by id. This is the same last-write-wins as the transient attr on the shared ORM object (pre-existing).
- Multiple-data params are unaffected.
1. The `value.id` fallback and its unit test describe a case production can't produce. A converted input never gets `|__identifier__`. Options: drop it, or carry the identifier onto the converted HDA in actions.
2. `to_cwl` now sets `element_identifier` for DCEs, which workflow expression steps also see. Document it or restrict it.
3. Plain-dataset `null` diverges from Cheetah's name fallback. State it's deliberate.
4. Nit: move the comprehension onto `ElementIdentifierMapper`.
5. Nit: the elements→contents comprehension appears 3 times.
6. Nit: the max-hid lookup for the implicit collection is brittle.
7. Nit: explicit `None` when there's no match.
8. Imports and commit order OK.
</details>
