Run via Claude Opus 5.5.

# Polish debrief

Polished at `ce427b0feea` (base `dev`, merge-base `a73355ea2e5`).

```
created .../reference_data_followups/differential-review/snapshots/20261111T172206Z-polishing-ce427b0feea0.json
  polishing @ ce427b0feea0 vs origin/dev (merge-base a73355ea2e5c)
  since 20261111T170345Z-hardening-a46378901264:
    commits: 7 same, 1 rebased, 1 changed, 0 new, 0 dropped
    hunks:   35 carried, 1 changed, 0 new, 0 dropped
    changed 7c269bf42477 Load reference_data inputs through their authoring model (1 differing hunk)
```

## CI

Fork CI on `a4637890126`: Python linting red on both Pythons, related. mypy flagged `test_reference_data.py:251` (`model.multiple` on the `parameters[0]` union; 27 errors). Reproduced from `lib/` like `make mypy`. Fixed with `assert isinstance(model, ReferenceDataParameterModel)` (stricter test), folded into "Load reference_data inputs through their authoring model", force-pushed. Integration (default, host-services) and Mulled reds fail at "Install Apptainer's singularity" (network), also on dev: unrelated. Most runs were still pending; rerun CI on `ce427b0feea` before opening.

## Checklist

[pr_checklist.md](pr_checklist.md): all GENERAL items pass. Not workflow-related.

## Description

[pr_description.md](pr_description.md). Before/after table reproduced against `dev` lib (extracted `a73355ea2e5`) vs branch lib: XML `reference_data` + `<options>` loads on dev and raises `ParameterDefinitionError` here; `YamlTextParameter.to_internal()` drops `value` on dev.

Strengthening round: no development tasks. Applied: sentence answering the security misreading (XML tools are trusted; not an access hole), a scope sentence (only reference_data changes how it loads), the `release_26.1` no-backport note for the text bug, "fixture-wide" on the `exclude_none` risk bullet, clearer real-output line.

## Galaxy checks

`make format` clean. mypy on changed files from `lib/`: clean (one local-only `managers/notification.py` error, not in CI).

## Titles, tags

[pr_titles.md](pr_titles.md), [pr_tags.md](pr_tags.md): `kind/bug`, `area/tool-framework`.

## Left over (scope questions for John)

- Route other v1 types through `to_internal()` on disk load (#23888).
- `exclude_none` erasing `value: null` in agent/lint code (also on `release_26.1`; its own PR).
- `extra="forbid"` / mypy `init_forbid_extra` on the definition base.
