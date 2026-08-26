# PR 23170 — Remove legacy unqualified repeat synthesis from test-case resolution

<https://github.com/galaxyproject/galaxy/pull/23170> — `guerler`, draft, branch `toolrequests.004`, base `dev`.
Follow-up to [#23084](https://github.com/galaxyproject/galaxy/pull/23084) (merged 2026-07-23).

Deletes the "bare parameter name inside a repeat implies a repeat instance" synthesis from
`_repeat_inputs_to_array`, and instead teaches `parse_tool_test_descriptions` to leave `request`
unset (falling back to the legacy `/api/tools` submission path) when a test case has inputs that
map to no parameter. The direction is right — the synthesis was a guess that produced silently
wrong async requests, and replacing a guess with an explicit "I can't represent this" signal that
reuses the existing `request_unavailable_reason` mechanism is a genuine simplification. The three
touched functions all get smaller and more single-purpose, and nothing is hand-rolled that already
existed.

**Verdict: sound direction, one blocking bug — reproduced against a live Galaxy, and confirmed a
regression** (framework tools on the async path: 2 passed at the merge-base, 1 failed at PR head;
see finding 1). The fallback-detection predicate
(`_input_name_was_handled_by_legacy_fallback`) matches against *visited paths*, not *consumed*
inputs. For any repeat with `min` set, the padded-empty instances put the qualified path into
`handled_inputs`, so the now-orphaned bare input is classified as "handled", `unhandled_inputs`
comes back empty, and a request is built containing empty repeat instances — no fallback, no
error, a request that will fail server-side. Without `min` the same tool degrades correctly. Also
worth resolving before merge: a silent semantic change to `test_case_validation`, and a stale
`validation_skipped_reason` that leaks between test cases.

Blast radius is limited today: `DEFAULT_USE_LEGACY_API` is `"always"`
(`lib/galaxy/tool_util/verify/interactor.py:90`), so normal CI never consumes `request` at all.
The async path is opt-in via `GALAXY_TEST_USE_LEGACY_TOOL_API`.

## What the change actually does

Three distinct edits, only two of which the PR body describes:

1. **`lib/galaxy/tool_util/parameters/case.py:508`** — `_repeat_inputs_to_array` loses its
   `parameters` argument and its trailing ~14-line synthesis block. It now only does what its name
   says: ask `visitor.repeat_inputs_to_array` for `<repeat>`-qualified inputs (`queries_0|input2`),
   with the pre-existing cascade at `case.py:511-521` that progressively strips leading
   conditional/section segments. If nothing qualifies, it returns `[]`.

2. **`lib/galaxy/tool_util/parameters/case.py:325-336`** — the
   `_input_name_was_handled_by_legacy_fallback` check moves from the `validate` branch up into the
   loop that *builds* `unhandled_inputs`. Validation behaviour is byte-for-byte identical; what
   changes is that `unhandled_inputs` now means "truly unrepresentable" rather than "not an exact
   `handled_inputs` hit". That is the enabler for edit 3 — but it also silently changes
   `test_case_validation` (see finding 2).

3. **`lib/galaxy/tool_util/verify/parse.py:83-93`** — when `unhandled_inputs` is non-empty, skip
   building `TestRequestAndSchema` and record a `validation_skipped_reason` instead. The interactor
   then either falls back to the legacy API (`interactor.py:798`) or raises a reasonably legible
   `AssertionError` naming the reason (`interactor.py:825-836`).

### Old vs. new behaviour, concretely

Using `test/functional/tools/multi_repeats.xml` (no `profile` attribute, so pre-24.2), test case 2:

```xml
<param name="input1" value="simple_line.txt"/>
<param name="input2" value="simple_line.txt"/>   <!-- input2 lives inside <repeat name="queries"> -->
<param name="input2" value="simple_line.txt"/>
```

- **Before:** synthesis rewrote the two bare `input2` entries to `queries_0|input2` /
  `queries_1|input2`, yielding `{"queries": [{"input2": …}, {"input2": …}]}`. A request was built
  and submitted async.
- **After:** `_repeat_inputs_to_array("queries", …)` returns `[]`, `handled_inputs` contains only
  `{input1, queries, more_queries}`, so `input2` is genuinely unhandled →
  `request is None`, `request_unavailable_reason = "could not build request: unhandled inputs
  ['input2', 'input2', 'more_queries_input', 'more_queries_input']"` → legacy API.

**Modern profiles are not newly broken.** For `profile >= 24.2`,
`_input_name_was_handled_by_legacy_fallback` short-circuits to `False` (`case.py:347`), so both
before *and* after this PR the bare name lands in `unhandled_inputs` and `test_case_state(validate=True)`
raises `Invalid parameter name found input2`, marking the test `error: True` at tool-load time.
That is exactly what `test_legacy_features_fail_validation_with_24_2` already asserts. Conversely,
the new `if validated_test_case.unhandled_inputs:` branch in `parse.py:83` is **unreachable for
profile >= 24.2** — `case_state` raises before returning. It is live only below 24.2. The comment
should say so; as written it reads like the general path.

So the compatibility answer to "is this a hard break for third-party tools?" is: **no new hard
break.** Tools that would break at 24.2 already broke at 24.2. Below 24.2 the change is a
degradation from "async request" to "legacy submission", which is by design — *except* for the
`min` case below.

---

## Findings

### 1. CONFIRMED — repeats with `min` set silently build an empty-instance request instead of falling back

**Reproduced end-to-end against a live Galaxy, and confirmed a regression introduced by this PR.**

Two framework test tools, added following the existing `async_*` convention from #23084
(`test/functional/tools/async_conditional_no_default_nested_data.xml` and siblings) and registered
in `sample_tool_conf.xml`:

- `async_min_repeat_unqualified.xml` — repeat with `min="1"`, param supplied by bare name
- `async_repeat_unqualified_no_min.xml` — byte-for-byte identical, no `min`

```sh
cd ~/projects/worktrees/galaxy/pr/23170
GALAXY_TEST_USE_LEGACY_TOOL_API=if_needed ./run_tests.sh -framework -id repeat_unqualified
```

| sources | async (`if_needed`) | sync (default `always`) |
|---|---|---|
| merge-base `0a3497a694` (pre-PR) | **2 passed** (1m46s) | — |
| PR head `5bc110a215` | **1 failed, 1 passed** (2m19s) | **2 passed** (1m36s) |

The failure is the server rejecting the request this PR builds:

```
FAILED test_tool[async_min_repeat_unqualified/1.0.0-0]
  galaxy.exceptions.RequestParameterInvalidException:
  1 validation error for DynamicModelForTool
  queries.0.input2
    Field required [type=missing, input_value={}, input_type=dict]
```

That is the exact error signature #23084 set out to eliminate, reintroduced through a different
door.

The no-`min` control passing is what isolates `min` as the trigger. It exercises the same legacy
anti-pattern and is *supposed* to stop working as an async request — it does, and degrades
gracefully to `POST /api/tools`, which is this PR's intended behaviour. Only the `min` variant
skips the fallback.

The handoff point, visible without a server via `parse_tool_test_descriptions`:

| tool | `request` | `request_unavailable_reason` |
|---|---|---|
| `async_min_repeat_unqualified` | `{'queries': [{}]}` | *(none — request built and submitted)* |
| `async_repeat_unqualified_no_min` | `None` | `could not build request: unhandled inputs ['input2']` |

The "before" run reverted only `case.py` and `parse.py` to the merge-base inside the same worktree,
so tool XML, config, database and interpreter were identical across both runs; sources were
restored afterwards (`git diff HEAD -- lib/` empty).

**Why**, in one line: `min` padding at `case.py:436-439` appends an empty instance; walking it still
registers the qualified path `queries_0|input2` in `handled_inputs` (`case.py:409`) even though
`context.for_inputs([])` resolved nothing into state (`case.py:459` returns `None`). The suffix match
in `_input_name_was_handled_by_legacy_fallback` (`case.py:340-355`) then reads that
visited-but-empty path as proof the bare name was handled —
`"queries_0|input2".endswith("|input2")`.

| | `handled_inputs` | `unhandled_inputs` | resulting `request` |
|---|---|---|---|
| before | `{queries, queries_0\|input2}` | `["input2"]` (ignored by `parse.py`) | `{"queries": [{"input2": …}]}` — correct |
| after | same | `[]` — masked | `{"queries": [{}]}` — **wrong, and submitted** |

Note the predicate's own docstring says the loose match is *deliberately* against "every visited
path, not consumed inputs". That was harmless while the predicate only suppressed a validation
error. This PR promotes it to gating request construction, which is a job it was not written for —
that is the root cause, not the `min` padding itself.

Because `parse.py:82` passes `validate=validate_on_load` (`False` below 24.2), `tool_state.validate`
never runs, so the malformed request is not caught locally. It is submitted to the async endpoint
and fails there with the exact class of error #23084 set out to eliminate
(`queries.0.input2 - Field required`).

Same shape applies one level down: an outer repeat given qualified in the test with an inner
repeat's params given bare. `_repeat_inputs_to_array` at `case.py:511-521` strips only *leading*
segments, so `rep_factorName_0|rep_factorLevel` never resolves from `rep_factorName_0|countsFile`,
and if `rep_factorLevel` has `min="1"` (as it does in the deseq2 shape at
`test/unit/tool_util/test_parameter_test_cases.py:441`) the instance is padded empty and masked.
That test passes only because its test case uses explicit `<repeat>` tags throughout.

### Fix

**No semantic decision is outstanding.** The no-`min` case already pins the intended behaviour: a
legacy unqualified repeat param is unrepresentable and falls back to `POST /api/tools`. `min`
changes nothing about that; it only bypasses the fallback. The target is "behave like the no-`min`
case", so the only question is which layer to fix.

**Surgical fix — implemented and verified** (uncommitted in the `pr/23170` worktree). Padded
instances are still walked, since they need their defaults populated; they just stop contributing
paths to `handled_inputs`:

```python
        repeat_instance_inputs = _repeat_inputs_to_array(state_path, context.inputs)
        supplied_instances = len(repeat_instance_inputs)
        if tool_input.min is not None:
            while len(repeat_instance_inputs) < tool_input.min:
                repeat_instance_inputs.append([])
        for i, _ in enumerate(repeat_instance_inputs):
            ...
            instance_handled_inputs = _merge_level_into_state(
                tool_input.parameters,
                context.for_inputs(repeat_instance_inputs[i]),
                repeat_state_array[i],
                repeat_instance_prefix,
            )
            # Instances past the ones the test actually supplied exist only to satisfy min.
            # Nothing resolved into them, so their paths must not count as handling a raw
            # input - the legacy suffix match would otherwise read queries_0|input2 as
            # covering a bare input2 that was in fact dropped.
            if i < supplied_instances:
                handled_inputs.update(instance_handled_inputs)
```

Red-to-green, framework async path:

| sources | result |
|---|---|
| merge-base (pre-PR) | 2 passed — 1m46s |
| PR head | **1 failed**, 1 passed — 2m19s |
| PR head + fix | **2 passed** — 1m42s |

Parameter unit suites with the fix (`test_parameter_test_cases.py` + `test_parameter_specification.py`):
**31 passed**.

This also covers the nested variant (an inner `min` repeat under a qualified outer repeat), since
those instances are padded by the same code path.

**Root fix — recommended as a follow-up, not for this PR.** The surgical fix does not remove the
class: any path that is visited but fails to resolve still masks its bare name. I could not
construct a second reachable instance, so the residue looks theoretical — but the heuristic itself
is avoidable. `LegacyTestInputResolver.input_for()` (`case.py:226`) already returns the exact
`ToolSourceTestInput` object that supplied each value; that is a precise consumption signal the code
computes and then throws away. Recording it would make `unhandled_inputs` exact and delete
`_input_name_was_handled_by_legacy_fallback` outright. The refactor is contained: both `input_for`
call sites (`case.py:459`, `case.py:539`) use the result to populate state, and `handled_inputs`
never escapes `case.py` — its only consumer is the loop at `case.py:325`.

Recommendation: land the surgical fix here, since the regression is this PR's; open the
consumption-tracking refactor separately rather than letting it ride along on a deletion PR.

### 2. CONFIRMED — `test_case_validation` becomes quietly more permissive below profile 24.2

`lib/galaxy/tool_util/parameters/case.py:358-375` calls `test_case_state(..., validate=False)` and
then raises on every entry of `unhandled_inputs` itself. That loop was **never** profile-gated —
pre-PR it saw the raw list. Moving the filter into `test_case_state` (`case.py:327`) silently
applies the `< 24.2` gate to it too.

Effect: `validate_test_cases_for_tool_source(tool_source, use_latest_profile=False)` on an
old-profile tool no longer reports `validation_error` for partially-qualified / elided-conditional
names that the loose fallback covers — e.g. `disambiguate_cond` test 1, the fixture behind
`test_parameter_test_cases.py:407`.

This is plausibly a *fix* (the two entry points now agree), but it is unmentioned in the PR body,
untested, and it changes a public API (`galaxy.tool_util.parameters.validate_test_cases_for_tool_source`,
re-exported at `lib/galaxy/tool_util/parameters/__init__.py:172`) that planemo consumes. Intentional?
If so, it deserves its own assertion.

The two in-tree callers are unaffected because both pass `use_latest_profile=True`:
`lib/galaxy/tool_util/linters/tests.py:185` and `lib/galaxy/tool_util/upgrade/__init__.py:258`.
The exposed surface is `lib/galaxy/tool_util/parameters/scripts/validate_test_cases.py:97` without
`--latest`.

### 3. CONFIRMED — `validation_skipped_reason` leaks across test cases within a tool

`lib/galaxy/tool_util/verify/parse.py:67` declares `validation_skipped_reason` *outside* the
`for i, raw_test_dict in …` loop at line 74. The PR adds a second write site at line 86, so once
test 2 records `"could not build request: unhandled inputs [...]"`, tests 3..n inherit that string
as their `request_unavailable_reason` even though their requests built fine.

Mostly cosmetic — the interactor only reads the reason when `request is None`
(`interactor.py:826`) — but it pollutes `ToolTestDescription.to_dict()` output and would produce a
misleading diagnostic for a later test that fails for an unrelated reason. The pre-existing
`except` branch at `parse.py:98` has the same defect; hoisting the reset to the top of the loop
body fixes both. Note this also means the `< 24.2` blanket reason at line 69 is *overwritten*
rather than augmented.

### 4. SPECULATIVE — `unhandled_inputs` semantics changed for external consumers

`TestCaseStateAndWarnings.unhandled_inputs` (`case.py:68`) is part of the returned dataclass of the
exported `test_case_state`. Its meaning shifts from "names with no exact `handled_inputs` hit" to
"names nothing could resolve". That is the better meaning and the reason the PR works, but the
field has no docstring recording either definition, and anything outside this repo reading it (most
plausibly planemo) sees a behaviour change with no note. A one-line comment on the field would
settle it.

### 5. Minor — duplicate names in the reason string

`case.py:325-330` appends per raw input, so the multi_repeats case yields
`['input2', 'input2', 'more_queries_input', 'more_queries_input']` in the user-facing message.
De-duplicating (order-preserving) would read better. Cosmetic only.

## Non-findings (checked, clean)

- **Reuse.** No parallel machinery introduced. `_repeat_inputs_to_array` now delegates purely to
  the existing `visitor.repeat_inputs_to_array`; `parse.py` reuses the existing
  `validation_skipped_reason` → `request_unavailable_reason` → interactor-fallback channel rather
  than inventing a new signal. Dropping `parameters: list[ToolParameterT]` from the signature is a
  correct narrowing.
- **Does it leave a cleaner abstraction?** Yes, on balance. `_repeat_inputs_to_array` is now
  single-purpose, and `unhandled_inputs` acquires a coherent meaning that a second call site can
  rely on. The hole left behind is finding 1 — the predicate that now carries the load was written
  for a different job.
- **Dead code / stale comments.** None. No orphaned imports: `cast` is still used at `case.py:464`
  / `479`, `ToolParameterT` at `case.py:76` / `379` / `559`, `ToolSourceTestInput` at `case.py:226`
  / `606`. Only one call site for the changed signature. `grep` for `legacy_repeat` / `synthes`
  across `lib/galaxy/tool_util/` and `doc/` finds nothing stale.
- **Imports.** No new imports; all existing ones are module-level. `pytest` and
  `parse_tool_test_descriptions` were already imported in the test module (lines 7 and 31).
- **Error legibility.** For profile >= 24.2 the failure is `Invalid parameter name found input2` —
  names the offending parameter, good. For < 24.2 with `use_legacy_api=never` the assertion at
  `interactor.py:835` includes `could not build request: unhandled inputs ['input2', …]` — also
  legible.

## Suite runs

`pr/23170` bootstrapped via `/galaxy-bootstrap`; Python 3.13.12, pytest 9.1.1. Galaxy is not
installed into the venv, so direct `pytest` runs need `PYTHONPATH=lib` (`run_tests.sh` handles it).

**Framework (`-framework -id repeat_unqualified`, live Galaxy server):**

| sources | `GALAXY_TEST_USE_LEGACY_TOOL_API` | result |
|---|---|---|
| PR head | `if_needed` (async) | **1 failed, 1 passed** — 2m19s |
| merge-base | `if_needed` (async) | **2 passed** — 1m46s |
| PR head | unset (default `always`, sync) | **2 passed** — 1m36s |

The third row is the one to notice. Both tools pass on the default sync path *on the PR head*, so
the tool XML is valid and the tools themselves work — the failure is async-only, and a default CI
run would never surface it.

**Unit:**

- **`test/unit/tool_util/test_parameter_test_cases.py` on PR head — 23 passed.** The PR's own suite
  is green; the `min` regression is invisible to it.
- **`test/unit/tool_util` (full) on PR head — 38 failed, 1275 passed, 4 skipped** (9m14s).
- **Same 38 failures on the merge-base** (5m22s) — identical set, so all pre-existing and
  environmental, none in `parameters/`. Breakdown: `test_cwl.py` 27 (`schema_salad` resolution),
  `test_conda_resolution.py` 4, `mulled/test_get_tests.py` 4, `mulled/test_mulled_build.py` 2
  (docker/network), `toolbox/test_watcher.py` 1 (filesystem timing).

So the PR introduces no test failures in the existing suite. The only new red is the finding-1
reproduction, which the PR does not cover.

## CI — jmchilton/galaxy `pr23170_min_repeat_fallback`

Submitted 2026-07-30 as guerler/galaxy#34 (`jmchilton:pr23170_min_repeat_fallback` →
`guerler:toolrequests.004`), so it can be squashed into #23170 before it merges.

