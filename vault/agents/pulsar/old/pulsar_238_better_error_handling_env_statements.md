# PR 238 — Better error handling when setting up environment statements

**Repo:** galaxyproject/pulsar · **PR:** [#238](https://github.com/galaxyproject/pulsar/pull/238) (natefoo, opened 2020-11-12) · **State:** OPEN, CONFLICTING · **Commit:** `64bd6ec` on `natefoo:stringify-env-value` · **Files:** `pulsar/managers/util/env.py` (one hunk) · **Reviewed:** 2026-09-14

**Rescue PR:** [#504](https://github.com/galaxyproject/pulsar/pull/504) (opened 2026-09-14, MERGEABLE) · branch `rescue-238-env-errors` in `galaxyproject/pulsar` · `f38077a` (natefoo, cherry-picked) + `156cc13` (correction) · **Base:** `07e1d03` (`origin/master`)

## Conclusion

**Still correct and still relevant.** Neither half of the patch has landed, the bugs
reproduce verbatim on current `master`, and the config format that makes them likely (YAML
`job_conf`) is now the default rather than the exception. The conflict is cosmetic.

It is not quite complete, though — it leaves one sibling `KeyError` open, and the same bug
lives in Galaxy's copy of this file.

## What it changes

```python
-    name = env['name']
-    value = __escape(env['value'], env)
-    return '%s=%s; export %s' % (name, value, name)
+    name = env.get('name', None)
+    if name:
+        value = __escape(str(env['value']), env)
+        return '%s=%s; export %s' % (name, value, name)
+    raise RuntimeError("Invalid env definition, must be one of %s: %s" % (str(VALID_ENV_OPTIONS), str(env)))
```

Two independent fixes: a legible error for a malformed entry, and `str()` coercion of the value.

## Verification against current master

`env_to_statement` on `origin/master` (`pulsar/managers/util/env.py`), unpatched:

| input | master | with 238 |
|---|---|---|
| `dict(exec='module load java')` — YAML key typo | `KeyError: 'name'` | `RuntimeError: Invalid env definition…` |
| `dict(name='THREADS', value=6)` — YAML int | `AttributeError: 'int' object has no attribute 'replace'` | `THREADS="6"; export THREADS` |
| `dict(name=None, …, value=None)` — XML path | `AttributeError: 'NoneType' object has no attribute 'replace'` | `RuntimeError: Invalid env definition…` |
| `dict(name='X', value=True)` — YAML bool | `AttributeError: 'bool' …` | `X="True"; export X` |
| **`dict(name='FOO')`** — name, no value | `KeyError: 'value'` | **`KeyError: 'value'`** ← still open |

## Why the failure modes are real, and likelier now than in 2020

Two paths feed `env` into Pulsar, and they normalize differently.

**XML** — `JobConfiguration.get_envs` (`lib/galaxy/jobs/__init__.py:704`) always emits all five
keys, filling absent attributes with `None`:

```python
dict(name=param.get("id"), file=param.get("file"), execute=param.get("exec"),
     value=param.text, raw=util.asbool(param.get("raw", "false")))
```

So on this path the keys are always present and `env['name']` never `KeyError`s — but `name`
and `value` can both be `None`, and `__escape(None)` dies on `None.replace`. Row 3 above.

**YAML** — no normalization at all. `lib/galaxy/jobs/__init__.py:501-503` passes
`environment_dict["env"]` straight through to `JobDestination`, typed
`env: list[dict[str, Any]]`. Whatever the operator wrote in `job_conf.yml` arrives at
`env_to_statement` verbatim, so entries carry **only** the keys the operator typed. Hence the
bare `KeyError`.

Two specific operator mistakes this makes easy:

- **`exec:` vs `execute:`.** The XML attribute is `exec` (`param.get("exec")`) but the dict key
  — and therefore the YAML key — is `execute`. Anyone migrating an XML `job_conf` to YAML will
  naturally write `exec:`, and be rewarded with `KeyError: 'name'`.
- **Unquoted scalars.** `job_conf.sample.yml:728-732` quotes its values (`value: '-Xmx6G'`,
  `value: "'5'"`), but `value: 6` for a numeric env var is the obvious thing to write, and YAML
  hands over an `int`.

In 2020 XML was the common case; YAML `job_conf` is now the documented default, so the weaker
path is the one most deployments are on.

## Gaps for a rescue

1. **`KeyError: 'value'` survives.** `env['value']` stays a subscript. `- name: FOO` with the
   value on a mistyped key still produces the same opaque crash the PR sets out to remove.
   Use `env.get("value")` and fold a missing value into the same `RuntimeError`.
2. **Galaxy has the identical bug.** `lib/galaxy/jobs/runners/util/env.py` is the same function,
   unfixed; Pulsar's copy was vendored from it (`d254d8c` "Bring in updated Galaxy runner util
   code"). Both files have drifted only cosmetically since — f-strings, black, walrus, typing —
   and neither ever got this fix. A Pulsar-only patch fixes remote jobs and leaves local ones
   crashing the same way. The fix belongs in both, Galaxy first, to keep the vendoring seam honest.
3. **`str()` on a YAML bool is subtly wrong.** `value: true` becomes `X="True"` — Python's
   capitalization, not the `true` the operator wrote. Not a crash, and better than today, but
   worth a deliberate decision rather than a side effect.
4. **`VALID_ENV_OPTIONS = ('file', 'execute', 'name/value')`** is a module constant used once, in
   its own error string. Fine, but inlining it keeps the module's surface smaller.

## Test coverage

`env.py` has **no executed tests**. Nothing under `test/` imports `env_to_statement`, and the
docstring examples never run — `pytest.ini` is two lines (`log_level = DEBUG`) with no
`--doctest-modules`, and neither `tox.ini` nor the `Makefile` adds it. The 80% coveralls figure
on the PR counts the import, not the behavior.

A rescue should add `test/env_test.py` covering the table above as real assertions, red-to-green.
Adding `--doctest-modules` is a separate, broader question — it would switch on doctests across
the whole package at once.

## Conflict

Purely cosmetic. Master reformatted to f-strings and added `Dict[str, str]` annotations
(`f2aee5d`, "Add typing for managers") over the same three lines the patch rewrites. Re-applying
the intent onto current master is mechanical.

Note the annotation `env: Dict[str, str]` already *claims* values are strings — the type checker
believes what fix 2 exists to handle. Galaxy's own `JobDestination.env` is typed
`list[dict[str, Any]]`, which is the honest signature. Worth correcting to `Dict[str, Any]` in
the same change, or the fix reads as dead code to mypy.


## Rescue — 2026-09-14

Opened as [#504](https://github.com/galaxyproject/pulsar/pull/504). Branch `rescue-238-env-errors`
off `07e1d03`. Two commits:

- `f38077a` natefoo's `64bd6ec`, cherry-picked with original authorship. Conflict was
  cosmetic; resolved into master's style (f-strings, double quotes, per the black note in
  `setup.cfg`), semantics untouched.
- `156cc13` correction: closes the `KeyError: 'value'` gap by reading `value` with `.get` and
  folding a missing value into the same `RuntimeError`. Tests `value is not None` rather than
  truthiness so `value: 0` and `value: ''` still produce `N="0"` / `N=""`. Retypes `env` as
  `Dict[str, Any]` — under `Dict[str, str]` the `str()` coercion reads as dead code to mypy.

Verified: all five table rows above now behave; the 7 existing doctests pass untouched; flake8
and mypy clean.

Per the user's instruction, **no tests were added** — `env.py` still has no executed coverage.
Gaps 2 (Galaxy's identical copy) and 3 (YAML bool stringifies to `True`) remain open and are
called out in the PR description.
