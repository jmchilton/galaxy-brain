# 17.09 upgrade advice reads a backtick-quoted attribute name and never fires

- Area: lib/galaxy/tool_util/upgrade/__init__.py
- Found while: [[Component - Tool Profile Versions and Upgrade Advisor]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`ProfileMigration17_09.advise` (`upgrade/__init__.py:136-141`) checks `outputs_el.get("`provided_metadata_style`", None)`. The attribute name includes literal backticks, so the lookup never matches a real `provided_metadata_style` attribute and `17_09_consider_provided_metadata_style` is never emitted.

The condition is also the wrong way round. The advice tells authors to add `provided_metadata_style="legacy"` to keep the old `galaxy.json` format, but the check fires only when the attribute is already set. Advice belongs on tools that have no `provided_metadata_style` and write `galaxy.json`.

## Evidence / repro

Read in code. `test/unit/tool_util/upgrade/test_upgrade_advice.py` has no test for `17_09_consider_provided_metadata_style`. Draft PR #24524 (head `cc649c94509`) doesn't touch this migration.

## Suggested fix

Drop the backticks. Emit the advice when `provided_metadata_style` is absent and the tool writes `galaxy.json`. #24524 adds a `writes_galaxy_json()` helper in `linters/_util.py` that this check could use. Add positive and negative tests. The code is `niche`, so the CLI hides it without `--niche`.