Pushed 2026-07-29 19:18 EDT on top of `5bc110a215`:

- `b728c4d212` — framework test tools reproducing the async regression
- `f296e6f8ec` — the fix

**30 runs: 26 success, 2 skipped, 2 failure. Both failures unrelated to these commits.**

| workflow | result |
|---|---|
| Python linting | success — 7m29s |
| Unit tests | success — 57m7s |
| Tool framework tests | success — 49m49s |
| API tests | success — 42m34s |
| Workflow framework tests | success — 54m22s |
| Selenium / Playwright / Integration Selenium | success |
| **Test Galaxy release script** | **failure** — unrelated |
| **Integration** | **failure** — unrelated |

*Test Galaxy release script* checks version strings on the fork's long-lived branches:
`Minor version 'VERSION_MINOR = None' is incorrect at ref 'master'` (fork's `master` is stale at
19.05). Fork hygiene — fails on any push to `jmchilton/galaxy`, touches nothing in this change.

*Integration* — one shard (`Test (3.10, 3)`) died 11 minutes in, inside the
`medyagh/setup-minikube@latest` action: `sudo apt-get update -qq` → `The process '/usr/bin/sudo'
failed with exit code 1`. Infrastructure flake during k8s setup, before any Galaxy test executed.

**A green run here does not validate the fix.** `DEFAULT_USE_LEGACY_API` is `"always"`, so CI runs
both new tools on the sync path, where they pass with or without the fix — confirmed independently
by the local sync run (2 passed on unfixed PR head). CI only establishes that nothing *else* broke.
The proof of the fix remains the local async runs: 1 failed before, 2 passed after.

