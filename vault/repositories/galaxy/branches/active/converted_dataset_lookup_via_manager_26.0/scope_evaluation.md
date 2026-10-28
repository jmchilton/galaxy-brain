Run via Claude Opus 5.5 at low effort.

Recommend keeping the scope as implemented (post-re-scope): `get_accessible_converted` manager helper used by feature search (`fli`), custom-build `len`/`linecount` and the data-provider `registry.py` lookup, with `converted/{ext}` checking the returned conversion directly. The remaining items from the first evaluation (`managers/dbkeys.py`, `visualization/genomes.py`) read build fasta/len ids validated when the build is saved and lack a manager, so routing them is plumbing churn for a release backport rather than a related fix; no further change recommended. Branch is ~55 lines; no decomposition section needed.

## As implemented (recommended)

Helper plus four callers (fli, users `len`/`linecount`, registry) and the explicit check in `converted/{ext}`. Two API tests (baseline reuse + access check).

| Pros | Cons |
|---|---|
| - Covers every API-facing lookup on a user-supplied dataset<br>- Small, release-branch friendly<br>- Already reviewed twice | - `registry.py`/`users.py`/fli paths untested<br>- `dbkeys`/`genomes` still use raw model lookup |

## Expand to dbkeys/genomes

Thread an HDA manager into `managers/dbkeys.py` and `visualization/genomes.py` and route their `len` lookups through the helper.

| Pros | Cons |
|---|---|
| - Single lookup path everywhere<br>- Answers "why not the rest?" | - Inputs already validated at build save (`add_custom_builds`)<br>- `dbkeys` also runs in job context; manager plumbing is churn<br>- Cross-owner dbkey lookup in `genomes.py` is a separate design question |

## Contract to original scope

Drop `registry.py` (kept on `_alt_original_scope`).

| Pros | Cons |
|---|---|
| - Even smaller | - Leaves the most reachable remaining caller (visualization data endpoints) unrouted |

## Broad expansion

Push the check into `DatasetInstance.get_converted_dataset` or route `tools/actions` and model dependency resolution too.

| Pros | Cons |
|---|---|
| - No caller can miss it | - Model has no user/manager context; tool/job semantics differ<br>- Too large for release_26.0 |
