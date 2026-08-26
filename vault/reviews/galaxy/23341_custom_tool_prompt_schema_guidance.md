# PR 23341 — Fix custom tool prompt guidance that doesn't match the schema

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23341 |
| **Author** | dannon |
| **Base branch** | `dev` |
| **Head reviewed** | `35194beb12` (base `37d59275c1`, `FETCH_HEAD` from `origin-https`) |
| **Size** | 3 files, +173 / -26 (4 commits) |
| **Follows** | #23335 (jmchilton, merged as `2ecf551d42`) |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23341` |
| **Verdict** | **Approve.** Every factual claim in the PR description checks out — I reproduced the `SyntaxError`, the `_split_format` pydantic/JSON-Schema split, the `extra_forbidden` scoping, and the `discover_datasets` rule against the real models and a real `do_eval`. The test is genuinely load-bearing: 9 of 11 mutations I injected went red. My findings are (a) three residual prompt/schema mismatches the author missed — two of them in `custom_tool_critic.md`, the file this PR edited — and (b) the guard being a point fix rather than the reusable one it's two lines away from being. Nothing blocks merge. |

---

## What it does

Second pass over the custom-tool agent prompts, checking prose against the pydantic
models rather than against intent. Nine corrections plus a regression test that parses
the fenced YAML back out of the prompt and validates it.

The premise is sound and worth stating plainly: `custom_tool_structured.md` is a system
prompt with **no consumer that would notice it going stale**. `UserToolSourceAuthoringView`
can narrow arbitrarily and the prompt keeps teaching the old shape forever. This PR is the
first thing in the tree to close that loop.

---

## Verification

No `.venv` in this worktree. Rather than bootstrap, I ran against `pr/22781`'s venv
(pydantic 2.13.4, jsonschema 4.26.0, pytest 9.0.3) with
`PYTHONPATH=/Users/jxc755/projects/worktrees/galaxy/pr/23341/lib`, confirming first that
`galaxy.util.__file__` resolved into *this* worktree and `galaxy_directory()` returned
`/Users/jxc755/projects/worktrees/galaxy/pr/23341`. Node 22 from homebrew for the
expression work. `git status --porcelain` in the worktree is empty; all mutations were
reverted from a saved copy.

**Baseline:**

```
pytest test/unit/app/test_agent_prompts.py -v
→ 15 passed in 0.57s   (7 YAML blocks × 2 parametrized tests, + the format guard)
```

**The expression claims, through the real `do_eval`** (`galaxy.tools.expressions`, node
`vm.runInNewContext`), with `datasets = [{path: "/data/a b.txt"}, {path: "/data/c;rm -rf.txt"}]`:

| Expression | Result |
|---|---|
| `cat $(inputs.datasets[].path)` — the *old* prompt | `SyntaxError: Unexpected token ']'` |
| `cat $(inputs.datasets.map((input) => \`'${input.path}'\`).join(" "))` — the *new* prompt | `cat '/data/a b.txt' '/data/c;rm -rf.txt'` |
| bare `.join(" ")` with no per-element quotes | `cat /data/a b.txt /data/c;rm -rf.txt` — splits and injects, exactly as the prompt now warns |
| `echo $(inputs.some_repeat[0].x)` | `echo first` — the indexing carve-out at `:44-45` is real |

So claims 1, 2 and the `cat_multiple_user_defined.yml` correspondence are all confirmed
empirically, not by reading.

**Mutation testing the new test.** I broke the prompt eleven ways and re-ran:

