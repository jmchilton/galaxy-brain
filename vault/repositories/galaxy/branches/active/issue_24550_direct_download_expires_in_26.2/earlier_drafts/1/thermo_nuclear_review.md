Run via Claude Opus 5.5 at high effort.

Top-line: no code changes made. Diff (~30 prod lines) already follows the existing `enable_direct_download` pattern exactly - config_dict key on `ConcreteObjectStore`, XML classmethod on `BaseObjectStore`, `to_dict` round-trip, per-store `parse_config_xml` wiring. No spaghetti, no file-size threshold crossed (both files were already >1k). Unit suite: 207 passed, 16 skipped.

Not acted on:
- Fold `enable_direct_download` + `direct_download_expires_in` XML parsing into one `parse_direct_download_config_from_config_xml` returning a dict (`**`-merged in azure/s3/s3_boto3). Real dedup (3 sites x 2 keys), but rewrites pre-existing lines on a release branch; better as a dev follow-up if a third direct-download knob appears.
- Double `int()` (XML helper and `ConcreteObjectStore.__init__`) and duplicated default. Harmless; mirrors the `asbool` double-parse of `enable_direct_download`. Keeping symmetry beats a one-off.
- `s3.py` `key.generate_url(7200)` for axel download - internal fetch URL, not a client-facing direct download; out of scope.
- `direct_download_expires_in` validated/stored even when direct download disabled or store can't sign. Accepted: uniform base-class config, cheap, consistent with `enable_direct_download`.
- Tests: per-backend `_*_direct_download_expires_in` helpers are slightly mock-heavy but each pins the actual SDK kwarg; no shared abstraction would reduce them without hiding the backend-specific call shape.

No security issues found.

<details>
<summary>Full review</summary>

**Verdict:** ship as-is for release_26.2.

**Structure.** Config value lives in the canonical layer (`ConcreteObjectStore`), consumed in each backend's `_get_object_url`/`get_direct_download_url`. Code judo candidate: a single direct-download config parser (see above). Not worth churn on a release fix.

**Boundaries/types.** `int()` + `<= 0` ValueError gives a clear startup error. Non-integer strings raise `ValueError` from `int()` with a less specific message - acceptable.

**Behavior change.** Default lifetime unified to 3600s; cloud.py and legacy s3.py drop from 86400 to 3600. Intentional per issue; documented in sample config. Worth a line in PR description (already in debrief).

**File size.** `objectstore/__init__.py` 2400 lines, `test_objectstore.py` 2721 - pre-existing, +14/+123.

**Tests.** Baseline commit pins old lifetimes first, then change updates cloud expectation 86400->3600. Configured-lifetime tests cover boto3 (xml+yml), s3, azure, cloud; non-positive rejection covered.
</details>
