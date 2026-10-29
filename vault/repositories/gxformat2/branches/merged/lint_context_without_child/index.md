---
upstream_base_branch: main
pr: 285
---
# Fall back when lint context lacks child()

- [Open PR](https://github.com/galaxyproject/gxformat2/compare/main...jmchilton:gxformat2:lint_context_without_child?expand=1)
- [View on GitHub](https://github.com/jmchilton/gxformat2/tree/lint_context_without_child)

## Status

Merged as #285; released in gxformat2 0.29.1.

## Notes

- Red test `test_lint_ga_accepts_context_without_child` failed with the 0.29.0 `AttributeError`; full suite green after fix.
- Verified released Planemo + `gxformat2==0.29.0` crashes, + this branch reports `StepLabelNotUnique` normally.
- Wants a 0.29.1 release after merge.
