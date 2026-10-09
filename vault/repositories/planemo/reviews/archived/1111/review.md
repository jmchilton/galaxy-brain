# PR 1111 — raise report level for some shed linting

`galaxyproject/planemo#1111` · bernt-matthias · opened 2020-12-15 · `topic/shed_lint_warn`
Fixes #1112.

## Verdict

**Rescuable, and rescued.** The premise is sound and still true on master; the PR
stalled on a scope disagreement with nsoranzo that was never resolved, plus a
self-inflicted test failure. A rescue commit sits on
`rescue-1111-shed-lint-levels` in `~/projects/worktrees/planemo/pr/1111`
(unpushed).

## Is the premise still valid?

Yes. [verified, CLI]

`validate_repo_name` / `validate_repo_owner` reject exactly what the tool shed
rejects — `planemo/shed/__init__.py:833` and `:841` already treat those as hard
failures inside `_create_shed_config` (`error(...)`, `return 1`). But
`shed_lint` only *warned*, so CI invoked as `--report_level warn --fail_level
error` (what RECETOX and tools-iuc use) passed, and the upload then failed with
an opaque

```
400: {"err_msg": "Repository names must contain only lower-case letters, numbers and underscore.", "err_code": 400008}
```

Reproduced as a test against unmodified master:
`shed_lint --fail_level error` on `tests/data/repos/bad_repo_name` exits **0**.
That is the bug, six years later.

Default `--fail_level` is `warn` (`planemo/options.py:1699`), so promoting these
is a no-op for anyone on defaults. It only changes behavior for the CI setups
that motivated the issue.

## Why it stalled

Two things, both visible in the review threads:

1. **nsoranzo objected to the missing-key errors.** The PR added a `_lint`
   wrapper erroring with `Repository does not define: <key>` for `owner`,
   `name`, `categories`. nsoranzo: `name` defaults to the directory name,
   `owner` can come from the command line, categories are optional —
   *"I suppose these can all be warnings if not present."* bernt-matthias
   conceded the `type` case and asked about the rest; the thread ended there
   on 2020-12-16.

2. **It broke `test_valid_repos` and the fix didn't work.** [verified, CI + local]
   The first commit (02a2411e) also flipped *"No .shed.yml file found,
   skipping."* from `info` to `error`. `tests/data/repos/suite_1` has no
   `.shed.yml` — legitimately — so it started failing. c5602de2 tried to carve
   out an exception with
   `and realized_repository.repository_type != REPO_TYPE_UNRESTRICTED`.

   That is wrong two ways. `suite_1` is realized into a temp directory, so
   `shed_repo_type` (`shed/__init__.py:782`) infers **unrestricted** from the
   tmpdir basename rather than from the `suite_` prefix — the carve-out matches
   exactly the case it meant to exclude. And the guard suppresses the `return`
   rather than the check, so control falls into `open(shed_yaml)` and dies:

   ```
   .. ERROR: Failed to parse .shed.yml file [[Errno 2] No such file or directory: '/tmp/tmpfqhs57k6/.shed.yml']
   ```

   Probing each fixture in `test_valid_repos` under the PR's code confirms two
   break, not one: `suite_1` exits 1 on that parse error, and `workflow_1`
   exits 1 on `Repository does not define: categories` — it has no
   `categories` key. So the missing-key errors of objection (1) are also
   what broke the suite; c5602de2 only ever addressed half of it.
   (`single_tool` and `package_1` stay at 0.)

   `test_valid_repos` is nonetheless the *only* failing test in all three red
   CI jobs on `3985b6d3` (`unit-quick` ×2,
   `unit-nonredundant-...-nogx`). Everything else is green — the blast radius
   is small.

   The three `.shed.yml` fixture edits (`bad_invalid_tool_xml`,
   `multi_repos_nested/cat1`, `/cat2`) exist only to paper over the same
   breakage. They change what those fixtures exercise.

## The design call the PR never made

