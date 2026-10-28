# Implementation debrief

STATUS: READY

```
exists .../differential-review/snapshots/20261028T161350Z-hardening-937be9882a4a.json
  hardening @ 937be9882a4a vs origin/release_26.0 (merge-base e27589acb8d2)
  since 20261028T151809Z-implementation-1274f58d63d1
```

## Final implementation (head `937be9882a4`, 8 commits, 5 files, +57/-4)

- `DatasetAssociationManager.get_accessible_converted(trans, item, ext)`: `get_converted_dataset` + `error_unless_accessible` on the result.
- Used by feature search (`fli`), custom builds (`len`/`linecount`), data-provider registry (plus its conversion dependencies).
- `converted/{ext}` keeps returning the pending conversion row, and checks that returned row directly (bam/bai metadata path differs from the association).
- Tests: baseline (`converted/{ext}` returns the existing conversion) + red→green (public source, private conversion → 403 for another user).

## Decisions

- 403 rather than a fresh conversion: the model lookup returns the first association, so a fresh one would never surface.
- Re-scope added the registry; `dbkeys.py`/`genomes.py` left out (read saved build ids, no manager wired; churn for a backport). Second scope evaluation: keep as is.
- Pending-len 400 guard added then dropped (unreachable).
- Independent of blocked sibling `issue_24529_custom_build_fasta_history_26.0`, which fixes the `converted/{ext}` 500 for API clients without a current history.

## Gaps

- No tests for feature search, registry, registry deps, custom-build conversion reuse, or bam/bai (no cheap fixtures).
- Pre-existing, not addressed: `converted/{ext}` response ids look double-encoded.
- Base policy would say 25.1; kept 26.0 to match custom-build siblings.

## Hardening

Normal review ×2, test challenges ×2, Codex ×2 (3 findings, all fixed), baseline refactor ×2 (none), scope eval ×2, `make format` clean, mypy clean on changed files. Thermo skipped (<50 impl+test lines at decision time).
