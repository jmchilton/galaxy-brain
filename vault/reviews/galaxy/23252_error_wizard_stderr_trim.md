# PR 23252 — Trim oversized stderr in the error wizard instead of rejecting it

- https://github.com/galaxyproject/galaxy/pull/23252
- Fixes https://github.com/galaxyproject/galaxy/issues/23190
- Author: dannon
- State: OPEN, 0 human reviews, 0 comments at time of writing; opened 2026-08-03
  (the one "review" is `github-advanced-security`, empty body)
- Size: 6 files, +514/-75, 4 commits
- PR head reviewed: `b48a168483`; cleanup reviewed in the same worktree at
  [`jmchilton/galaxy@e5e3efdf4e`](https://github.com/jmchilton/galaxy/commit/e5e3efdf4e46fdfb2cd304f95b3b81295e853e00),
  merge-base `origin/dev`

- Follow-up PR opened against dannon's branch (not against `dev`):
  [dannon/galaxy#65](https://github.com/dannon/galaxy/pull/65) —
  `jmchilton:23252-review-followups` → `dannon:issue-23190-wizard-stderr-truncation`,
  carrying the three fixes below. Nothing has been posted to galaxyproject/galaxy#23252
  itself.

## Review update — cleanup commit `e5e3efdf4e` (2026-08-07)

### Updated verdict

**Approve after one mechanical CI fix.** The cleanup is substantively good. It implements
the three main structural requests from the original review, fixes several real bugs beyond
the headline wizard failure, and leaves behind better shared abstractions rather than more
agent-specific branches. I found no functional regression in the cleanup. It is not ready
to land verbatim only because `test/unit/app/test_agents.py` fails Galaxy's isort gate.

### Findings on the cleanup

#### P1 (merge-blocking, trivial) — the changed test file fails isort

`test/unit/app/test_agents.py:66,82,103` is not in the order required by the repository's
isort configuration. Running the Galaxy-pinned `isort==8.0.1` over all seven changed
Python files reports only this file:

```text
ERROR: .../test/unit/app/test_agents.py Imports are incorrectly sorted and/or formatted.
```

The generated diff is mechanical: move `JOB_CONTEXT_STDERR_LIMIT` below the
`galaxy.agents.custom_tool` import block, and move
`from galaxy import util as galaxy_util` immediately after the pre-existing
`agent_registry = build_default_registry()` split. No behavior changes are needed.

**Fixed** in [`jmchilton/galaxy@7cf4fedb23`](https://github.com/jmchilton/galaxy/commit/7cf4fedb23)
— confirmed and corrected by running the pinned `isort==8.0.1`, exactly the two moves
described above, 2 insertions / 2 deletions. `isort --check-only` now passes across all
seven changed Python files; black still clean; `test_agents.py` still 136 passed, 15
skipped.

Root cause worth recording: **isort is not a pre-commit hook in this repo.** It runs from
`Makefile:55` (`$(IN_VENV) isort .`) as part of `make lint`, while
`.pre-commit-config.yaml` covers black, ruff, flake8 and prettier only. The commit hooks
passing is therefore not evidence the import order is right — a fact that produced this
exact miss.

Kept as a separate commit rather than amended into `e5e3efdf4e`, so the SHA this review
section cites stays reachable on the branch.

#### P3 — `AgentOperationsManager.get_job_errors` still lacks direct regression coverage

`operations.py:819-838` now middle-trims `info`, `stderr`, and `stdout`, and correctly
includes `info` when calculating `truncated`. Both changes are right, but neither is
exercised by the tests in this commit. The agent-specific duplicate-stderr path is well
covered; this shared operations path is only supported by inspection. A focused manager
test should assert that a tail marker survives and that oversized `info` alone makes
`truncated` true. This is a coverage gap, not evidence of a functional defect.

#### P3 — the generic float helper still exposes domain-specific edge cases

`BaseGalaxyAgent._get_float_config` (`base.py:497-508`) deliberately accepts zero because
zero is a valid temperature, then `WorkflowOrchestratorAgent._get_agent_timeout`
(`orchestrator.py:189-191`) reuses it. Consequently `agent_timeout: 0` is still honored and
causes immediate timeouts. It also enforces no documented upper bound on temperature.
Both behaviors predate the cleanup, so this is not a regression, but it is the remaining
place where the new abstraction is broader than each setting's actual domain. If numeric
configuration is hardened further, range policy should be supplied per key/caller rather
than embedded in a temperature-oriented shared helper.

### Does it fix real bugs?

Yes. These are observable behavior fixes, not speculative cleanup:

1. **Numeric configuration now shares one coercion path.** `_coerce_int` /
   `_coerce_float` (`base.py:186-220`) and `_get_int_config` / `_get_float_config`
   (`base.py:470-508`) are reused by query length, max tokens, temperature, custom-tool
   temperature, and orchestrator timeout. `retries: yes` no longer silently means one;
   `retries: .inf` no longer leaks `OverflowError`; `max_tokens: yes` no longer becomes a
   one-token response budget; non-finite timeouts fall back; and retry errors no longer
   echo a raw value from the generic accessor that also serves API keys. `_get_retries`
   correctly keeps its distinct fail-fast policy while reusing only coercion
   (`base.py:984-1007`).
2. **The actual failure tail now survives every stderr copy in the wizard prompt.** Job
   context is middle-trimmed once at retrieval (`error_analysis.py:83-104`) and rendered
   without a second head slice (`:204-216`). This fixes the original PR's contradictory
   prompt, which preserved the tail in the query but dropped it from the duplicate Job
   Details block.
3. **Short stderr no longer looks truncated.** Removing the unconditional literal `...`
   in `_format_job_context` fixes a real presentation bug for one-line errors.
4. **The shared history-agent operation stops dropping the useful tail.**
   `operations.py:819-838` middle-trims all three job streams and fixes the previously
   false `truncated: False` result when only `info` exceeded 4000 characters.
5. **Pasted tool banners work outside the wizard too.** Removing the ineffective
   `system:` / `assistant:` substring blacklist from `_validate_query`
   (`base.py:518-534`) fixes the same `Operating System:` false positive in the router.
   This is a reasonable security simplification: the string is delivered as a
   pydantic-ai user-role message, so the substring never created a role boundary, and
   trivial variants bypassed it already. The instruction-phrase checks remain.

### Design and reuse assessment

This is materially cleaner than PR head:

- The duplicated numeric parsing is split correctly into **pure coercion** and
  **caller policy**. That lets retries continue to raise while the user-facing budgets
  warn and fall back. It is meaningful reuse, not merely a helper with one caller.
- `truncate_middle` moved from the pydantic-ai-heavy agent base to `galaxy.util`
  (`util/__init__.py:590-618`), next to `shrink_string_by_size`. That is the right
  dependency boundary: `operations.py` is also imported by the MCP API and should not
  acquire an inference-stack dependency just to truncate text. The existing utility was
  explicitly evaluated and correctly not stretched: it cannot express the 1/3-head,
  2/3-tail bias or a dynamic omitted-character count.
- Truncation happens once at the stream boundary. Removing the second slice avoids nested
  markers and keeps the omitted count truthful.
- Deleting the single-subclass `SCAN_QUERY_FOR_ROLE_MARKERS` flag is simpler and more
  honest than encoding call provenance as a class property.
- All new imports are module-level. No existing test was removed or weakened to obtain a
  pass. One original assertion about router rejection was intentionally replaced because
  the cleanup fixes that behavior; the replacement still asserts that actual instruction
  phrases are rejected by both agents.

The cleanup's scope is somewhat wider than #23190, especially the numeric settings and
`AgentOperationsManager` changes, but the edits are adjacent manifestations of the exact
same defects and converge on shared facilities. They do not feel like unrelated accretion.

### Validation of cleanup commit

- Read the full `b48a168483..e5e3efdf4e` diff and surrounding call paths.
- `git diff --check b48a168483..e5e3efdf4e`: clean.
- Galaxy-pinned `ruff==0.16.0 check` over all seven changed Python files: **passed**.
- Galaxy-pinned `isort==8.0.1 --check-only` over all seven changed Python files:
  **failed only for `test/unit/app/test_agents.py`**, as described above. This is the
  sole formatting/lint gate failure found.
- The cleanup commit records `test/unit/app/test_agents.py`: **136 passed, 15 skipped** and
  `test/unit/util`: **309 passed**. The original review's local implementation of the same
  changes had those same passing counts. I started a fresh isolated focused-test
  environment for this update, but Galaxy's full dependency bootstrap had not completed
  when the review was wrapped up, so it produced no additional test result.
- Galaxy worktree remained clean; test dependencies were provisioned under `/private/tmp`.

Remaining issues from the original review are unchanged P3s: `max_query_length` caps the
raw query before uncapped history/job context is appended; the error-analysis path resolves
the cap twice; and an absurdly tiny cap falls back to a head-only slice while the client
says the beginning and end were analyzed. None is introduced by `e5e3efdf4e`.

## Original PR verdict (before `e5e3efdf4e`; superseded above)

**Approve with comments.** The bug is real, the diagnosis is right, and the fix works. I
worked the head/tail arithmetic at every boundary from `max_length=0` to `max_length=201`
and it never exceeds the cap, never loses a character it doesn't account for, and never
produces a negative slice index. No existing test was weakened, deleted, or spliced — the
only removed line in the entire test diff is an import statement being widened. The client
tests pass (4/4, run locally). The frontend trim notice does surface on the path described.

Everything below is structural. The three that matter:

1. `_resolve_max_query_length` is a second, contradictory answer to a question
   `_get_retries` already answers 500 lines away in the same class — and the sibling it
   ignores has the exact bugs this PR was written to fix.
2. `truncate_middle` is written to replace head-slicing of stderr, and does not reach the
   three head-slices of stderr that already exist — two of them in the file being edited,
   on the same agent, in the same request.
3. The comment justifying `SCAN_QUERY_FOR_ROLE_MARKERS = False` makes two claims that are
   false against the code. The security impact of the flag is negligible (and I'll argue
   below that the blacklist was never a defense), but the reasoning is load-bearing for a
   security decision and it doesn't hold.

None of this is large. Items 1 and 2 are consolidation; item 3 is a comment rewrite plus a
decision about shape.

## What the PR does

Verified against the diff, not the body.

**Server.** `lib/galaxy/agents/base.py`:

- `:93-94` `DEFAULT_MAX_QUERY_LENGTH = 10000`, hoisting the literal that was inline at the
  old `_validate_query`.
- `:96` `_TRUNCATION_MARKER = "\n\n[... {omitted} characters omitted ...]\n\n"`.
- `:98-108` splits the old flat `suspicious_patterns` list into `_INJECTION_PHRASES`
  (5 instruction phrases) and `_ROLE_MARKERS` (`"system:"`, `"assistant:"`).
- `:204-229` new `truncate_middle(text, max_length)` — head 1/3, tail 2/3, marker between.
- `:440-444` new class attribute `SCAN_QUERY_FOR_ROLE_MARKERS = True`.
- `:462-493` new `_resolve_max_query_length()`.
- `:500-507` `_validate_query` now resolves the cap through the new method and conditions
  the role markers on the class flag.

`lib/galaxy/agents/error_analysis.py`:

- `:62` `SCAN_QUERY_FOR_ROLE_MARKERS = False` on `ErrorAnalysisAgent`.
- `:117-141` `process()` trims before validating, then delegates the whole body to a new
  `_analyze()` and attaches `query_truncated` / `original_query_length` to the response
  metadata *after* the try/except.
- `:143-203` `_analyze()` — the old `process()` body, unchanged apart from dedent. I diffed
  it line by line; the only semantic change is that `except (OSError, ValueError)` now wraps
  the call rather than the body, which covers the same statements.

**Client.** `GalaxyWizard.vue:76-84` reads `data.metadata.query_truncated`, narrows
`original_query_length` with a `typeof === "number"` check, and builds a sentence;
`:125-132` renders it in a `GAlert variant="warning"`, gated on `!hasError`.

**Docs.** `doc/source/admin/ai_agents.md:118` documents `max_query_length`.

The trace the task asked me to confirm holds end to end:
`DatasetError.vue:158-163` passes `jobDetails.tool_stderr` as `query` and
`jobDetails.id` as `job-id` → `GalaxyWizard.vue:50-58` POSTs to
`/api/ai/agents/error-analysis` → `api/agents.py:126-152` calls
`execute_agent(agent_type="error_analysis", ...)` → `ErrorAnalysisAgent.process` →
metadata comes back → `GalaxyWizard.vue:76` renders the notice.

### The 32768 in the bug report is Galaxy's own cap, and the PR knows it

Worth recording because it justifies a wording choice that otherwise looks like hedging.
`tool_stderr` is written through `Job.set_streams` →
`galaxy.util.shrink_and_unicodify` (`model/__init__.py:662`, `util/__init__.py:581-587`),
which caps at `DATABASE_MAX_STRING_SIZE = 32768` (`util/__init__.py:176`). The user's tool
did not emit exactly 32768 characters — the database truncated it there. So the
`original_query_length` the wizard reports is a floor, not the real volume, and the
frontend's "recorded **at least** N characters" (`GalaxyWizard.vue:81`) is precisely
correct. That is a good detail and I would not have expected it to be right.

## Findings

### P2-a — `_resolve_max_query_length` duplicates and contradicts `_get_retries`, in the same class

`BaseGalaxyAgent` already had a config-coercion helper doing this exact job. It is 470
lines below the new one and neither references the other:

```python
# base.py:965-987 (on dev, unchanged by this PR)
def _get_retries(self, default: int | None = None) -> int:
    ...
    try:
        retries = int(raw)
    except (TypeError, ValueError):
        retries = None
    if retries is None or retries < 0:
        raise ConfigurationError(
            f"inference_services 'retries' for agent '{self.agent_type}' must be a non-negative integer, got {raw!r}"
        )
    return retries
```

```python
# base.py:462-493 (new)
def _resolve_max_query_length(self) -> int:
    configured = self._get_agent_config("max_query_length", DEFAULT_MAX_QUERY_LENGTH)
    if isinstance(configured, bool):
        resolved = 0
    else:
        try:
            resolved = int(configured)
        except (TypeError, ValueError, OverflowError):
            resolved = 0
    if resolved <= 0:
        log.warning("Ignoring invalid max_query_length of type %s ...", type(configured).__name__, ...)
        return DEFAULT_MAX_QUERY_LENGTH
    return resolved
```

Same input source, same coercion, four disagreements:

| | `_get_retries` (`:965`) | `_resolve_max_query_length` (`:462`) |
| --- | --- | --- |
| `bool` guard | none | `isinstance(configured, bool)` |
| exceptions caught | `TypeError`, `ValueError` | + `OverflowError` |
| on bad value | raises `ConfigurationError` | logs a warning, falls back |
| value in the message | `got {raw!r}` — echoes it | `type(configured).__name__` only |

The last row is the sharp one. The new code's comment argues the case explicitly:

```python
# base.py:483-485
# Log the type, not the value: _get_agent_config is the same accessor that
# serves api_key, so echoing whatever it returned into the log is a habit
# worth not having.
```

That argument applies verbatim to `_get_retries`, which puts `{raw!r}` into a
`ConfigurationError` — surfaced to the caller, not just the log. The PR states the
principle and leaves the adjacent violation in place.

The first two rows are live defects in `_get_retries` that this PR proves it knows about:

- `inference_services: {default: {retries: yes}}` → YAML `True` → `int(True) == 1` → the
  agent silently gets one pydantic-ai retry instead of the intended three. Exactly the
  `int(True) == 1` failure the new code guards against.
- `inference_services: {default: {retries: .inf}}` → `int(float("inf"))` raises
  `OverflowError`, which is an `ArithmeticError`, not a `ValueError`, so it escapes the
  `except` and propagates out of `_create_agent`. Exactly the `OverflowError` the new code
  guards against.

And the two siblings that got no coercion at all are worse, because they have no `int()`
call to fail loudly:

- `_get_max_tokens()` (`base.py:962`) feeds `model_settings["max_tokens"]` directly
  (`base.py:585-588`). `max_tokens: yes` → `True` → the provider is asked for a **1-token
  response**, for every agent, silently.
- `_get_agent_timeout()` (`orchestrator.py:191`) feeds `asyncio.wait_for`.
  `agent_timeout: .inf` → the orchestrator's per-agent timeout is disabled.
- `_get_temperature()` (`base.py:959`) has no range check either.

**Fix:** one `_get_int_config(key, default)` (plus a float sibling) on `BaseGalaxyAgent`,
used by `_get_retries`, `_get_max_tokens`, `_get_agent_timeout` and the new cap. Pick one
policy for a bad value — I'd take the new code's "warn and fall back", since a bad
`max_tokens` shouldn't take the whole agent down — and one policy for logging the offending
value, which the new code already got right. The PR has already done the analysis; it just
applied it to one key.

On "is this the canonical place": yes, this belongs at the accessor, not in
`config_schema.yml`. `inference_services` is a free-form `dict` by design and Galaxy's
schema machinery does not descend into it. I checked — there is no per-key typing anywhere
for it. The objection is the duplication, not the location.

#### Resolved by cleanup commit `e5e3efdf4e`

`_coerce_int` / `_coerce_float` as module-level functions in `base.py` — pure coercion, no
policy — plus `_get_int_config(key, default)` / `_get_float_config(key, default)` on
`BaseGalaxyAgent` that add range-check-and-warn. `_resolve_max_query_length`,
`_get_max_tokens`, `_get_temperature` (base and custom_tool) and `_get_agent_timeout` all
route through them; `_get_retries` uses `_coerce_int` directly because its policy is to
raise, which `test_invalid_retries_config_raises_configuration_error` pins.

Separating coercion from policy is what makes the shared helper possible: three of the four
disagreements in the table above (bool guard, exceptions caught, value-in-message) were
coercion concerns and collapse; the fourth (raise vs. fall back) is a real difference and
stays, now documented in one place. `_get_retries` no longer echoes `{raw!r}` — it reports
the type, per the PR's own argument.

Float needs its own coercion rather than reusing the int one: `int()` rejects infinity for
free via `OverflowError`, but `float(".inf")` succeeds, so `math.isfinite` has to do it
explicitly. Otherwise `agent_timeout: .inf` disables the orchestrator's timeout entirely.

Two new tests, both verified red against the stashed implementation:
`test_boolean_and_infinite_retries_are_misconfiguration_too` and
`test_numeric_config_falls_back_on_nonsense`. The red run printed
`assert True == 8192` for `_get_max_tokens()` — the `max_tokens: yes` bug, reproduced.
`test/unit/app/test_agents.py` full file: **134 passed, 15 skipped, 0 failed.** black and
ruff clean.

The two helpers hardcode their floor rather than taking a `minimum` parameter — an earlier
cut had one and no call site ever passed it. Ints reject `<= 0` (every int key is a budget,
and a zero budget is not a small budget); floats reject `< 0` (temperature 0 is a deliberate
"be deterministic"). The asymmetry is the whole reason there are two methods, so it belongs
in them rather than in a knob.

Judgment call worth flagging: that makes `agent_timeout: 0` honored rather than rejected,
which follows the PR's own "an explicitly configured small cap is an admin decision"
principle but does brick the orchestrator. Negative and non-finite are rejected.

Not addressed: `workflow_report`'s `_get_agent_config` override raises the *default* to
50000, but the invalid-value fallback still returns the caller's `DEFAULT_MAX_QUERY_LENGTH`.
Pre-existing — the original `_resolve_max_query_length` did the same — and preserved.

### P2-b — `truncate_middle` does not reach the three stderr head-slices it was written to replace

The docstring states the thesis:

```python
# base.py:207-208
Tool logs bury the actual failure at the end, so a plain head slice throws away
the part that matters most.
```

Three plain head slices of stderr survive the PR, and two are in the file it edits:

| site | code | what it feeds |
| --- | --- | --- |
| `error_analysis.py:104` | `job.stderr[:2000]` | `get_job_details` → `_format_job_context` |
| `error_analysis.py:215` | `job_details['stderr'][:500]` + literal `"..."` | the prompt |
| `operations.py:819-835` | `max_output_length = 4000`, `stderr[:4000]`, `stdout[:4000]`, `info[:4000]`, plus a `truncated` bool | the `get_job_errors` agent tool |

The wizard path hits the first two on **every** request, because `DatasetError.vue:163`
always passes `job-id`, so `context["job_id"]` is set and `_analyze:155-158` calls
`get_job_details`. Concretely, for the 32kb stderr in the issue the model's prompt contains
that stderr **twice**:

1. as `query`, middle-trimmed to 10000 with the tail preserved — the fix working, and
2. as `Job Details:\nError Output: <first 500 characters>...` — where "Error Output" is
   `Job.stderr` (`model/__init__.py:697-701`, `tool_stderr + "\n" + job_stderr`) sliced to
   2000 and then to 500, with a literal `...` and no character count.

So the failure line the PR fought to preserve appears once, next to a 500-character head
slice of the same stream that demonstrates the anti-pattern the docstring argues against.
All three sites should call `truncate_middle`. `operations.py`'s `truncated` bool should
become the same `query_truncated` / omitted-count shape, since it is the same signal.

**Where it lives.** `truncate_middle` is a pure string function with no agent dependency,
in `lib/galaxy/agents/base.py`. Its documented sibling, `shrink_string_by_size`, is in
`lib/galaxy/util/__init__.py:590`. Someone looking for "how does Galaxy truncate a long
string" finds `galaxy.util` and does not find this. Move it there, next to the function its
own docstring compares it against.

**Credit where due — the reuse homework was done and documented.** The docstring at
`base.py:211-214` says `shrink_string_by_size` can express neither the tail bias nor the
omitted-character count. I checked `util/__init__.py:602-608`: `left_index = right_index =
int((size - len_join_by) / 2)` is an even split with a `left_larger` tiebreak of exactly one
character, and `join_by` is a plain string with no interpolation. Both claims are accurate.
Generalizing `shrink_string_by_size` instead would have meant changing a function on the
job-output persistence path, which I agree is not worth it. This is the right call, honestly
argued — it's the one place in the PR where an existing abstraction was evaluated and
consciously rejected, and the note left behind is exactly what a future reader needs.

#### Resolved by cleanup commit `e5e3efdf4e`

**The move to `galaxy.util` turned out to be a prerequisite, not a preference.** `base.py`
does `from pydantic_ai import Agent` unguarded at `:49`, and `operations.py` is imported by
`webapps/galaxy/api/mcp.py:23`, which today needs no pydantic-ai at all. Pointing
`get_job_errors` at a `truncate_middle` living in `base.py` would have made the MCP API
hard-depend on the inference stack to slice a string. So `truncate_middle` and
`_TRUNCATION_MARKER` moved to `lib/galaxy/util/__init__.py`, immediately above
`shrink_string_by_size`, and out of `base.py`'s `__all__`. That reclassifies bottom-line
item 5 from "worth discussing" to "required by item 2."

All three sites now call it:

- `error_analysis.get_job_details` — `truncate_middle(job.stderr, JOB_CONTEXT_STDERR_LIMIT)`
  and the stdout equivalent, replacing `[:2000]` / `[:1000]`. The two magic numbers became
  named constants.
- `error_analysis._format_job_context` — renders `job_details['stderr']` verbatim. **The
  second slice had to go rather than also become a `truncate_middle`**: trimming an
  already-trimmed string nests a marker inside a marker and reports an omitted count
  computed against the trimmed text, not the original. Truncating once, at the boundary
  where the model object is read, is the only arrangement where the count stays true.
- `operations.get_job_errors` — `truncate_middle` for stderr/stdout/info.

Two incidental fixes fell out. **Both are pre-existing defects on `dev`, not introduced by
this PR** — `dev`'s `error_analysis.py:187` already reads `{job_details['stderr'][:500]}...`
and `git diff origin/dev...HEAD -- lib/galaxy/agents/operations.py` is empty:

- `_format_job_context` appended a literal `"..."` unconditionally, so a one-line stderr
  rendered as `Error Output: No such file or directory...`, implying truncation that never
  happened.
- `get_job_errors`'s `truncated` flag ignored `info` while truncating it, so an oversized
  `info` reported `truncated: False`. Now
  `max(len(stderr), len(stdout), len(info)) > max_output_length`. Nothing reads that flag
  today (`history.py:164` mentions a different tool's), so the shape change is safe.

Both are drive-by fixes to code this PR never touched, which is an argument for carrying
this work as a follow-up PR rather than asking for it on dannon's branch.

Effective behaviour change worth naming: the stderr in the Job Details block goes from a
500-character head slice to a 2000-character middle trim. That is a bigger prompt. The 2000
cap was already there and was clearly the intended one — the 500 re-slice reads like a
second author who didn't know about it.

Two new tests, both verified red against the restored head-slices:
`test_job_context_stderr_is_middle_trimmed_not_head_sliced` (asserts the tail survives *and*
that `rendered.count("characters omitted") == 1`, which is the double-trim guard) and
`test_job_context_does_not_imply_truncation_that_did_not_happen`. The red run showed the
phantom ellipsis verbatim: `'Tool: cat1\nError Output: No such file or directory...'`.

`test/unit/app/test_agents.py`: **136 passed, 15 skipped.** `test/unit/util`: **309 passed**
(`test_get_url.py` and `test_requests.py` don't collect in the borrowed venv — no
`responses` module, unrelated). black and ruff clean.

Not done: `operations.get_job_errors` has no unit coverage here, since constructing an
`AgentOperationsManager` needs `trans`, `hda_manager` and id-encoding mocked. The change
there is a mechanical slice-to-call swap, but it is unverified by test.

### P2-c — the `SCAN_QUERY_FOR_ROLE_MARKERS` justification is wrong on two verifiable points

```python
# error_analysis.py:53-61
# The query here is a job's stderr, not something a human typed.
# ...
# Within a run this agent registers no tools and nothing reads its output back
# as another agent's input.
```

Three claims. One is true, two are not:

- ✅ **"registers no tools"** — true. `ErrorAnalysisAgent._create_agent` (`:64-81`)
  constructs a bare `Agent(...)`; `grep -c "agent.tool" error_analysis.py` → 0.
- ❌ **"the query here is a job's stderr, not something a human typed"** — the wizard is one
  of *two* callers. `router.py:321-339` registers `hand_off_to_error_analysis(ctx, task)`,
  and `_execute_handoff` (`:296-310`) does `await agent.process(input_text, handoff_context)`.
  `task` is composed by the router LLM from the user's chat message. Separately,
  `POST /api/ai/agents/error-analysis` takes `query: str = Body(...)`
  (`api/agents.py:128`) — any client can send arbitrary prose to the exempted agent.
- ❌ **"nothing reads its output back as another agent's input"** — `router.py:310` returns
  `self._serialize_handoff(response, handoff_target)`, which JSON-wraps `response.content`
  and `response.metadata` (`:275-294`) and hands it to the router LLM as a tool result. The
  router has nine `@agent.tool`s (`:116-227`) and seven handoffs, including
  `hand_off_to_custom_tool`.

**Is it a security regression? Effectively no, and I want to say why rather than hedge.**
The blacklist is `pattern in query.lower()` over a string that pydantic-ai delivers as a
**user-role message**. There is no role confusion to exploit — the model is not parsing
`system:` as a role boundary. `"SYSTEM :"`, `"sys" + "tem:"`, `"<|im_start|>system"`, or any
paraphrase walks straight through. It is a substring test, not a defense.

The one path that would have made it matter — attacker-controlled stderr driving the
router's tools — does not exist: the wizard calls `execute_agent("error_analysis")`
directly (`api/agents.py:145-152`) and never touches the router. The realistic effect of
the flag is that a user typing `system: ...` into ChatGXY, routed to error_analysis, is no
longer refused. That is a user attacking their own session.

**The shape is still wrong, though, and there's a cheaper fix available.** What the PR is
trying to encode is *the provenance of this call's query* — machine-emitted log versus
human prose. A class attribute cannot express that, because the same class serves both (see
above). If provenance is the real distinction, it belongs on `process(query, context)` or at
the call site, not on the class.

But I'd argue for the third option: **drop `_ROLE_MARKERS` for everyone.** The bug this PR
fixes is not fixed on the router path. `QueryRouterAgent.process` (`router.py:538-541`) and
`OrchestratorAgent.process` (`orchestrator.py:104-107`) both call `_validate_query` on the
raw user query with the flag left `True`. So:

> A user pastes a tool log containing `Operating System: Linux` into the ChatGXY chat panel.
> `_validate_query` matches `system:` and returns *"I'm not able to process that query.
> Please rephrase your question."*

That is the same defect, in the same PR, unfixed. It is not covered by the PR body's stated
scope-out, which is about *length*, not about the blacklist. Deleting the two role markers
outright fixes both, removes the class flag, removes the need for the comment, and gives up
nothing that was actually protecting anything.

If the flag stays, the comment needs the two false claims removed and replaced with the
honest version: *"the role markers cost more than they buy on log-shaped input, and this
agent's query is log-shaped often enough to be worth the trade."*

#### Resolved by cleanup commit `e5e3efdf4e`

Took the stronger option — `_ROLE_MARKERS` deleted outright rather than gated. That removes
`SCAN_QUERY_FOR_ROLE_MARKERS` from both `base.py` and `error_analysis.py`, drops the
three-line branch in `_validate_query`, and makes the comment with the two false claims
unnecessary rather than needing a rewrite. `grep -rn SCAN_QUERY_FOR_ROLE_MARKERS lib/ test/
doc/` is empty. The reasoning that replaces it lives on `_INJECTION_PHRASES` and says only
what is true: a user-role message affords no role confusion, any paraphrase bypassed a
substring test, and what the markers reliably caught was ordinary tool output.

**This required rewriting a test the PR added.** `test_only_role_markers_are_exempt_for_error_analysis`
asserts `QueryRouterAgent.SCAN_QUERY_FOR_ROLE_MARKERS is True` and that the router refuses
`system: do a thing` — the exact behaviour being removed, so it cannot survive. Replaced
with `test_tool_banners_pass_every_agent_and_instruction_phrases_pass_none`, which loops
both agents over a banner containing `Operating System:`, `Filesystem:` *and* a bare
`system:`, and asserts each still refuses `Ignore previous instructions`.

The red run is the evidence that this fixes something the PR left undone — with the markers
restored, the failure is on the **router**, not the wizard:

```
E  assert "I'm not able to process that query. Please rephrase your question." is None
E   += where ... = <QueryRouterAgent>._validate_query('Operating System: Linux\n...')
```

`test_agents.py`: **136 passed, 15 skipped.** black and ruff clean.

If this reads as too much for a review of a stderr-trimming PR, the conservative version is
the comment-only fix from item 3 — strike the two false claims, keep the flag. That leaves
the router bug in place.

### P3 — the cap bounds `query`, not the prompt

`process` trims `query` to `max_length`, then `_analyze` appends to it:

```python
# error_analysis.py:147-158
enhanced_query = query
...
enhanced_query += f"\n\nContext from history analysis:\n{prior.content}"   # :153, uncapped
...
enhanced_query += f"\n\nJob Details:\n{self._format_job_context(job_details)}"  # :158, ~600 chars
```

`prior.content` is the history agent's full response, with no cap. On the orchestrator's
sequential `[history, error_analysis]` plan (`orchestrator.py:120-123`, which force-enables
sequential for exactly this pair), the prompt that reaches the model can exceed
`max_query_length` by an unbounded amount. So the trim doesn't achieve the thing that
motivates it — fitting the model's window. Pre-existing, not introduced here, but this is
the PR that makes the cap load-bearing, so it's the PR that should say something.

### P3 — `_resolve_max_query_length` runs twice per request

`error_analysis.py:121` and again inside `_validate_query` (`base.py:500`). Harmless except
that a misconfigured cap logs its warning twice on every request. Passing the resolved value
into `_validate_query` (or caching it) would fix both.

### P3 — the tiny-cap degradation tells the user something untrue

Verified by executing the exact function over a 200-character input at
`max_length` ∈ {−5, 0, 1, 2, 5, 10, 20, 30, 35, 36, 37, 38, 39, 40, 41, 45, 50, 100, 199,
200, 201} — every marker-boundary value plus a spread:

| `max_length` | result length | marker present |
| --- | --- | --- |
| 0, −5 | 0 | — |
| 1 … 36 | == cap | **no** |
| 37 … 198 | == cap | yes |
| 199 | 198 | yes |
| ≥ 200 | 200 (unchanged, `is text`) | — |

Never over budget, ever. The 199→198 case is the rendered omitted-count having one fewer
digit than the count used for sizing — one character wasted, by design (`base.py:222-223`
comments it).

The one wart: below ~37 the `budget <= 0` branch (`base.py:224-225`) returns a bare
`text[:max_length]` with no marker — but `process` still sets `query_truncated: True`, so
`GalaxyWizard.vue:83` tells the user *"Only the beginning and the end were sent for
analysis"* when only the beginning was. Reachable only with `max_query_length: 36` or
lower, which is absurd config, and there is a test pinning the behaviour
(`test_truncate_middle_degrades_to_head_slice_when_budget_tiny`). Not worth changing;
worth knowing it's there. (`base.py:220-222` comments the sizing choice that produces the
199→198 case.)

## Reuse and abstraction summary

**Left behind as reusable:** `truncate_middle` is generic, pure, exported in `__all__`, and
documented well enough that the next person will understand why it exists. But it has
exactly one caller, and three obvious adopters it doesn't reach (P2-b).

**Accreted rather than abstracted:** `_resolve_max_query_length` is the one-off. The class
already had `_get_retries` solving the identical problem; the PR wrote a second, better
solution beside it instead of one shared solution (P2-a). `SCAN_QUERY_FOR_ROLE_MARKERS` is
the classic single-subclass boolean, and the thing it's approximating isn't a property of
the class (P2-c).

**Splitting `process` into `process`/`_analyze` is the right refactor**, and for a stated
reason: the metadata has to attach after the try/except so it survives an inference failure.
The test names that reason
(`test_truncation_metadata_survives_an_inference_failure`, "The metadata attaches after the
try/except, which is why process() was split"). A refactor whose justification is pinned by
a test is the good version of this.

**Imports** are all module-level. No function-local imports were added anywhere in the diff.
`truncate_middle` folds into the existing `from .base import (...)` block at
`error_analysis.py:18-31`; `import re` at `test_agents.py:23`.

**Precedent followed:** `WorkflowReportAgent._get_agent_config` (`workflow_report.py:42-50`)
was already the established way to raise the cap per agent, and the new resolver preserves
it — `test_workflow_report_cap_survives_the_new_resolver` asserts 50000 vs 10000
explicitly. That's the right instinct: the PR identified the one existing consumer of the
value it was changing and pinned it.

## Tests

**No existing test was weakened, deleted, re-parented, or spliced.** I checked this
specifically, since the task flagged a prior PR in this area for doing exactly that:

```
$ git diff origin/dev...HEAD -- test/unit/app/test_agents.py | grep '^-' | grep -v '^---'
-from galaxy.agents.base import truncate_message_history
```

One removed line in the whole test diff, and it is that import being widened to a
parenthesized two-name form. Test count 125 → 138 (+13). No assertion removals, no tails
lost, no nesting.

**Python, `test/unit/app/test_agents.py` (+214, 13 tests).** Genuinely good coverage of the
things that could go wrong:

- `test_error_analysis_trims_oversized_stderr_instead_of_rejecting` — asserts *both*
  `HEAD_MARKER` and `TAIL_MARKER` survive and `len(prompt) <= 10000`. That is also the
  agreement test between `truncate_middle` and `_validate_query`'s cap, which is the
  property that actually has to hold.
- `test_truncate_middle_marker_accounts_for_every_dropped_character` — asserts
  `len(head) + omitted + len(tail) == len(text)`. This is the right invariant, and it's the
  one a naive implementation gets wrong.
- `test_truncate_middle_keeps_nothing_for_a_nonpositive_budget` — with a comment naming the
  specific mistake it guards (`text[:-n]` keeping almost everything). Good.
- `test_max_query_length_falls_back_when_misconfigured` — a typed list covering
  `"not-a-number"`, `None`, `[10]`, `True`, `False`, `inf`, `0`, `-1`, plus the
  honoured-small-cap case and the `"2500"` / `2500.7` coercion cases.
- `test_error_analysis_survives_fractional_max_query_length` — the regression this PR would
  otherwise have introduced. On `dev` a float cap only ever reached `len(query) > 500.5`,
  which is fine; the new code uses it as a slice index, so `text[:154.0]` would raise
  `TypeError` outside the try block. The docstring says exactly that. This is the test that
  proves the resolver isn't speculative hardening.
- `test_error_analysis_does_not_mistake_a_tool_banner_for_an_injection` and
  `test_only_role_markers_are_exempt_for_error_analysis` — both directions, including that
  the router still refuses `system: do a thing` and that error_analysis still refuses
  `Ignore previous instructions`.
- `test_error_analysis_leaves_normal_query_untouched` — asserts the metadata keys are
  *absent*, not falsy. Correct, since the frontend tests `data.metadata?.query_truncated`.

The `_stub_error_analysis_run` helper (`:108-129`) is shared across five tests and its
docstring explains why one canned result is enough. Fine.

**Client, `GalaxyWizard.test.ts` (+96, 4 tests, new file).** **Ran locally: 4 passed.**
`NODE_OPTIONS=--no-experimental-webstorage npx vitest run src/components/GalaxyWizard.test.ts`.
The second test is the one worth pointing at:

> `it("does not caveat a diagnosis that never happened")` — a truncated query whose
> inference call then failed. Warning the user that "the diagnosis may have missed
> something" next to "unable to reach the service" describes an analysis that was never
> produced.

That is a case a generated test suite would not have thought of, and it's the reason for the
`!hasError` guard at `GalaxyWizard.vue:126`. The locale note at `:47-49` (using
`(32768).toLocaleString()` rather than a hardcoded `"32,768"`, because vitest doesn't pin a
locale) is also the correct fix rather than the tempting one.

**Gaps, all minor:**

1. Nothing covers `len(query) == max_length` exactly — the `>` boundary in
   `error_analysis.py:122`. The unit test for `truncate_middle` covers the equivalent
   boundary (`test_truncate_middle_under_limit_returns_unchanged` uses `is`), but the
   `process`-level "at the cap, no metadata" case isn't asserted.
2. Nothing pins the PR's deliberate scope-out — that the router still rejects a 32kb paste
   on length. A test asserting `QueryRouterAgent.process("x" * 32768)` returns a validation
   error would turn "we didn't fix that" into a documented decision.
3. Nothing covers the `_analyze` enhancement path pushing the prompt back over the cap
   (P3), which is the case where the trim doesn't achieve its purpose.

## What's good

- **The diagnosis is right and the fix is at the right layer.** Trimming in the agent, not
  in the Vue component, means the cap is a server concern and the client just reports it.
  The alternative — truncating `query` in `GalaxyWizard.vue` before the POST — would have
  been easier and wrong.
- **Tail-biased truncation.** 1/3 head, 2/3 tail, with a stated reason. A 50/50 split would
  have been the obvious choice and would have been worse for stderr.
- **The omitted-character count in the marker.** The model is told it's reading a fragment
  and how big the gap is. That's the difference between a truncation that degrades
  gracefully and one that produces confident nonsense about a log it can't see.
- **The "at least" in the user-facing notice** is correct for a non-obvious reason (the DB
  already capped at 32768 — see above), and the code got it right.
- **`shrink_string_by_size` was evaluated and rejected with a written argument** that is
  accurate on both counts. This is the reuse behaviour worth asking for.
- **The marker is sized against `len(text)` rather than the rendered count**
  (`base.py:220-223`), so the result comes in under budget but never over. That is the
  right direction to be wrong in, and it's commented.
- **`_get_agent_config` is not echoed into logs.** The observation that it's the same
  accessor serving `api_key` is a good one — it just needs applying to `_get_retries` too.
- **The refactor is justified by a test, not by taste.**
- **Docs were updated in the same PR**, including the `error_analysis` exception to the
  general rule.
- **No drive-by reformatting.** The `_analyze` extraction is a pure dedent; I checked it
  line by line.

## Verification

- `pnpm install --frozen-lockfile`: clean.
- `npx vitest run src/components/GalaxyWizard.test.ts` under
  `NODE_OPTIONS=--no-experimental-webstorage`: **4 tests, all passing.**
- **At original PR head, Python tests were not run** — no `.venv` was present in the
  worktree and bootstrapping was out of scope for that first pass.
  Instead I transcribed `truncate_middle` verbatim from `base.py:204-229` and executed it
  against a 200-character input over the `max_length` values listed in P3; that table is
  measured output, not reasoning. `_TRUNCATION_MARKER` renders at 34 characters for
  `omitted=0` and 38 for `omitted=32768`, which is where the ~37 threshold comes from.
- `DATABASE_MAX_STRING_SIZE = 32768` and the `shrink_and_unicodify` path for `tool_stderr`
  read directly (`util/__init__.py:176`, `:581-587`; `model/__init__.py:662`).
- Router handoff path traced through `router.py:296-310` → `:321-339`, and
  `_serialize_handoff` at `:275-294`. `QueryRouterAgent.process:538-541` and
  `OrchestratorAgent.process:104-107` both confirmed to call `_validate_query` on the raw
  query with the flag still `True`.
- Tool registration on `ErrorAnalysisAgent` confirmed absent by reading `_create_agent`
  (`:64-81`) and `grep -c "agent.tool" error_analysis.py` → 0.
- API/integration/Selenium tests not run, per standing instruction.
- **Could not verify:** whether the model's output quality actually improves with the 1/3
  ÷ 2/3 split versus 50/50 — that needs a live inference backend and a corpus of real tool
  stderr. The reasoning is sound but the ratio is a guess, and the PR doesn't claim
  otherwise.
- **Could not verify:** the exact behaviour of `_get_retries` under `retries: .inf` by
  execution (no venv). The claim rests on `OverflowError` being an `ArithmeticError` rather
  than a `ValueError`, which is CPython-documented, and on the `except (TypeError,
  ValueError)` at `base.py:981` — both read directly.
- During the original pass the worktree was left unmodified apart from
  `client/node_modules`. During the cleanup-commit update it remained git-clean; the
  isolated Python environment lived under `/private/tmp`.

## Original bottom line (superseded by cleanup commit `e5e3efdf4e`)

**Requested before merge at PR head — items 1–5 are resolved by `e5e3efdf4e`:**

1. Collapse `_resolve_max_query_length` and `_get_retries` into one coercion helper and
   extend it to `_get_max_tokens` and `_get_agent_timeout`. `retries: yes` silently becomes
   1 today, `retries: .inf` raises through `_create_agent`, and `_get_retries` echoes the
   raw config value into a `ConfigurationError` — the exact three things the new method was
   written to prevent, in the method it sits beside. — P2-a — **resolved**
2. Point the three existing stderr head-slices at `truncate_middle`
   (`error_analysis.py:104`, `:215`, `operations.py:833`). Right now the wizard prompt
   contains the same stderr twice, once fixed and once demonstrating the bug. — P2-b —
   **resolved**
3. Fix the `SCAN_QUERY_FOR_ROLE_MARKERS` comment. "The query here is a job's stderr" is
   false on the router path (`router.py:322`), and "nothing reads its output back as another
   agent's input" is false at `router.py:310`. — P2-c — **resolved by deleting the flag**

**Worth discussing:**

4. Delete `_ROLE_MARKERS` entirely instead of gating them. They are a lowercase substring
   test on a user-role message — trivially bypassed, protecting nothing — and leaving them
   on for the router means pasting `Operating System: Linux` into ChatGXY still returns
   "please rephrase". That's this PR's own bug, unfixed, on the other path. — P2-c —
   **resolved**
5. Move `truncate_middle` to `lib/galaxy/util/`, beside the `shrink_string_by_size` its
   docstring argues with. — P2-b — **resolved**
6. `max_query_length` bounds `query`, but `_analyze` then appends an uncapped
   `prior.content`, so on the sequential `[history, error_analysis]` plan the prompt is
   still unbounded. — P3
7. Resolve the cap once per request rather than twice. — P3

The core change is correct and the care shows in the places that are easy to get wrong —
the tail bias, the omitted count, the "at least", the `!hasError` guard, the fractional-cap
regression test. What it needs is consolidation with the config handling and the stderr
truncation that were already there.
