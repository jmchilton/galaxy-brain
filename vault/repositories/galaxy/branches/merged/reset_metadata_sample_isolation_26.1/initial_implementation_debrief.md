# Initial implementation

Recovered for hardening on 2026-10-25 from existing branch record and commits `c6ee20cecd5` and `6408b44bbfe`, based on `release_26.1` at `d9647406cf6`.

The fix separates repository scan/path handling from sample staging. `ValidationContext` owns and cleans the temporary sample directory, and reset reads each revision's sample files from its clone. This prevents de-suffixed sample tools from becoming real tools and avoids validating historical revisions against tip samples.

The extracted branch contains shared revision/metadata test helpers and regression coverage. Previously recorded validation: Tool Shed units 101 passed, 12 skipped; two regression tests failed at assertions against the original generator; formatting/hooks clean and generator mypy matched two existing base errors. Functional reset coverage was not previously run. Fresh hardening will evaluate these results and the branch's scope.
