Marius raised this in the second finding of [his review of #1704](https://github.com/galaxyproject/planemo/pull/1704#pullrequestreview-5478940924). This tracks the interpreter-selection policy for older Galaxy releases and local checkouts as a design follow-up to #1704 and #1489.

### Compatibility risk

#1704 changes the default Galaxy interpreter to Python 3.14. When `python3.14` exists on `PATH`, that default also applies to an older selected Galaxy release or checkout. For example:

```sh
planemo serve --galaxy_branch release_25.0
# Or: planemo serve --galaxy_root /path/to/an/older/galaxy
```

Neither invocation explicitly selects a Python version. Previously, the loose `python3` default might have selected 3.12; after #1704, the same Galaxy can receive a 3.14 virtualenv. Its pinned dependencies may not install or run successfully with that interpreter.

This is a review-identified compatibility risk, not a newly reproduced installation failure for a specific Galaxy release. The follow-up should establish the supported release/interpreter combinations before choosing a policy.

The warning and actual-version cache naming in [jmchilton/planemo#13](https://github.com/jmchilton/planemo/pull/13), now merged into #1704's branch, address the separate case where the requested interpreter is missing. They do not address selecting an incompatible interpreter that **is** available.

### Design questions

- Should the default be derived from the selected Galaxy checkout, or should Planemo keep an explicit fixed default and document `--galaxy_python_version` overrides for older releases?
- If selection is checkout-aware, what is the authoritative compatibility source: Galaxy's declared Python constraints, a release policy, or tested interpreter/dependency combinations? How should local checkouts, custom forks, and missing metadata behave?
- How should selection behave when several interpreters are available, or when no compatible interpreter is available? Provide an actionable diagnostic rather than silently substituting an unsupported version.
- Preserve explicit CLI/config/profile selections, and decide whether an explicitly incompatible selection should warn or fail. Keep cache selection tied to the interpreter actually used.

### Validation for an implementation

Cover a current Galaxy release and an older release such as `release_25.0`, plus an explicitly supplied local checkout. Exercise available, missing, and incompatible interpreters; explicit overrides; and existing virtualenv/cache reuse. Include managed-Galaxy installation/startup evidence for the chosen compatibility policy, rather than only testing version-string selection.

This issue leaves the policy open for discussion; it does not prescribe a release-to-Python mapping or automatically block merging #1704.