## Test coverage assessment

**Net: coverage did not regress; it shifted, and one hole opened.**

`test_legacy_unqualified_repeat_inputs_are_expanded_for_request_state` was deleted, but it asserted
behaviour that no longer exists — keeping it would have been wrong. It is replaced by two tests, not
zero:

- `test_parameter_test_cases.py:423` `test_legacy_unqualified_repeat_inputs_are_not_expanded` — the
  negative test. `pytest.raises(Exception, match="Invalid parameter name found input2")` against the
  same `multi_repeats` fixture. This is the regression guard for the removed behaviour, and it
  exists. Good.
- `test_parameter_test_cases.py:432` `test_unrepresentable_test_case_falls_back_to_legacy_request` —
  the new-path test, asserting `error is False` and `request is None` through the real
  `parse_tool_test_descriptions`.

No test data was weakened and no fixture was edited — `multi_repeats.xml` is untouched, and both new
tests run against the same test case index (2) the deleted test used. `pytest.raises(Exception, match=…)`
is broad but the `match` pins the message, so it is not a weakened assertion in practice.

Gaps:

- **No test for finding 1 in the PR.** The `min`-set variant has no coverage at all, which is why
  the bug is invisible. Written during this review as the two framework tools in finding 1
  (untracked in the worktree, plus a one-line `sample_tool_conf.xml` registration) — currently red
  on the async path, green pre-PR.