The PR promoted `_lint_if_present`'s **entire** payload to error. That sweeps in
checks the tool shed does not care about:

| check | shed behavior | should be |
| --- | --- | --- |
| `validate_repo_name` | HTTP 400 | **error** |
| `validate_repo_owner` | HTTP 400 | **error** |
| type not in `VALID_REPOSITORY_TYPES` | rejected | **error** |
| category not in `CURRENT_CATEGORIES` | `find_category_ids` raises (`shed/interface.py:80`) | **error** |
| `package_`/`suite_` name prefix rules | uploads fine | warn |
| package outside "Tool Dependency Packages" | uploads fine | warn |
| no categories at all | `category_ids=[]`, uploads | warn |

Promoting the bottom three would newly break downstream CI on pure convention —
the opposite of what the issue asks for.

## The rescue

Branch `rescue-1111-shed-lint-levels`, one commit on top of the PR
(`a21dbd6e`), bernt-matthias' seven commits preserved in history. Net diff vs
master: `planemo/shed_lint.py` plus tests. **No fixture modified.**

- `_lint_if_present` gains a keyword-only `fatal`, documented with the rule:
  *error = the shed refuses the value; warn = convention.*
- `_validate_repo_type` split into `_validate_repo_type` (unknown type, fatal)
  and `_validate_repo_type_conventions` (prefix rules, warn).
- `_validate_categories` split into `_validate_categories` (unresolvable
  categories, fatal) and `_validate_category_conventions` (empty list, package
  placement, warn).
- Unparsable `.shed.yml` → error (kept from the PR; uncontested).
- Missing-key errors **dropped**. `--ensure_metadata` /
  `lint_shed_metadata` (`shed_lint.py:239`) is the existing abstraction for
  "this repository lacks the fields needed for automated creation", and it is
  already tested (`test_ensure_metadata`). Reinventing it inline was the thing
  nsoranzo pushed back on.
- `lint_shed_yaml`'s existence check restored to master (`info` + `return`).

Incidental fix: the old `_validate_categories` re-initialized
`unknown_categories = []` *inside* the per-category loop and let `msg` be
last-write-wins across three unrelated checks, so at most one complaint ever
survived and usually the wrong one. The split version reports each independently.

### Tests

`test_shed_metadata_rejected_by_shed_is_an_error` — `--fail_level error` on
`bad_repo_name` and on a new `bad_unknown_category` fixture must exit 1.
Red on master (exit 0), green after. [verified, local]

`test_shed_metadata_conventions_stay_warnings` — `--fail_level error` on
`bad_package_category` must still exit 0. Passes on master too; it is a
guard-rail against re-promoting conventions, not a regression test.

### Verification

- `tests/test_shed_lint.py` — 9 passed.
- All ten `tests/test_shed*.py` modules — 63 passed, 2 skipped.
- black 26.1.0, isort 5.13.2, ruff 0.1.9 — clean.
- mypy reports only the 7 pre-existing errors present on master; none in
  changed lines.

## Follow-ups (not in this change)

- `lint_shed_metadata` (`shed_lint.py:240-246`) raises `KeyError` when a field
  is absent: it sets `found_all = False` and then unconditionally evaluates
  `realized_repository.config[key]`. Needs `elif`. Pre-existing, unrelated to
  this PR, but adjacent and cheap.
- `CURRENT_CATEGORIES` is a hardcoded list regenerated by
  `scripts/categories.py`. Now that an unknown category is an error, a stale
  list produces false failures. Worth a note in the release changelog, or
  regenerating it as part of this change.
- No `bad_repo_owner` fixture exists; owner promotion is covered by code reading
  only.

## Open questions

- Push the rescue to `bernt-matthias:topic/shed_lint_warn` (needs his branch,
  and would rewrite the PR's content), or open a fresh PR crediting him and
  close 1111?
- Regenerate `CURRENT_CATEGORIES` in the same PR?
