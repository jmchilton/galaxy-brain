Run via Claude Opus 5.5 at low effort.

Recommend a modest expansion: keep the `get_accessible_converted` manager helper and also route the remaining manager-reachable callers through it — the data-provider `registry.py` lookup (visualization data, the reviewer's top follow-up) and the custom-build `len` lookups in `managers/dbkeys.py` and `visualization/genomes.py` — and fix the touched `users.py` path so a pending `len` (helper returns None) gives a clean error instead of `AttributeError`. Leave tool-input implicit conversion (`tools/actions`) and model-internal dependency resolution out; they run under job/tool semantics, not an API lookup. Branch is ~50 lines; no decomposition section needed.

## As implemented

Manager helper `get_accessible_converted`; `converted/{ext}`, feature search (`fli`) and custom-build `len`/`linecount` use it.

| Pros | Cons |
|---|---|
| - Small, focused, easy release-branch review<br>- Establishes reusable manager abstraction | - Helper has 2 of ~6 API-facing callers; reviewers likely ask "why not the rest?"<br>- Leaves known `None` crash in a line the branch edits |

## Modest expansion (recommended)

As implemented plus `visualization/data_providers/registry.py:114`, `managers/dbkeys.py:146`, `visualization/genomes.py:321,322,400` moved onto the helper (passing an HDA manager where they lack one), plus pending-`len` handling in `api/users.py`.

| Pros | Cons |
|---|---|
| - Helper becomes the single lookup path for user-facing conversions<br>- Fixes adjacent bug in touched code<br>- Matches reviewer preference for general fix | - `genomes.py`/`dbkeys.py` have no manager wired in; needs plumbing<br>- Little test coverage for visualization paths (no test tool consumes `len`) |

<details>
`dbkeys.py`/`genomes.py` operate on a fasta the caller already got via the manager, so routing adds a consistent lookup rather than new behaviour; registry is reached from `/api/datasets/{id}` data endpoints and is the natural next caller. Unit-level tests of the registry path are feasible via `implicit_conversion` fixtures.
</details>

## Broad expansion

Move all `get_converted_dataset` call sites (incl. `tools/actions/__init__.py` and model dependency resolution) behind manager-level lookup, or push the check into the model method.

| Pros | Cons |
|---|---|
| - One enforcement point | - Model has no user/manager context; job-time conversion semantics differ<br>- Too large/risky for release_26.0 |

## Contraction

Only `converted/{ext}` change; drop helper.

| Pros | Cons |
|---|---|
| - Minimal diff | - Loses reusable abstraction; duplicated inline checks |
