# PR 22811 — Fix TypeError in regex validator for non-string values

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/22811 |
| **Author** | SAY-5 (Sai Asish Y) — outside contributor, `CONTRIBUTOR` association |
| **Base branch** | `dev` |
| **Head reviewed** | `910fcc5d03` (single commit, authored 2026-06-02) |
| **Merge base** | `c6e0ee3f25`; `git merge-tree` against current `dev` reports a **clean merge**, 0 conflicts |
| **Size** | 2 files, +15 / −1 (one production line) |
| **State** | OPEN, not a draft. Zero reviews, one comment — the author's own ping on 2026-08-16. Label `area/testing`. Closes #22689 (Sentry-filed). |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/22811` |
| **Verdict** | **Request changes — but only one token of it.** The diagnosis is right, the layer is right, and the fix converts an unhandled `TypeError` that kills a whole workflow invocation into a clean user-facing validation message. But the coercion is gated on truthiness (`str(val) if val else ""`), so `0`, `0.0` and `False` still collapse to `""` — meaning an integer parameter whose value is **zero** still fails its own `[0-9]+` validator, with a message that names `'0'` while the regex actually ran against `''`. `str(val) if val is not None else ""` is shorter and correct (P1-1). Beyond that: the sibling method three lines up (`statically_validate`, `:176-178`) still hard-rejects the exact same values with `Wrong type found value`, so the class now holds two contradictory positions on non-strings in twelve lines (P2-1); and the test fixture picks `type="integer"`, a param/validator combination the *model* layer forbids outright (`parameters.py:417`) — `type="text"` would exercise the same path and match the real crash vector (P2-3). All three are small. This is a good first patch from an outside contributor and it should land. |

---

## What it does

**One production line**, `lib/galaxy/tool_util_models/parameter_validators.py:186`:

```python
-            match = regex.match(expression, val or "")
+            match = regex.match(expression, str(val) if val else "")
```

**One test**, `test/unit/app/tools/test_parameter_validation.py:144-156` — a new
`test_RegexValidator_non_string_value` asserting that an `integer` param with value `10`
passes `[0-9]+` and fails `[a-z]+` with the normal message rather than raising.

---

## The crux: is `str()` coercion the right fix, or is it papering over a type bug upstream?

This is the whole review, so I traced it rather than guessing.

### The layer question resolves cleanly — and in the PR's favour

Galaxy's usual failure mode is the model layer and the runtime layer independently implementing
the same logic, so a fix in one misses the other. **That is not the case here.**
`lib/galaxy/tools/parameters/validation.py:69-81` — the runtime `RegexValidator` — has no
implementation of its own:

```python
class RegexValidator(Validator):
    def validate(self, value, trans=None):
        RegexParameterValidatorModel.regex_validation(self.expression, value, self)
```

The two layers were already collapsed onto the model's static method, and the Sentry traceback in
#22689 shows exactly that delegation (`validation.py:81` → `parameter_validators.py:186`). So
patching `regex_validation` genuinely fixes the runtime path. There is no parallel unfixed
implementation. Good — and worth saying in the PR body, because it is the reason a
`tool_util_models` edit is the correct place for a runtime crash fix.

The unfixed sibling is not in another package; it is **three lines above**, in the same class. See
P2-1.

### Where the non-string actually comes from — and why the *reported* scenario isn't quite the one in the description

The description says "an integer parameter value coming through a workflow." The traceback points
at `lib/galaxy/workflow/modules.py`, `ParameterInputModule.execute`. On current `dev` that is
`:1685-1716`:

```python
input_value = self.get_input_value(progress, invocation_step)
input_param = self.get_runtime_inputs(self)["input"]
try:
    if not isinstance(input_value, (model.DatasetInstance, ...)):
        input_param.validate(input_value, trans)          # :1708
except ValueError as e:
    raise FailWorkflowEvaluation(...)                      # :1709-1716
```

Two things fall out of reading this next to `get_input_value` (`:1721-1736`):

**1. The value is never coerced to the parameter's declared type before validation.**
`get_input_value` returns `progress.inputs_by_step_id[step.id]` verbatim — the raw JSON the API
caller supplied, or the raw output of an upstream parameter step. There is no
`input_param.from_json(...)` between that and `:1708`. So *any* primitive JSON type can reach
*any* validator, regardless of what the step declares. The code even acknowledges the shape of the
problem in the comment at `:1705-1707` ("workflow parmater value validators are likely most
important for parent workflows, where they run on primitive values" — note the typo, upstream's,
not mine).

