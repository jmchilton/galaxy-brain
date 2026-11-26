# Review: re-scope commit ff7567349f0 (`--fail-on uncleared`)

Run via Claude Opus at high effort, inline in the re-hardening agent (the diff is 33 lines).

Acted on in `937ca04214d`:

- **Bug 1 (docs).** The `--tool-patch-path` paragraph still said "the review does not check that a patch cleared anything". It now says only `--fail-on uncleared` checks that.
- **2 (docs and help).** The bullet said "a tool whose security tool patch applies but clears no finding", which reads as a per-patch check. The check is per tool: some security unit is `applied`, and the patches together (of any kind) clear nothing. The bullet now says so, and adds that a finding made less severe is not cleared. The `--help` text now says "the patches clear no finding".
- **3 (test).** The `--tool-patch-path` guard for `--fail-on uncleared` had no test. Added a `fail-on-uncleared` case to `test_cli_rejects_patch_options_without_a_collection`. Red check: with the guard tuple set back to `(MISMATCH,)`, the case fails and the other two pass.
- **Nit 4.** The `FailOn` docstring listed only mismatches. It now says "patch states".

Not acted on:

- **5. A severity-lowering security patch fails `--fail-on uncleared` (decision for John).** Probe: the synthetic awk tool with a sanitizer change that takes `;` out of the valid characters. `nested-interpreter` drops from HIGH to MEDIUM, nothing is cleared, and the exit is 1. This follows from `cleared` being strict, which was the coordinator's call in the rebuild review. Now documented. The alternative is to count a lowered match as progress.
- **6. Text output gives no reason for an `uncleared` failure.** The output is a `PATCH applied` line, no `CLEARED` line, and exit 1. The severity, `uncheckable` and `unchecked` gates don't print a reason either, so this is consistent. A `mismatch` at least shows its state.
- **7. Name (decision for John).** `uncleared` sits next to `unchecked` and `uncheckable` in the same `choices` list. Three `un…` words are easy to misread. Recommendation: rename to `clears-nothing`. It reads as the condition and doesn't collide with the others. Kept as is until John picks.
- **8. Per-unit attribution.** A compat unit that clears something hides a security unit that clears nothing. This needs a review per unit (patches applied one at a time). It was already a con in the first scope evaluation, and it is now documented.

<details><summary>Full review</summary>

## Verdict

The change is small and correct for what it states. It adds one property (`PatchReview.uncleared`), one `FailOn` field folded into the existing patch branch of `met`, the parser guard, docs and a parametrized CLI test. It reuses the engine's `APPLIED` constant and the model's `SECURITY` constant, and it adds no new concept beyond the flag. Tests (797) pass, ruff, black and isort are clean, and mypy for `galaxy/tool_util/security` shows only the existing `managers/notification.py` error.

## Bugs

1. **Stale docs.** `doc/source/admin/tool_security_review.md`, in the `--tool-patch-path` paragraph: "the review does not check that a patch cleared anything" contradicts the new bullet above it.

## Precision

2. **Per tool, not per patch.** `uncleared = any(applied security) and not self.cleared`. `cleared` is the tool-level diff across every collection and every unit kind. The docs and help described a single patch.

5. **Lowered severity.** `finding_match` leaves out severity, so a finding that goes from HIGH to MEDIUM is still matched and not cleared. A sanitizer-tightening security patch that leaves some characters through therefore fails `--fail-on uncleared`. This is arguably right, since the value can still change what runs, but it should be a stated choice. It is now documented.

## Tests

3. **Guard untested.** `_patch_database` gained the `uncleared` guard, but `test_cli_rejects_patch_options_without_a_collection` only had `guid` and `mismatch`.

- The new parametrized test (`clears_its_finding` / `clears_nothing`) would fail at argparse (exit 2) without the commit, not at its own assertion. That's acceptable for a new CLI choice. The library-level red is covered in the test challenge (stub `uncleared`).
- The mismatch test has a `compat` case that pins security-only scope. The uncleared test has none. See `test_challenges_debrief.md`.
- The parametrize ids use underscores. The file's other ids use hyphens (`not-shed`, `fail-on-mismatch`). See the test challenge.

## Consistency with sibling paths

- `mismatched` returns `list[PatchState]` and `uncleared` returns `bool`. Both are only ever tested for truth. See the thermo review.
- `FailOn.parse` now passes five positional values. See the thermo review.
- Sibling gates don't explain themselves in text output either (nit 6).

## Reuse

Nothing duplicated. `APPLIED` comes from `patches.engine`, as `MISMATCH` already did.

</details>
