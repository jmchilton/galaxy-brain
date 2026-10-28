Run via Claude Opus 5.5 at high effort.

Top-line: no code changes made. Re-evaluated fresh after re-scope. The prior round's main code-judo candidate (one `parse_direct_download_config_from_config_xml` helper `**`-merged into s3/boto3/azure `parse_config_xml`) is now in (`c324c6103c9`); cloud inherits via s3's `parse_config_xml`. Remaining design follows the `enable_direct_download` pattern: value owned by `ConcreteObjectStore`, validated once there, round-tripped in `to_dict`, consumed by each backend's URL signer. No new branching in busy flows; `__init__.py` was already >1k (2403). Unit suite: 207 passed, 16 skipped.

Not acted on:
- Inline `parse_enable_direct_download_from_config_xml` into the new helper (now its only caller). Pre-existing public classmethod; deleting it on a release branch is churn for no behavior gain.
- Double `int()` + default (XML helper and `ConcreteObjectStore.__init__`). Mirrors `asbool` double-parse for `enable_direct_download`; YAML path needs the `__init__` one anyway.
- `ConcreteObjectStoreModel` lacks `direct_download_expires_in` (dropped from API response though in `to_dict`). Exposing lifetime via API is out of scope for this fix; `to_dict` entry is needed for config round-trip.
- Option stored/validated even when direct download disabled or store can't sign. Uniform base-class config, consistent with `enable_direct_download`.
- Per-backend test helpers (`_boto3/_s3/_azure_direct_download_expires_in`) mock-heavy, but each pins the real SDK kwarg; a shared abstraction would hide the backend-specific call shape.

No security issues found.

<details>
<summary>Full review</summary>

**Verdict:** ship for release_26.2.

**Structure / code judo.** Diff is ~25 prod lines. Config read in canonical layer, consumers just swap hardcoded literals (3600/86400/1h) for `self.direct_download_expires_in`. No further reframing deletes concepts; the remaining knob count is minimal (one constant, one attr, one XML helper).

**Spaghetti.** None. Validation (`<= 0` -> ValueError) is a single check at construction, not scattered.

**Boundaries/types.** Helper is annotated (`Any -> dict[str, Any]`); `**` merge loses per-key typing but the config dicts are already untyped. Acceptable.

**File size.** `__init__.py` 2403 lines pre-existing; +12 lines. Not this PR's problem.

**Legibility.** Sample YAML doc states revocation caveat and default; good. Behavior change worth noting in PR: s3 (legacy boto) and cloud drop from 24h to 1h default.

**Tests.** Baseline commit pins pre-fix lifetimes; feature tests cover default, XML+YAML parse, non-positive rejection, and configured value per backend (boto3, s3, azure, cloud).
</details>