**2. The likeliest real-world vector is a `text` parameter, not an integer one.** The workflow
editor only offers a regex validator for two parameter types — `modules.py:1394`
(`param_type == "text"`) and `modules.py:1513` (`param_type == "directory_uri"`), both wired to the
same `regex_validator_definition()` helper at `:1351-1378`. It is never offered for `integer`,
`float`, `boolean` or `color`. So an editor-built workflow that hits this is a **text** parameter
carrying a regex validator, handed a JSON number by an API caller or by a connected parameter
output. (An `integer` step with a regex validator is reachable too — `:1636-1637` passes
`parameter_def["validators"]` through with no type check at all — but only via a hand-written or
gxformat2-generated workflow.)

**That reframing is the PR's strongest argument and it isn't in the body.** A *text* parameter fed
the JSON number `10` should be regex-checked as `"10"`. There is no upstream type bug to fix in
that scenario — `10` is a legitimate value for a text-ish workflow parameter arriving over JSON,
and stringifying it is exactly what every other consumer does (`basic.py`'s
`to_param_dict_string` at `:427-431` coerces the same way; `to_text` at `:420` uses `unicodify`).
Coercion in the validator is the right call.

### Severity of what it fixes: higher than a one-liner suggests

`modules.py:1709` catches **`ValueError` only**. A `TypeError` sails straight past it, so today the
whole invocation dies as an unhandled exception ("Failed to execute scheduled workflow" in the
Sentry report) instead of producing an `InvocationFailureWorkflowParameterInvalid` with a readable
`details` string. This PR turns an opaque scheduler crash into a proper user-facing validation
message. That is worth landing.

### So: papering over, or correct?

**Correct, with a caveat worth stating in the body.** The minimal fix is here. The *broader* fix —
normalizing `input_value` through `input_param.from_json()` at `modules.py:1692-1708`, so every
validator gets a correctly-typed value rather than each one defending itself — is the real
abstraction, and it is not this contributor's job. See P2-2.

---

## P1 findings

### P1-1 — The coercion is gated on truthiness, so `0`, `0.0` and `False` are still broken

`lib/galaxy/tool_util_models/parameter_validators.py:186`. `str(val) if val else ""` reuses the
truthiness test from the old `val or ""` expression. The old expression *had* to conflate
"is None" with "is falsy" because it had no other tool; the new one doesn't, and inherits the bug
for free. Measured:

| `val` | this PR produces | matches `[0-9]+`? | `str(val) if val is not None else ""` |
|---|---|---|---|
| `10` | `'10'` | yes | `'10'` |
| **`0`** | **`''`** | **no** | `'0'` |
| **`0.0`** | **`''`** | **no** | `'0.0'` |
| **`False`** | **`''`** | **no** | `'False'` |
| `True` | `'True'` | no | `'True'` |
| `3.5` | `'3.5'` | yes | `'3.5'` |
| `None` | `''` | no | `''` (unchanged) |
| `''` | `''` | no | `''` (unchanged) |

So an integer workflow parameter with the value **zero** and
`<validator type="regex">[0-9]+</validator>` still fails validation. Zero is not an exotic value;
it is the single most ordinary integer a parameter takes.

It gets worse one line down. `:187` reports `value_to_show=val`, i.e. the *raw* value:

```
Parameter 'blah': Value '0' does not match regular expression '[0-9]+'
```

The message names `'0'` while the regex was actually run against `''`. A user reading that has no
path to understanding it — the string it names would have matched. That's a worse outcome than the
`TypeError`, which at least announced itself.

The fix is one token:

```python
match = regex.match(expression, str(val) if val is not None else "")
```

Shorter, correct, and it preserves the `None -> ""` behaviour the PR description cites as the
existing intent. This is the only thing standing between the PR and a merge.

---

## P2 findings

### P2-1 — The sibling method twelve lines up still hard-rejects exactly these values

`RegexParameterValidatorModel` now holds two contradictory positions on non-strings inside one
class body:

```python
    def statically_validate(self, value: Any) -> None:          # :176
        if value and not isinstance(value, str):                # :177
            raise ValueError(f"Wrong type found value {value}") # :178
        RegexParameterValidatorModel.regex_validation(self.expression, value, self)

    @staticmethod
    def regex_validation(expression: str, value: Any, validator) -> None:   # :182
        ...
            match = regex.match(expression, str(val) if val else "")        # :186
```

`statically_validate` is not dead code and it is not the same entry point. It has three live
callers, none of which go through `regex_validation` first:

- `lib/galaxy/tool_util_models/parameters.py:361`, inside `pydantic_validator_for`
  (`:350-363`) — the model-layer validation path for tool state.
