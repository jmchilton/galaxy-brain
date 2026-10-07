# Polish debrief: `issue_23930_shed_update_descriptions`

Polished 2026-10-06 at `1f85950f4a1` (base `release_26.1`). The branch itself is unchanged.

## CI
- Fork CI on `1f85950f4a1` was still queued throughout polishing, with no reds to diagnose. It is still a blocker.

## Checklist (GENERAL.md only; no workflow scope)
- All items pass. The human-read item is left for John.
- The subagent checked the rename order (`description` → `long_description` first, then `synopsis` → `description`). It's correct and matches `create_repository`.
- `update_validated_repository`'s only other caller (legacy `repository_util.update_repository`) is unused.
- The Tool Shed frontend never calls the update endpoint.

## Strengthening round
- No development tasks.
  - Asserting `long_description` on the PUT response would mean changing `populators.update()`'s return type (it parses into `Repository`), and the fresh GET already covers it.
- Description corrections, which I verified:
  - The regression reached users in **26.1**, not 24.2. Through v26.0.0, `SHED_API_VERSION` defaulted to `v1`. `81475072313` made v2 unconditional, and it first shipped in v26.1.0. This also explains the `release_26.1` target. The implementation debrief is updated too.
  - "Bioblend since 2015" is unverified because the local clone is shallow. The description now dates only planemo's names (`0aaae9a4`, 2015) and says bioblend sends the same ones.
  - "Doesn't rewrite stored data" and "no known client sends `description=` as short text" are now highlighted above the fold.
- Verified: the next `planemo shed_update` always sends the synopsis, so it repairs a damaged repository. It doesn't if `--skip_metadata` is used.

## Open question for John
- Should `Field(description=...)` docs go on `synopsis` and `description` in `Create/UpdateRepositoryRequest`? The naming mismatch is the root cause. Doing it means regenerating the frontend `schema.ts`. If wanted, I'd do it as a follow-up on `dev`, not on the release branch.