| Mutation | Result |
|---|---|
| `select` example given a `value:` | **red** (both pydantic + JSON schema) |
| `data` input given a `value:` | **red** (2 failed) |
| `value: 10` → `default: 10` | **red** (2 failed) |
| `format: [fastq]` → `format: fastq` | **red** — JSON-schema test + format guard; **pydantic test passed** |
| `id: head-lines` → `id: 9head-lines` | **red** (2 failed) |
| collection output loses `discover_datasets` | **red** — pydantic only; JSON schema passed (it's a `model_validator`, not expressible in the dump) |
| `help:` as a bare string | **red** (2 failed) |
| output `format: sam` → `[sam]` | **red** (2 failed) |
| all fences ` ```yaml ` → ` ```YAML ` | **red** — 1 failed, 2 skipped |
| **one** fence (`requirements:`) → ` ```yml ` | **GREEN** — 13 passed |
| `corse_max: 4` added to the requirements example | **GREEN** — 15 passed |
| `form_source: x` added to the output example | **GREEN** — 15 passed |
| unmutated sanity | 15 passed |

The `format: fastq` row is the load-bearing one and it lands exactly as the docstring
claims: pydantic accepts it via `_split_format` (`yaml_parameters.py:169-174`), the dumped
JSON Schema rejects it. That justification is not hand-waving; a pydantic-only test would
have missed the very drift that motivated #23335.

The last three rows are P2-4 and P2-6 below.

**Read against the models, confirmed:**

- `TOOL_ID_PATTERN = r"^[a-z][a-z0-9_-]*$"` (`tool_util_models/__init__.py:77`, applied at `:135`) — leading-letter claim correct, `min_length=3`/`max_length=255` correct.
- `HelpContent` is `{format: Literal["restructuredtext","plain_text","markdown"], content: str}` (`tool_source.py:206-208`) — object, not string, both keys required.
- `_check_output_claims` (`__init__.py:224-243`) rejects a `collection` without `discover_datasets`, and a `data` output with neither `from_work_dir` nor `discover_datasets`.
- `_YamlParamBase` is `extra="forbid"` (`yaml_parameters.py:75`); `value` exists on `YamlBoolean/Integer/Float/Text/Color`, and is absent from `YamlSelect`/`YamlData`. `YamlLabelValue.selected` (`:57-61`) is the select default. All correct.
- `_command_input_refs` (`__init__.py:91-98`) pulls `$(...)` blocks then applies `\binputs\.([A-Za-z_][A-Za-z0-9_]*)` — leading name only, and the comment at `:80-87` says so in as many words. The `[].path` form does validate and does die later.
- `container_recommendation_enabled` defaults `False` (`agents/custom_tool.py:337`, `config_schema.yml:4292`).
- The `shlex.quote` asymmetry is real: `evaluation.py:1121-1145` quotes each `do_eval`'d `arguments` entry on the `base_command` branch and passes the `shell_command` branch's result through untouched.

---

## P1 — none

Nothing here is wrong, and nothing here makes anything worse.

---

## P2-1 — the quoting lesson stops one bullet short, on the input that actually matters

The PR's best insight is the sentence at `custom_tool_structured.md:41-42`:

> The result is spliced into the command verbatim, so a bare `.join(" ")` leaves the paths unquoted.

That is exactly right, and it is exactly as true of the bullet three lines *above* it:

```
- Input file paths: `$(inputs.param_name.path)` for single files        # :37
- Input values: `$(inputs.param_name)` for text, integer, float, boolean # :38
```

`:38` is the one whose value an *end user of the generated tool* types into a form. Verified:

```python
do_eval("echo $(inputs.text_param)", {"text_param": "hello; rm -rf /"}, outdir="/wd")
→ 'echo hello; rm -rf /'
```

And nothing downstream re-quotes it. `UserToolEvaluator.__sanitize_param_dict` is a bare
`pass` (`evaluation.py:1066-1067`) — and it is name-mangled to
`_UserToolEvaluator__sanitize_param_dict`, so it is not even an override of
`ToolEvaluator.__sanitize_param_dict`; the parent's sanitizer (`:274`) is simply never
reached because `build_param_dict` is fully overridden. Dead code either way, and the net
effect is the same: unsanitized.

I'm **not** asking for a code change. Unquoted interpolation is the deliberate bargain
`shell_command` makes — the comment at `:1132-1135` says as much ("The upside is that we
can use `>`, `|`") — and a `shlex.quote` on that branch would break every redirect in the
prompt's own examples. But that bargain means the prompt is the *only* thing between a
text parameter and `sh -c`, and this PR is the one that noticed. The prompt's flagship
example already gets it right for the path (`'$(inputs.input_file.path)'`, `:61`) and
wrong-by-omission for the value (`head -n $(inputs.num_lines)` — safe only because it's an
integer). One clause on `:38` — "quote it: `'$(inputs.param_name)'`" — closes it, and
costs nothing.

Worth a separate issue for the two evaluator items (the dead mangled override, and whether
user tools should sanitize text params at all). Both are pre-existing.

## P2-2 — the critic prompt still tells the model citations were validated. Nothing validates them.

`custom_tool_critic.md:3`:

> ...already passed structural validation -- IDs are well-formed, all referenced inputs are declared, container shape is recognized, **citations are present**.

and again at `:38`, in the "What NOT to flag" list:

> - Anything the deterministic validator already catches (undeclared `inputs.X` references, container shape, **citations**, tool id format) -- assume it passed

Neither is true:

- `citations: list[Citation] | None = None` (`tool_util_models/__init__.py:171`) — optional, no `min_length`.
- `CitationsMissing.lint` opens with `tool_xml = getattr(tool_source, "xml_tree", None); if not tool_xml: return` (`linters/citations.py:26-28`). `lint_user_tool_source` builds a `YamlToolSource`, which has no `xml_tree`, so the linter returns before it can warn.
- `custom_tool_structured.md` never mentions citations at all, so the producer is never asked for them.

Verified end to end:

```python
lint_user_tool_source(UserToolSource.model_validate(<a tool with no citations>))
→ []
```

The net effect is that citations are silently unreachable: the producer isn't told to emit
them and the critic is told twice not to ask. This is the same class of bug the PR set out
to fix, in the file the PR edited, and it was the one line in that bullet list left
untouched. Fix is a deletion (drop "citations are present" and the `citations` item from
`:38`) or, if citations are wanted, a line in the structured prompt.

## P2-3 — the critic still says `from_work_dir`, which this PR just corrected everywhere else

`custom_tool_critic.md:26`:

> - File outputs declared without `from_work_dir` or matching command output (the validator should have caught these, but flag any borderline cases)

The PR fixed precisely this in the structured prompt (`:113-115`, and `:215` already said
both). `_check_output_claims` accepts *either*. Verified — a `data` output with only
`discover_datasets` validates and lints clean:

```python
outputs=[{"name": "o", "type": "data",
          "discover_datasets": [{"discover_via": "pattern", "pattern": "__name__", "directory": "out"}]}]
→ UserToolSource.model_validate(...) OK; lint_user_tool_source(...) → []
```

So the critic will flag a correct tool. And the cost isn't cosmetic: "adding or removing an
input/output" is explicitly not a patchable edit (`:59-62`, matching `_PATCHABLE` at
`custom_tool.py:608-614`), so this routes to `needs_full_refine: true` — a whole extra
producer call, which `:76-77` is at pains to say should be rare. Should read
"without `from_work_dir` **or `discover_datasets`**".

## P2-4 — no block-count assertion; the guard silently shrinks

`_prompt_examples()` feeds `@pytest.mark.parametrize` directly. With zero blocks, pytest
emits one *skipped* test per parametrized function — a green run. The author clearly
thought about this: `test_custom_tool_prompt_documents_a_data_input_format` asserts
`formats` is non-empty, which catches *total* vacuity (my all-fences mutation: 1 failed,
2 skipped — correct).

What it doesn't catch is partial shrinkage. Renaming a single fence to ` ```yml `:

```
→ 13 passed, 0 failed
```

Two tests silently stopped existing. Only the block that happens to carry a `format:` key
is protected. This is one line:

```python
blocks = _yaml_blocks(CUSTOM_TOOL_PROMPT)
assert len(blocks) >= 7, f"expected at least 7 YAML examples, found {len(blocks)}"
```

Worth pairing with the PR's own caveat that the last commit was a prettier pass — a
formatter that rewrites fences is exactly the failure mode here. (For what it's worth I
checked the reindent itself is semantically inert: the `configfiles` `content: |` block
round-trips to a byte-identical string pre- and post-PR, because the literal scalar strips
the common indent. And prettier is not wired to `lib/galaxy/agents/prompts/**` in the
`Makefile` or pre-commit config, so this was manual and won't recur automatically.)

## P2-5 — the guard is hard-wired to one file, and re-derives a path nine other call sites already compute

The test defines `PROMPT_DIR` and then never globs it:

```python
PROMPT_DIR = Path(galaxy_directory()) / "lib" / "galaxy" / "agents" / "prompts"
CUSTOM_TOOL_PROMPT = PROMPT_DIR / "custom_tool_structured.md"
```

I counted the fences across the whole directory: `custom_tool_structured.md` has 7, every
other prompt has **0**. So `for path in sorted(PROMPT_DIR.glob("*.md"))` is behaviourally
identical *today* and free — and it means the next prompt to grow a YAML example is covered
without anyone remembering. Right now it isn't: `custom_tool_critic.md` and
`custom_tool_container_critic.md` make schema claims in prose (see P2-2 and P2-3) that
nothing tests, and this PR edited one of them.

Underneath that is the missing abstraction. Nine call sites in `lib/galaxy/agents/` hand-roll
the same path:

```
custom_tool.py:275, :279, :283   gtn_training.py:245   workflow_report.py:26, :27, :33
orchestrator.py:77   history.py:188   error_analysis.py:73   page_assistant.py:315   router.py:268
```

all `Path(__file__).parent / "prompts" / "<name>.md"` followed by `.read_text()`. The test
adds a tenth derivation using a *different* mechanism (`galaxy_directory()`), which happens
to work under the `packages/app` harness only because `packages/app/tests/app` is a symlink
to `test/unit/app/` and `galaxy_directory()` falls back to `cwd.parent.parent` when
`in_packages()` (`galaxy/util/__init__.py:1839-1846`). The neighbouring
`test_markdown_directives_doc.py:11-20` carries a comment about getting exactly this wrong.

A `galaxy.agents.prompts` module exposing `PROMPT_DIR` and `load_prompt(name)` would
collapse all ten, and a test built on it would prove the prompts are reachable the way
production reaches them. That's the reusable-abstraction version of this change; what
landed is the point-fix version. I wouldn't hold the PR for it, but it's the natural
follow-up and it's small.

## P2-6 — half the schema the test validates against can't reject a typo, and the prompt says otherwise

`ToolSourceBaseModel` is `class ToolSourceBaseModel(BaseModel): pass` (`_base.py:12-13`) —
no `extra="forbid"`. So:

| Model | Forbids extras? |
|---|---|
| `_DynamicToolSourceBase` (tool root) | yes (`__init__.py:120-121`) |
| `_YamlParamBase` (inputs) | yes (`yaml_parameters.py:75`) |
| `DatasetCollectionDescription` | yes (`tool_outputs.py:52`) |
| `IncomingToolOutput*` (outputs) | **no** |
| `ResourceRequirement` | **no** |
| `HelpContent`, `TemplateConfigFile` | **no** |

Verified by mutation — both of these leave the suite fully green at 15 passed:

```yaml
requirements:
    - type: resource
      cores_min: 2
      corse_max: 4        # typo, silently absorbed

outputs:
    - name: output_file
      from_work_dir: aligned.sam
      form_source: x      # typo, silently absorbed
```

Two consequences. First, the new test structurally cannot guard the requirements or output
examples against key drift, so those two fences are along for the ride. Second, the prompt
now asserts something broader than is true — `custom_tool_structured.md:91-92`:

> Any other key -- including `default` -- is rejected as an unknown field.

That sentence sits in the **Input Parameter Types** section, so in context it's defensible,
but it reads as a global rule and a model will apply it as one. Either scope it ("on an
input, any other key...") or — better, and a separate PR — give `ToolSourceBaseModel` the
same `extra="forbid"` the input and root models already have. The rationale comment on
`DatasetCollectionDescription` (`tool_outputs.py:51-52`: "so a typo'd key (e.g. `patern`)
is rejected rather than silently absorbed") is already the argument for doing it everywhere.

---

## P3-1 — `repeat` indexing is documented; `repeat` isn't a documented type

`:44-45` now says:

> (Indexing itself is fine; expressions are JavaScript, so `inputs.some_repeat[0].x` works.)

It does work — verified, `echo $(inputs.some_repeat[0].x)` → `echo first`. But the
**Valid types** list at `:79-87` is `data, text, integer, float, boolean, select`. It omits
`repeat`, and also `conditional`, `section`, `data_collection` and `color`, all of which
`YamlGalaxyParameterT` accepts (`yaml_parameters.py:296-308`). A model reading the prompt
top to bottom is told repeat indexing works and simultaneously that `repeat` isn't a type it
may emit. Either drop the parenthetical (the `[]` point stands without it) or say the list
is the common subset and name the rest.

## P3-2 — tool `help` is an object, input `help` is a string, and the prompt only mentions the first

The PR gives tool-level `help` a prominent "An object, not a string" plus an example
(`:25-33`) — good, that was a real gap. But `_YamlParamBase.help` is `str | None`
(`yaml_parameters.py:79`), and `custom_tool_critic.md:14` actively asks the model to add
input `help`. Verified that the object form is rejected there. Having just taught "help is
an object" with no scoping, the prompt makes the wrong generalization the likely one. One
clause on `:26`: "(an *input's* `help` is plain text, not this object)".

## P3-3 — the `data` output line narrowed in the wrong direction

`:112` now reads "**data**: Single output file. Capture it with `from_work_dir`." while
`:215`, unchanged in the same file, correctly says "Outputs are captured via `from_work_dir`
or `discover_datasets`", and `_check_output_claims` accepts either. Not wrong — `data` +
`discover_datasets` is legal (verified above, it's the same construct P2-3 is about) — but
the PR made one of the two statements less complete than the other while making the
neighbouring collection line more complete. Same sentence as P2-3, two files.

## P3-4 — the format-list guard is one-sided

The PR added prose that output `format` is a scalar while input `format` is a list
(`:117-118`) — a genuinely easy thing to get backwards. But
`test_custom_tool_prompt_documents_a_data_input_format` only guards the input half. The
mirror is three lines and closes the pair:

```python
def test_custom_tool_prompt_documents_a_scalar_output_format() -> None:
    formats = [o["format"] for _, t in _prompt_examples() for o in t["outputs"] if "format" in o]
    assert formats, "prompt no longer shows an output format at all"
    for f in formats:
        assert isinstance(f, str), f"output format must be a scalar, got {f!r}"
```

(Note per P2-6 that the JSON-schema test *would* catch a list where a scalar belongs — my
`format: sam` → `[sam]` mutation went red — because `format` is a *declared* field. It's the
undeclared-key case that slips through. So this is a nice-to-have symmetry, not a hole.)

## P3-5 — "container shape is recognized" overstates what runs

`custom_tool_critic.md:3` and `:38` both promise the critic that container shape was
validated. The only container validation on the authoring view is `_reject_blank_container`
(`__init__.py:337-345`) — a non-empty check. Low impact, since that prompt is told not to
touch containers anyway, and P2-2 is editing the same two lines.

## P3-6 — the join separator drifted from the fixture it cites

Prompt `:41` uses `.join(" ")`; `test/functional/tools/cat_multiple_user_defined.yml:8`
uses `.join(' ')`. Identical semantics, and the prompt's is arguably nicer inside a YAML
scalar. Mentioning it only because the PR's argument for the new form is "this is what the
working fixture does", and copying it verbatim removes a difference a reader has to check.
Take it or leave it.

---

## What I verified empirically vs. what I only read

**Ran:**

- `pytest test/unit/app/test_agent_prompts.py -v` → 15 passed, 0.57s. Confirmed 7 YAML blocks are found and both parametrized tests run over all of them.
- Eleven prompt mutations (table above). 9 red, 3 green; the three green ones are P2-4 and P2-6.
- `do_eval` on five expressions through real node, including the pre-PR form (reproduced `SyntaxError: Unexpected token ']'` verbatim), the post-PR form, the unquoted variant, the repeat-index carve-out, and an injected text parameter.
- `lint_user_tool_source` on a citation-free tool (→ `[]`) and on a `data` output with only `discover_datasets` (→ validates, `[]`).
- Input-level `help` as an object → rejected.
- Pre/post round-trip of the reindented `configfiles` `content: |` block → byte-identical string.
- Fenced-YAML census across all 11 files in `lib/galaxy/agents/prompts/`.

**Read only, not executed:**

- **Claim 7, `GALAXY_SLOTS` ≠ `cores_min`.** I confirmed `ResourceRequirement.cores_min` exists and defaults to 1 (`tool_source.py:64-66`), but did not trace a job runner to see where `GALAXY_SLOTS` is actually set or how destination config maps it. The new wording is *more* cautious than the old and can't be wrong in a way that hurts, so I didn't chase it.
- The `shlex.quote` asymmetry was read at `evaluation.py:1121-1146`, not exercised through a real job.
- **CI status not checked.** I did not look at whether this branch's checks are green, or whether `test/unit/app/test_agent_prompts.py` ran in the unit-test workflow. It is collected by the `packages/app` harness via the `packages/app/tests/app` symlink.
- I did **not** run the wider unit suite, mypy, or any linter over the changed test file. Imports in `test_agent_prompts.py` are all module-level and correctly ordered (stdlib / third-party / galaxy) — no function-local imports, per the standing preference.
- Whether the prompt `.md` files ship in the `galaxy-app` wheel. `packages/app/pyproject.toml` has no `[tool.setuptools.package-data]` and no `MANIFEST.in`, which *suggests* a wheel install would have no prompts and the nine `read_text()` call sites would raise. Entirely pre-existing, unverified, and not this PR's problem — noting it only because P2-5 touches the same code.
- Nothing was posted to GitHub.

---

## Follow-ups

Ours, if we want them:

1. **Prompt-side, this PR** (small, all in the two `.md` files): P2-2 (drop the citations claim in two places), P2-3 (`from_work_dir` **or `discover_datasets`** in the critic), P2-1 (quote the scalar on `:38`), P3-2 (scope the `help`-is-an-object line), P3-1 (repeat vs. the type list), P3-3.
2. **Test-side, this PR** (two lines + a glob): P2-4 block-count assertion, P2-5 glob `PROMPT_DIR` instead of pinning one file. Both are strictly additive.
3. **`galaxy.agents.prompts.load_prompt()`** — separate PR. Collapses ten path derivations, and lets the prompt test load prompts the way production does.
4. **`ToolSourceBaseModel` gains `extra="forbid"`** — separate PR, needs its own test sweep since it will reject stored rows carrying stray keys. The argument is already written down at `tool_outputs.py:51-52`.
5. **`UserToolEvaluator.__sanitize_param_dict`** — separate issue. The `pass` is name-mangled and overrides nothing; decide whether user tools should sanitize text params at all, then either delete the dead method or make it real.

Not ours: nothing here is waiting on us for a response.

---

## Follow-up work delivered — branch `jmchilton:23341-review-followups`

Written 2026-08-23 after 23341 merged as `fae4f23a41`. Worktree
`~/projects/worktrees/galaxy/branch/23341-review-followups`, based directly on the merge
commit. Pushed, **no PR opened**. Scope was items 1-3 of the list above; items 4 and 5
were deliberately left out (see below).

Four commits, one per concern:

| Commit | Findings | Contents |
|---|---|---|
| `6c6d097b5b` | P2-2, P2-3, P3-5 | `custom_tool_critic.md`: dropped the "citations are present" claim in both places, made the output line say `from_work_dir` **or `discover_datasets`**, and replaced "container shape is recognized" with what `_reject_blank_container` actually does. |
| `4f1accef82` | P2-1, P2-6, P3-1, P3-2, P3-3 | `custom_tool_structured.md`: quote the scalar on `:38`; scope "any other key is rejected" to inputs; type list now says it's the common subset and names the other five; `help`-is-an-object scoped to tool level; `data` outputs take either capture mechanism. |
| `191c311a09` | P2-4, P3-4 | `EXPECTED_YAML_BLOCKS` count assertion, and the scalar-output-`format` mirror of the existing input guard. |
| `dfec7eee01` | P2-5 | New `galaxy/agents/prompts/__init__.py` exposing `PROMPT_DIR`, `prompt_path()`, `load_prompt()`; all eleven derivations across nine modules and the test now go through it, and the test globs `custom_tool*.md` instead of pinning one filename. |

**Verification.** Both new tests confirmed red-to-green against the exact mutations that
were green in the original review: the ` ```yml ` fence rename now fails only the new
count test (1 failed, 14 passed), and `format: sam` → `[sam]` fails the new scalar test
alongside the two existing checks. The prompt claims were re-verified rather than taken
from the review — `do_eval` on `text_param = "hello; rm -rf /"` yields `echo hello; rm -rf /`;
a citation-free tool lints to `[]`; a `discover_datasets`-only `data` output validates and
lints clean; an object `help` on an input is rejected with `string_type`.

Full agent unit suite (`test_agent_prompts`, `test_agents`, `test_static_agent_backend`,
`test_gtn_search`, `test_history_tools`, `test_AgentOperationsManager`, `test/unit/agents/`)
run on both the branch and a throwaway worktree at the same base commit with the same
interpreter: **263 passed / 0 failed** at base, **265 passed / 0 failed** on the branch —
the +2 being the new tests. `pytest-asyncio` had to be supplied out of a temp target dir;
without it, 70 tests fail identically on both sides and the comparison says nothing.

**Two things worth knowing about the refactor.** The naive call-site rewrite silently broke
`history.py`, which was the one site with an `.exists()` guard and a fallback prompt — caught
by reading the diff, fixed to use `prompt_path()`. And `from galaxy.agents.prompts import ...`
costs ~3.5s because `galaxy/agents/__init__.py` eagerly imports all fourteen agents; the
prompt test went 0.5s → 4.0s. Accepted, because the test now reaches the prompts the way
production does instead of through `galaxy_directory()`.

**Not taken:**

- P3-6 (`.join(" ")` vs the fixture's `.join(' ')`) — identical semantics, churn for nothing.
- Item 4, `ToolSourceBaseModel` gaining `extra="forbid"` — real behaviour change, needs its
  own test sweep against stored rows. Still worth doing; the argument is already written at
  `tool_outputs.py:51-52`.
- Item 5, `UserToolEvaluator.__sanitize_param_dict` — needs a product decision before code.

**New follow-ups this work surfaced:**

1. `galaxy/agents/__init__.py` eagerly imports every agent, so any `galaxy.agents.*` import
   pays ~3.5s. A PEP 562 `__getattr__` would keep the public API and make submodule imports
   cheap.
2. The prompts still have no `package-data` entry in `packages/app/pyproject.toml` and
   `[tool.setuptools.packages.find]` only collects packages — so a wheel install plausibly
   ships no `.md` files and every one of these call sites raises. Making `prompts` a real
   package is a prerequisite for an `importlib.resources` fix, not the fix itself. Unverified;
   needs an actual wheel build.
3. Quoting `'$(inputs.param_name)'` still mangles a value containing an apostrophe. The same
   gap exists in the path guidance #23341 shipped. Properly fixed in the evaluator, not the
   prompt — which is item 5.

**Open question for the user:** the citations claim was removed rather than made true. If
citations are actually wanted from generated tools, the fix is a line in
`custom_tool_structured.md` asking for them plus a real linter path — decide which.

### Branch trimmed to the prompt half — 2026-08-23

At the user's direction `jmchilton:23341-review-followups` was cut back to the two
prompt commits (`6c6d097b5b`, `4f1accef82`) and force-pushed. What ships is 2 files,
+19/-9, all `.md` — the eleven findings in the two prompt files, nothing else. Existing
`test_agent_prompts.py` passes unchanged (15 passed), which is the right check now that
this branch adds no tests.

The other two commits — P2-4/P3-4 test hardening and the `load_prompt()` refactor —
were moved to local branch `23341-review-followups-tests-and-loader` at `dfec7eee01`
before the reset. **That branch is local to the worktree and is not on any remote**
(it was pushed once as part of the four-commit branch, then force-removed). It's the
better-verified half of the work — 265 passed / 0 failed against 263 / 0 at base — and
wants its own PR. If the worktree gets torn down before that happens, the work is gone.