- `lib/galaxy/model/dataset_collections/types/sample_sheet_util.py:169-173` — sample sheet
  column values. This one is concrete: `SampleSheetColumnType`
  (`lib/galaxy/tool_util_models/sample_sheet.py:30-32`) includes `"int"`, `"float"` and
  `"boolean"`, `SampleSheetColumnValueT` (`:34`) is `Union[int, float, bool, str, None]`, and the
  column's `validators` field (`:45`) accepts any `AnySafeValidatorModel` —
  which includes regex (`parameter_validators.py:170`, `_safe = True`; union at `:469`). So a
  regex validator on an `int` column surfaces to the user as
  `RequestParameterInvalidException("Wrong type found value 10")`.
- `lib/galaxy/util/config_templates.py:351-359`, `_run_variable_validator` — same story for an
  integer template variable: `Variable 'x' failed validation: Wrong type found value 10`.

"Wrong type found value 10" is developer jargon leaking to an end user, and after this PR it is
*also* inconsistent with what the identical validator does three lines away at runtime. Whichever
policy the maintainers want, the two should agree. The shape that leaves something behind:

```python
    @staticmethod
    def _as_text(value: Any) -> str:
        return "" if value is None else str(value)
```

called from both, with `:177-178`'s guard dropped. One helper, one policy, and it makes P1-1
structurally impossible to reintroduce.

Fair to treat as out of scope for a first-time contributor's crash fix — but it is the reviewable
design question on this PR, and it should be answered rather than left implicit.

### P2-2 — Five validators in this file, four different non-string policies, no shared helper

The user's standing concern is whether a change reuses an existing abstraction or leaves a new one
behind. Here there is no abstraction to reuse and this PR adds a fourth spelling rather than a
first helper. Census of `lib/galaxy/tool_util_models/parameter_validators.py`:

| validator | line | policy on a non-string |
|---|---|---|
| `regex.statically_validate` | `:176-178` | **raise** `Wrong type found value` |
| `regex.regex_validation` | `:186` | **coerce**, but only if truthy (this PR) |
| `in_range.statically_validate` | `:199-200` | **skip** — `if isinstance(value, (int, float))` |
| `length.statically_validate` | `:233-235` | **skip** — `if isinstance(value, str)`; a `length` validator on an int is a silent no-op |
| `empty_field` / `no_options` | `:301`, `:317` | `is not None` checks, type-agnostic |

`length` is the direct analogue of the reported bug and it is *silently* wrong rather than loudly
wrong: `<validator type="length" min="2"/>` on a value that arrives as `10` simply doesn't run.
Same crash vector (`modules.py:1708`), no exception, no Sentry issue, no fix here.

**On the "reuse an existing helper" question specifically: there isn't one, and reaching for
`galaxy.util.unicodify` would be a layering violation.** `parameter_validators.py:1-26` imports
only `typing`, `pydantic`, `typing_extensions` and `regex` (with a stdlib `re` fallback) — this
module is deliberately dependency-free because it ships as the standalone `galaxy-tool-util-models`
package (split out in `f91012244b`). So an in-package coercion is the correct answer; it just
should exist once, per P2-1, and ideally be shared with `length`.

### P2-3 — The test's fixture uses a param/validator combination the model layer forbids

`test/unit/app/tools/test_parameter_validation.py:145-148` builds:

```xml
<param name="blah" type="integer" value="10">
    <validator type="regex">[0-9]+</validator>
</param>
```

That works only because the runtime (`basic.py`) attaches whatever validators the XML declares with
no type check. Both the model layer and the documentation say it is invalid:

- `lib/galaxy/tool_util_models/parameters.py:417` —
  `NumberCompatiableValidators = Union[InRangeParameterValidatorModel,]`, applied at `:427`
  (integer) and `:468` (float). Regex is in `TextCompatiableValidators` (`:263`) only.
- `lib/galaxy/tool_util/xsd/galaxy.xsd:5569` — "### Validators for textual inputs
  (``text``, ``select``, ...)" lists ``regex`` at `:5571`; `:5588` — "### Validators for numeric
  inputs (``integer``, ``float``)" lists only ``in_range`` at `:5590`.

So this PR quietly settles a live disagreement — model says regex-on-a-number is illegal, runtime
allows it — in the runtime's favour, and enshrines the losing side in a test fixture. That isn't
necessarily the wrong call, but it deserves a sentence in the body rather than a fixture.

**Concrete ask, and it makes the test better on its own terms:** switch the fixture to
`type="text"` and keep `p.validate(10)`. That exercises the identical code path
(`TextToolParameter.validate` at `basic.py:437-444` → `ToolParameter.validate` at `:347-354` →
`RegexValidator.validate`), matches the actual crash vector traced above (the editor only offers
regex validators on `text` and `directory_uri`), and doesn't depend on a contested tool shape.

