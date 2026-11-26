# Review: phases A+B (pure package)

Acted on in `99fba759421`: bugs 1–3 (override fallback keeps a mixed override's security fix; digests cover `codes.yml` and `coverage/`; `add_element` copies whitespace-only tails), nits 4 (reuse `is_shed_guid`), 5, 6, 9 (`key_for`), 10 (policy level typing), 11 (`apply_patches` docstring).

Not acted on:

- 7 duplicate-key YAML loader: optional; left for hardening.
- 10 typed state constants / TypedDict: cosmetic.
- 12 `script_sha256`/`param_model` rejected by `extra=forbid`: kept rejecting (fails open, never silently drops a guard); recorded as an MVP gap.
- 13 unbounded hg walk: only runs for shed keys with overrides; seams pass the tool dir as the start.
- 14 test file split: deferred.
- Questions (series-gated advisory suppression, engine version in digest): open for John.

<details><summary>Full review</summary>

# Review: phases A/B (pure `galaxy.tool_util.patches` package)

Scope: `git diff origin/dev..HEAD` at `840bf0faaae` (commits daeb3750f0c, e02b9b68bb8, 8b8010227f2, 840bf0faaae). Review only. The uncommitted later-phase work in the worktree was not reviewed.

**Verdict:** the package is solid and well tested, and conforms closely to the design. Three bugs should be fixed before the seam phase: two affect results, one affects cache invalidation. The rest are reuse, typing and dead-code nits.

Checks at HEAD (run in a clean detached worktree, with `hg` on PATH):
- `pytest test/unit/tool_util/test_tool_patches.py`: 169 passed.
- `cd lib && mypy galaxy/tool_util/patches ../test/unit/tool_util/test_tool_patches.py` (how `make mypy` runs): clean, apart from an unrelated `managers/notification.py` error that predates the branch.
- ruff, black and isort: clean.
- Baseline tests (toolbox reload identity, incremental populate): pass.

Loading the reference patch tree into a `PatchCollection` gives these results:
- 989 files indexed.
- 9 path segments refused as non-canonical. This is expected, because the tree isn't Go-encoded yet.
- 6 files rejected as invalid. All six are for the same reason, `script_sha256` (see nit 12).
- Every other file validates.

## Bugs

1. **A mixed override's compat mismatch throws away its applied security fix** (`database.py:241-249`).
   - What happens: `_apply_collection` falls back to the version file when *any* state in the override result is `mismatch`. So when an override's security unit applies and its compat unit mismatches, the whole override is dropped.
   - Why it matters: overrides exist only where the version file mismatches that changeset. Falling back therefore usually leaves the tool unpatched for security.
   - Reproduced: a mixed override (security op applies, compat anchor absent) plus a version file that doesn't apply gives `[security mismatch from the version file]`, and the security op is not applied.
   - This breaks the per-kind rule that a compat mismatch never blocks a security fix.
   - Fix, pick one:
     - (a) fall back only when the override's *security* unit is `mismatch`;
     - (b) fall back only when no unit of the override is `applied` or `already_applied`.
   - Use the probe as the red test.

2. **The per-key digest and `token()` ignore `coverage/` and `codes.yml`** (`database.py:141-158`, `collection.py:317-326`).
   - What happens: `PatchState.verified` depends on `coverage/<key>.json`. The advisory `level` and `message`, and whether a file validates at all (`_check_codes`), depend on `codes.yml`. Neither file feeds `digest_for`, `PatchCollection.digest` or `token()`.
   - Reproduced: adding a coverage entry flipped `verified` from False to True, while `digest_for` and `token()` stayed the same.
   - Why it matters: once the populator fast path compares entry digests (next phase), it would carry stale `verified` values and stale advisory text forward.
   - Fix:
     - In `digest_for`, hash the sha256 of each matched collection's coverage file for the key. `_read_coverage` already computes the path; keep the bytes' sha alongside the parsed set.
     - Fold the sha256 of `codes.yml` into `PatchCollection.digest`, and into the per-collection term of `digest_for`.

3. **`add_element` duplicates non-whitespace parent text or tails** (`engine.py:159-162`).
   - What happens: `new.tail` is copied from `p.text`, or from the previous child's tail, without checking that the copied text is only whitespace.
   - Reproduced: on `<help>Real text <b>x</b></help>`, `position: first` or `before:b` gives `<help>Real text <i/>Real text <b>x</b></help>`.
   - Why it matters: neither the POST re-check nor `canon` notices, so the text change slips through silently.
   - Fix: copy the indent only when it is whitespace, e.g. `src = ref.tail if ref is not None else p.text; new.tail = src if children and src and not src.strip() else None`.

## Nits / improvements

4. **Reuse the existing guid helper** (`keys.py:67-80`).
   - `_is_shed_guid` duplicates `galaxy.util.tool_version.is_shed_guid`.
   - The `split("/repos/", 1)[1]` host strip duplicates `_without_shed_host` in `toolbox/base.py:1824`.
   - Suggestion: move a `strip_shed_host(guid)` (or `shed_guid_parts`) helper into `galaxy.util.tool_version`, and use it in both `keys.py` and `toolbox/base.py`.
   - Also: `key_from_ids` line 73 has a redundant `guid and`.
   - `patch_key` can be a single `key_from_ids(guid, tool_source.parse_id(), tool_source.parse_version())`. The behaviour is identical, and `root.get` costs nothing.

5. **One tail-merge helper.** The "keep non-whitespace tail when removing a node" logic appears twice, at `engine.py:168-173` and `xmlutil.py:33-38`. Make it a single `xmlutil.remove_preserving_tail(el)`.

6. **Use lxml built-ins.** `engine._ancestors` can be `el.iterancestors()`. `classify` could also build a set of `news` ids instead of using the list `in` at line 107. Minor.

7. **YAML loading** (`collection.py:63-69`).
   - Don't reuse `yaml_util.ordered_load`. It needs a named stream and registers `!include`, which reads files relative to the stream. That is unsafe for third-party collections.
   - The real gap: `yaml.safe_load` silently keeps the last of two duplicate keys, such as two `ops:`.
   - Optional: use a small `CSafeLoader` subclass that rejects duplicate keys. It is also faster than the pure-Python `safe_load`.
   - `_read_yaml` and `parse_patch_yaml` could share one implementation.

8. **`xmlutil.py` is justified.** Galaxy has no C14N helper; `xml_element_compare` is dict-based and has different semantics. `etree.canonicalize(strip_text=True)` doesn't fit either, because it strips significant leading and trailing text such as regex validators.
   - Optional: split generic helpers (`parse_fragment`, `canon`, `find`, `element_children`) from patch-domain rules (`SINGLETON_TAGS`, `REQUIREMENT_TAGS`, the selector predicates).
   - `canon` could then later move to `galaxy.util` for reuse.

9. **Dead code and redundant checks.**
   - `ToolPatchDatabase.key_for` (`database.py:173`) has no caller, and `patch_key` is already exported. Drop it.
   - `targets_root_identity` (`xmlutil.py:83`) only improves the error message. ElementPath already rejects `@attr` steps, and no op can rewrite root attributes. Add a short comment saying so, so it isn't mistaken for the guard. Also, its regex says "root identity" for any `/@version` step.
   - The root checks at `engine.py:101,131` can't trigger once the model forbids root selectors. They are harmless.

10. **Typing.**
    - State names are bare strings: `engine.py:43-44` (`PRE/POST/NEITHER`, `APPLIED/...`), `UnitResult.state: str`, `classify -> str`, and `database.ADVISORY`. Meanwhile the model has `PatchStateName`.
      - Define typed constants once in `model.py`: `APPLIED: PatchStateName = "applied"`, and so on.
      - Add `OpClass = Literal["pre", "post", "neither"]`.
    - `_generated` uses `vulnerable: Any` (`database.py:339`). It should be `Vulnerable | None`.
    - `_unit_fields -> dict[str, Any]` could be a `TypedDict`.
    - `load_tool_patch_database(reproducibility: str)` should take `ReproducibilityLevel`.
    - Optional: running mypy from the worktree root (not from `lib/`) reports `no-any-return` at `database.py:85`. `make mypy` doesn't; making it robust is cheap.

11. **Docstrings and comments.**
    - The `apply_patches` docstring is 3 lines (`database.py:189-192`). Reduce it to 1, and move the `repository_dir_hint` note into the commit message.
    - The `Advisory.expanded_sha256` comment says "unpatched". The code compares against *this collection's input*, which differs once collections stack. Make the comment match the code.

12. **Conformance gaps with the format reference.** All of these fail open, so they are not bugs.
    - **Needs a decision:** `script_sha256` and `param_model` are rejected by `extra="forbid"`, so 6 reference files load unpatched today. Keep rejecting them. Accepting and ignoring them would silently drop a guard. Record this as an MVP gap.
    - **Not enforced yet, each cheap to reject:**
      - `reproducibility_doc` or `reproducibility_reason` set to `TODO`;
      - `subset: true` without `authoring: hand`;
      - an explicit `false` for `changes_requirements` or `subset`;
      - an advisory override without `expanded_sha256`;
      - a missing `version` in `collection.yml`, which becomes `""` (`collection.py:87`).

13. **Hg walk.** `find_repository_dir` walks upward with no bound (`hg.py:16`). Once the seams know the shed repository dir, pass it in and stop there, so an unrelated ancestor `.hg` is never read. It is harmless today, because the node would simply not match.

14. **Tests.**
    - Coverage is substantive: no trivial or weakened assertions spotted, and `test_builtin_collection_is_empty` earns its place by pinning the MANIFEST packaging.
    - The file is 1234 lines. Consider splitting it into model, engine and database files before the seam tests land.

## Questions

- Should a skipped unit (series gate) silently drop the advisory of the same kind? That is what the `continue` at `database.py:282` plus the final `not in units` check at line 306 do.
- Should a module-level engine/format version go into `_policy_bytes`, so engine fixes within one release series invalidate cached patched sources?

## Checked, no issue

- The miss path returns the same object, leaves `patch_state` untouched and makes no tree copy. The key tuple and matching list are the only allocations.
- POST-first classification for all four ops, atomic apply on a deep copy, per-op re-classification, the idempotence re-check and the selector-count check are all correct.
- `remove_element` treating zero matches as POST is required for idempotence.
- Lazy caches are locked (`_sha256`, `_loaded`, `_coverage`, `_changesets`) or idempotent (`_digest`, `lru_cache`). The concurrent-parse test covers this.
- API fit for the seams:
  - The populator fast path can call `tool_digest(key_from_ids(...), repo_dir)` without parsing.
  - The eager path can call `apply_patches(tool_source, guid, repo_dir)` on the file-parse branch.
  - The sha256 matches `populator.compute_hash` (sha256 of `to_string()`).
- `typing.Self` is fine, since `requires-python >= 3.11`.

</details>