- **The async path is not exercised by default at all.** `DEFAULT_USE_LEGACY_API` is `"always"`
  (`interactor.py:90`), and `test_toolbox_pytest.py:76` only departs from it when
  `GALAXY_TEST_USE_LEGACY_TOOL_API` is set in the environment. So every `async_*` framework tool —
  the five from #23084 and the two added here — passes a default CI run whether or not the async
  path works. This is a pre-existing coverage gap, not something 23170 introduced, but it is why
  this class of regression keeps surfacing in the field rather than in CI, and it is the strongest
  argument for fixing finding 1 before merge rather than after.
- `test_unrepresentable_test_case_falls_back_to_legacy_request` does not assert
  `request_unavailable_reason`, so the new diagnostic string — the only thing a user sees when
  running with `GALAXY_TEST_USE_LEGACY_TOOL_API=never` — is unverified. One extra assertion.
- Finding 2's semantic change to `test_case_validation` has no test either way.
- The claim "validated across the tools-iuc corpus" is not reproducible from this repo. #23084 at
  least linked a concrete run (`guerler/tools-iuc` Actions run 28927029485) with counts; #23170
  links nothing. `lib/galaxy/tool_util/parameters/scripts/validate_test_cases.py` exists and is the
  natural harness, but it validates test cases rather than diffing async-vs-sync submissions, so it
  does not substantiate the claim. Treat the corpus validation as an unverified assertion.

## Open questions for the author

1. Finding 1 is reproduced and fixed locally — is the surgical patch (withhold `handled_inputs` for
   min-padded instances) the shape you want, or would you rather go straight to consumption
   tracking and delete `_input_name_was_handled_by_legacy_fallback`?
2. Was making `test_case_validation` profile-gated (finding 2) a deliberate part of this change, or
   a side effect of moving the predicate? Either is defensible, but which?
3. Should `parse.py`'s `validation_skipped_reason` reset per test case (finding 3)? Happy to treat
   it as out of scope, but the PR doubles the number of sites that leak.
4. Which corpus run backs "validated across the tools-iuc corpus" for *this* PR — is there a link
   like #23084's, and what were the regression counts before/after?
5. "After making the few affected tests explicit" — which tools-iuc tests were changed, and is there
   a PR? That is the concrete migration burden this imposes on tool authors and it would be useful
   to point at.
6. The new `parse.py:83` branch is unreachable for profile >= 24.2. Worth saying so in the comment,
   or is a future change expected to make it live for modern profiles too?