---

## P3 findings

### P3-1 — Test coverage: red-to-green confirmed, but the P1 case is exactly what's missing

**No test was weakened.** Verified mechanically: `git diff c6e0ee3f25 HEAD --numstat` is
`14 0` on the test file and `1 1` on lib — the test change is purely additive, nothing deleted, no
assertion relaxed. The pre-existing `test_RegexValidator` (`:106-142`) is byte-identical, including
its negated-validator and list-value cases.

**Both halves of the new test are genuinely red without the fix.** With `val or ""` and `val=10`,
`regex.match(expression, 10)` raises `TypeError: expected string or buffer` — so `p.validate(10)`
at `:149` blows up, and the `assertRaisesRegex(ValueError, ...)` at `:150-156` fails too (a
`TypeError` is not a `ValueError`). Good.

**Placement is right.** `test/unit/tool_util/test_parameter_validator_models.py` is 28 lines and
only covers XML parse/validate of validator *definitions*; the behavioural regex tests have always
lived in `test/unit/app/tools/test_parameter_validation.py` (`test_RegexValidator` at `:106`,
`test_RegexValidator_global_flag_inline` at `:424`). No complaint.

**Gaps.** Nothing covers `0`, `None`, `False`, or a list of non-strings. The one-liner that would
have caught P1-1 before I did:

```python
        p.validate(0)   # currently raises: Value '0' does not match regular expression '[0-9]+'
```

Worth adding all four when P1-1 is fixed — they are one line each and they pin the whole falsy
frontier.

**Style nit.** `:150-156` inlines `self._parameter_for(...).validate(10)` inside the `with` block.
Every other test in the file binds `p = self._parameter_for(...)` on its own line first (`:106`,
`:125`, `:145`, `:158`, ...). Two lines instead of one and it reads like its neighbours.

### P3-2 — `str()` on non-scalars: silently matching a Python repr is arguably worse than raising

The coercion is unbounded. `regex_validation` unwraps one level of list (`:183-184`) and
stringifies whatever is left, so a `dict` becomes `"{'a': 1}"` and a nested list becomes
`"[1, 2]"`. Before this PR those raised `TypeError`; now a regex silently matches (or fails)
against a Python repr, with the mismatch invisible in the message.

In practice this is hard to reach — the model layer won't attach a regex validator to a `data` or
collection param, and `modules.py:1696-1704` skips validation entirely for `DatasetInstance` /
`HistoryDatasetCollectionAssociation` / `DatasetCollection` / `DatasetCollectionElement`. But it is
free to bound: coercing only `str | int | float | bool` and leaving anything else to raise keeps
the fix targeted at the values that actually show up in workflow parameter state. Optional; raise
it as a question, not a demand.

### P3-3 — Imports, freshness, and CI

- **Imports**: none added at either file. No function-local import question arises.
- **Freshness**: the PR is ~12 weeks old (`910fcc5d03`, 2026-06-02). `dev` has touched
  `parameter_validators.py` exactly once since the merge base — `bec3d3ad9c` "Drop support for
  Python 3.8", which rewrote `Optional[Union[float, int]]` to `float | int | None` throughout the
  file but left `:186` untouched. `git merge-tree` against current `dev` produces **zero
  conflicts**. `git log -L 186,186:` confirms the `val or ""` line is unchanged since the file was
  created in `f91012244b` — **nothing upstream has fixed this**, so the PR is still live and needed.
- **CI has not run the new test.** `gh pr checks 22811` lists only three checks — "Assign labels
  and milestone", CircleCI `get_code_and_test`, and "update-title" — all passing. The GitHub
  Actions unit-test matrix that would execute `test/unit/app/tools/test_parameter_validation.py`
  does not appear at all. A rebase onto current `dev` to re-trigger the full matrix is worth asking
  for alongside the P1-1 fix.
- **Description/comment mismatch.** The author's ping comment (2026-08-16) describes the change as
  "Small isinstance guard in the regex validator." There is no `isinstance` guard in the diff — it
  is a truthiness-gated `str()`. Trivial, but a reviewer skimming that comment will go looking for
  something that isn't there. (The PR body itself is accurate and unusually well-written for a
  first patch — it names the mechanism, the scenario and the intent.)

---

## Suggested review comment (constructive framing for a first-time contributor)

