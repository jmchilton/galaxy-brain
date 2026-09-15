# Add the Galaxy Conda environment hash to `mulled-hash`

This supersedes #18938 and preserves Nate Coraor's authorship on the original commits.
It reapplies the feature after the #18522 hash refactor and incorporates the review
comments on the original pull request.

## Summary

Add `mulled-hash --hash conda` for calculating the `mulled-v1-...` hash Galaxy uses
for uncontainerized Conda environments. Despite the shared prefix, this is distinct
from the version 1 container-image hash.

For example:

```console
$ mulled-hash --hash conda bedtools=2.30.0,samtools=1.9
mulled-v1-ca195b12c14e35565e393a2d07f2deac7610d8126cc3460d217504efd11d4347
```

The existing `v1` and default `v2` modes are unchanged.

## Review follow-up

- Rebase the feature onto the typed `_mulled_hash()` helper introduced by #18522.
- Use an explicit typed conditional instead of a heterogeneous callable map, addressing
  the mypy problem identified during review.
- Add the requested doctest for the Conda hash and a CLI-level regression test.
- Make `main(argv)` pass its supplied arguments to `argparse`; this also lets the CLI
  path be tested without mutating process-global arguments.
- Document the new hash type in both `mulled-hash` sections of the administrator guide.

## Tests

Local validation:

- CLI regression test and module doctests: 2 passed.
- Mulled unit tests excluding tests marked for live external dependency management:
  81 passed, 23 deselected.
- Targeted mypy check: no issues found.
- Ruff, Black, isort, and flake8 pass for the changed Python files.
- `git diff --check` passes.

## How to test the changes?

- [x] I've included appropriate automated tests.

## License

- [x] I agree to license these and all my past contributions to the core Galaxy
  codebase under the MIT license.