> Nice catch, and the diagnosis is right — `RegexValidator` delegates straight to this static
> method (`tools/parameters/validation.py:80-81`), so `tool_util_models` really is the place to fix
> it, and the `TypeError` escapes the `except ValueError` in `workflow/modules.py:1709` today, so
> this turns a dead invocation into a readable error. Two small things before it lands:
>
> 1. `str(val) if val else ""` still sends `0`, `0.0` and `False` to `""` — so an integer parameter
>    with the value `0` still fails `[0-9]+`, and the message reports `'0'` while the regex ran on
>    `''`. `str(val) if val is not None else ""` fixes it and is shorter. A `p.validate(0)` case in
>    the test would pin it.
> 2. Could the test fixture use `type="text"` instead of `type="integer"`? Same code path, and it
>    matches the actual scenario — the workflow editor only offers regex validators on `text` and
>    `directory_uri` params (`workflow/modules.py:1394`, `:1513`), so the real crash is a text
>    parameter handed a JSON number. `NumberCompatiableValidators`
>    (`tool_util_models/parameters.py:417`) doesn't allow regex on integers at all.
>
> Separately (not for this PR): `statically_validate` twelve lines up still raises
> `Wrong type found value` on the same values, which reaches users through sample sheet columns and
> config templates. Might be worth a single `_as_text` helper used by both.

---

## Verification

Per instruction, **no Galaxy test suite was run** — no venv bootstrap, no pytest, no
`run_tests.sh`. Everything below is static analysis plus one standalone Python snippet that touches
no Galaxy code. Nothing was posted to GitHub; nothing in the worktree was edited
(`git status --porcelain` clean).

**Verified by execution:**

- The falsy-coercion table in P1-1 — `uv run python` over stdlib `re` with the two candidate
  expressions across ten value shapes. No Galaxy import involved.
- `git diff c6e0ee3f25 HEAD --numstat` → `1 1` / `14 0`, establishing the test change is purely
  additive (the "was a test weakened?" question).
- `git merge-tree $(git merge-base HEAD FETCH_HEAD) HEAD FETCH_HEAD` → zero `<<<<<<<` markers;
  clean merge against current `dev`.
- `git log --oneline c6e0ee3f25..FETCH_HEAD -- lib/galaxy/tool_util_models/parameter_validators.py`
  → one commit, `bec3d3ad9c` (Python 3.8 drop). `git log -L 186,186:` → line unchanged since
  `f91012244b`.
- `gh issue view 22689` for the Sentry traceback; `gh pr view 22811 --json ...` for state, reviews,
  comments and labels; `gh pr checks 22811` for the three-check CI picture.
- **Every line number in this note was read back from the file at `910fcc5d03`** via targeted
  `sed -n 'Np'`, not transcribed from diff offsets.

**Verified by reading, not execution:**

- The delegation chain `modules.py:1708` → `basic.py:437` → `basic.py:347` → `validation.py:80` →
  `parameter_validators.py:186`, matched against the Sentry frames in #22689. Line numbers in the
  Sentry report (`basic.py:435`/`:343`, `validation.py:81`, `parameter_validators.py:186`) are from
  an older release and sit within a few lines of the current ones — the structure matches exactly.
- `get_input_value` returning `progress.inputs_by_step_id[...]` uncoerced (`modules.py:1721-1736`)
  — this is the basis for the "no upstream type bug" conclusion. I read the call graph; I did not
  drive an invocation through it.
- The editor-offers-regex-only-for-text-and-directory_uri claim (`modules.py:1351-1378`, `:1394`,
  `:1513`) — read from `get_inputs`, not observed in the client.
- The three `statically_validate` callers and the sample sheet / config template types
  (`parameters.py:361`, `sample_sheet_util.py:169-173`, `config_templates.py:351-359`,
  `sample_sheet.py:30-34`, `:45`) — enumerated by grep and read.
- `NumberCompatiableValidators` / XSD documentation quotes.

**Not verified:**

- Did not run `test/unit/app/tools/test_parameter_validation.py`, so the red-to-green claim in
  P3-1 is reasoned from `regex.match`'s behaviour on an `int` (which the Sentry traceback itself
  demonstrates) rather than observed. **Recommend running it** — with and without the lib line —
  before merge, since CI has not.
- Did not start a Galaxy server, so no end-to-end reproduction of the invocation failure and no
  confirmation that the `FailWorkflowEvaluation` path produces the message I expect.
- Did not run mypy over `tool_util_models`, though the change is type-neutral
  (`regex.match` takes `str`; the new expression always yields `str`, the old one did not).
- Did not check whether any workflow in the wild depends on the current `TypeError` (it can't
  usefully — it fails the invocation).
- Did not survey Tool Shed tools for `length` validators on non-string params (the P2-2 silent
  no-op); only the in-tree behaviour was read.
