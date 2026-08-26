# PR 23351 — Multiple select inputs are optional by default

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23351 |
| **Author** | guerler (Aysam Guerler) |
| **Base branch** | `dev` |
| **Head reviewed** | `022812ed60923982ad5efaa48eae9015500fb475` (2 commits: `7db3dcf713` lib, `022812ed60` tests) |
| **Size** | 3 files, +34 / -3 |
| **State** | OPEN, opened 2026-08-24; 2 review threads (mvdbeek → guerler, both resolved into the current approach), 1 comment from mvdbeek |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23351` |
| **Verdict** | **Approve with comments.** The change is correct and is a *bugfix*, not a semantic choice — `galaxy.xsd:4490-4495` has documented this exact default for years and `basic.py` has implemented it since 2013. I measured precisely what it changes (72-cell state matrix, patched vs reverted): for plain multiple selects **only the two test-case states move**; for `no_options`-bearing ones `null` flips valid in all nine, which fixes a real failure I reproduced in two bundled tools (`wc_gnu`, `ngs_simulation`). So the title overclaims — multiple selects were *already* optional everywhere that matters — but the PR is justified on the validator path and on removing the `or self.multiple` papering-over. The spec edit is **not** a weakened test: measured, one deleted comment is genuinely answered; the second is not, and should come back (P2-3). Main asks: the new tool is the only member of its family with no runtime test and needs one decorator line (P2-4), and the reuse point — a 30-line model-vs-runtime agreement check found two more divergences of exactly this kind immediately (P2-1/P2-2). |

---

## What it does

**One production line.** `lib/galaxy/tool_util/parameters/factory.py:246-252` — in the `select`
branch, `optional = input_source.parse_optional()` moves below the `multiple` lookup and becomes
`optional = input_source.parse_optional(multiple)`.

`parse_optional(default=None)` (`lib/galaxy/tool_util/parser/interface.py:566-570`, overridden in
`lib/galaxy/tool_util/parser/xml.py:1539-1554`) treats its argument as the *default* when the XML
carries no explicit `optional` attribute. So `multiple="true"` selects model as `optional=True`
unless the tool says `optional="false"`.

**Two test files.** A new functional tool
`test/functional/tools/parameters/gx_select_multiple_no_options_validation.xml`
(`multiple="true"` select + `no_options` validator, empty `<tests>`), and
`test/unit/tool_util/parameter_specification.yml`: two comments deleted from the
`gx_select_multiple` block, one comment added, and a new
`gx_select_multiple_no_options_validation` block (`:824-834`) with `job_internal_*` /
`job_runtime_*` cases only.

**History note.** mvdbeek's inline review on the first iteration
(`lib/galaxy/tool_util/parameters/convert.py:504`) pushed back on an earlier approach that patched
the default-filling path; guerler agreed and moved it to `factory.py`. The current shape is the
one mvdbeek asked for, and his standing comment is "This looks to be in parity with basic.py now
but I defer to @jmchilton."

---

## Exactly what changes observably — the full state matrix

This is the question that decides whether the PR is a bugfix or a no-op, so I measured it
exhaustively rather than reasoning about it. For both affected tools I ran all **nine** state
representations against four value shapes (`null`, absent, `["--ex1"]`, `[]`) — 72 cells — with
the lib commit applied and reverted, and diffed the two runs.

**Only three things change. Nothing else moves.**

### 1. For a plain `multiple="true"` select: only the *test-case* states

`gx_select_multiple` (no validator) — the entire diff across 36 cells:

```
- gx_select_multiple::test_case_xml::null   INVALID   ->  valid
- gx_select_multiple::test_case_json::null  INVALID   ->  valid
- gx_select_multiple::optional              false     ->  true
```

`request`, `request_internal`, `landing_request`, `job_internal`, `job_runtime`, `workflow_step`
and `workflow_step_linked` are **byte-identical** before and after, for all four value shapes.
That confirms the coordinator's hypothesis: those paths never consulted `self.optional` for a
multiple select in the first place. `SelectParameterModel.py_type` (`parameters.py:1920-1922`)
already reads `optional_if_needed(..., self.optional or self.multiple)`, and
`request_requires_value` returns `False` unconditionally (`:1983-1989`). The `or self.multiple`
was the workaround; this PR makes the left operand true so the workaround stops being load-bearing.

The two cells that *do* move are the ones whose `py_type` uses bare `self.optional` with no
`or self.multiple` — `test_case_xml` and `test_case_json` (`parameters.py:1937-1947`). So a tool
test may now write an explicit `null` for a multiple select where the model previously rejected it.

**That change is completely uncovered.** The PR adds no `test_case_xml_valid: - parameter: null`
or `test_case_json_valid: - parameter: null` to the `gx_select_multiple` block, whose test-case
lists (`parameter_specification.yml:775-787`) are otherwise thorough. Two lines would pin it:

```yaml
  test_case_xml_valid:
  - parameter: "--ex1,ex2"
  - parameter: "--ex1"
  - parameter: ["--ex1"]
  - parameter: null          # <- newly valid, currently unasserted
```

This is the *only* behavioural change the PR makes to the overwhelming majority of affected tools
(77 of the 81 in-tree multiple selects carry no `no_options` validator), and it is the one thing
the spec diff does not assert. Worth asking for.

### 2. For a `no_options`-bearing multiple select: `null` flips in *all nine* states

`gx_select_multiple_no_options_validation` — `null` goes `INVALID -> valid` in `request`,
`request_internal`, `landing_request`, `job_internal`, `job_runtime`, `workflow_step`,
`workflow_step_linked`, `test_case_xml` and `test_case_json`, and `validators` goes
`['no_options'] -> []`. Absent, `["--ex1"]` and `[]` are unchanged everywhere.

This is the dominant effect, and it is where the user-visible bug lived (the `wc_gnu` /
`ngs_simulation` failures above). It happens because `factory.py:259-265` drops the validator
entirely once `optional` is true, rather than the validator being skipped at evaluation time.

**Note this corrects the reasonable assumption that request-state cases would be vacuous here.**
For the *single* select sibling `gx_select_no_options_validation`, `request::null` was and remains
INVALID, so that block rightly has no `request_*` cases. But for the new *multiple* tool
`request::null` genuinely flips — so a `request_valid: - parameter: null` case would be a real
red-to-green assertion, not a vacuous one. Its absence is a genuine, if small, coverage gap: the
PR pins the job-state flip and leaves the request-state flip (the one that actually reaches the
tool-request API) unasserted. See P2-4.

### 3. The serialized `optional` field itself

`optional` is a real field on `SelectParameterModel`, not an internal. It is emitted into the
parameter schema clients consume (`BaseGalaxyToolParameterModelDefinition.field_kwargs`,
`parameters.py:252+`, and the schema path through
`lib/galaxy/webapps/galaxy/services/base.py:206`). So every `multiple="true"` select in every
Galaxy tool now advertises `optional: true` to the client. That is a contract change even for the
tools where no validation behaviour moves — and it is a change *toward* what `galaxy.xsd`
documents and what `basic.py` has always reported through `to_dict` (`basic.py:363`), so the
client was already being told two different things by the two layers.

### So: is the PR justified?

Yes, and more narrowly than its title suggests. "Multiple select inputs are optional by default"
was **already** the observable behaviour of every request-, job- and workflow-state path — the
runtime test `test_select_multiple_does_not_select_first_by_default`
(`lib/galaxy_test/api/test_tool_execute.py:786-801`) has been asserting exactly that, across all
three input formats including `request`, and it passes on `dev` today. What the PR actually does
is (a) fix a real validation failure for `no_options`-bearing multiple selects, (b) align the
test-case states, and (c) make the model *say* what every other layer already did, so the
`or self.multiple` special-cases scattered through `parameters.py` become removable.

That last point is the durable one and the PR should claim it: `parameters.py:1922`, `:1936` and
the comments at `:1987-1988` all exist to paper over the disagreement this change removes. None of
them are cleaned up here — a reasonable follow-up, and a good way to prove the change is complete.

---

## The description makes none of the three arguments that are available to it

The PR body is one sentence — "Multiple select inputs should be optional by default." — with no
rationale, no issue link, and every "how to test" checkbox left unticked. That is a shame,
because the justification here is unusually strong and entirely verifiable. All three of these
should be in the body:

### 1. The XSD already documents this exact rule

`lib/galaxy/tool_util/xsd/galaxy.xsd:4490-4495`, the `optional` attribute on `<param>`:

> If `false`, parameter must have a value. **Defaults to `false` except when the `type` attribute
> value is `select` and `multiple` is `true`.**

This is the published tool-author-facing contract. The parameter model was violating its own
schema documentation. This is not "should multiple selects be optional?" — it is "the model layer
does not implement the documented default." That reframes the whole PR from a preference to a
defect, and it is the single sentence the body most needed.

### 2. The runtime layer has read this way since 2013, and the model was the outlier

Verified by `git log -L 995,995:lib/galaxy/tools/parameters/basic.py`:

| commit | date | author | what |
|---|---|---|---|
| `f4296d5bb2` | 2013-04-14 | John Chilton | introduces `string_as_bool(elem.get('optional', self.multiple))` in `SelectToolParameter` |
| `ec24396140` | 2014-12-11 | John Chilton | the `InputSource` refactor **drops the line** — regression |
| `08bc32ce42` | 2015-01-29 | **Aysam Guerler** | "Parameters: Multiselect back to optional by default" — restores it as `parse_optional(self.multiple)` |
| `21b44bf348` | — | — | whitespace only |

So `lib/galaxy/tools/parameters/basic.py:995` has read `self.optional = input_source.parse_optional(self.multiple)`
continuously for ~11 years, it is untouched by this PR, and the PR author is the same person who
restored it the first time a refactor lost it. This PR is that same fix applied to the second
implementation of parameter parsing. Worth saying out loud.

### 3. It repairs a live failure in two bundled tools — measured, not inferred

`factory.py:259-265` gates the `no_options` validator on `if not optional:`. On `dev`, a
`multiple="true"` select is `optional=False`, so the validator is attached, and
`no_options_validate` (`lib/galaxy/tool_util_models/parameter_validators.py:293-298`) raises on
`value is None`. Three in-tree bundled params hit this. I built the models directly and ran the
real validators both ways:

```
########## dev (change reverted) ##########
lib/galaxy/tools/bundled/filters/wc_gnu.xml::options  optional=False multiple=True validators=['no_options']
    job_internal  None  -> INVALID (1 validation error for DynamicModelForTool)
    job_internal  []    -> VALID
    job_runtime   None  -> INVALID
########## with the PR ##########
lib/galaxy/tools/bundled/filters/wc_gnu.xml::options  optional=True multiple=True validators=[]
    job_internal  None  -> VALID
    job_internal  []    -> VALID
    job_runtime   None  -> VALID
```

Same result for `ngs_simulation.xml`'s `polymorphism` and `detection_thresh`. The error string is
`No options available for selection` — user-facing nonsense for a tool where selecting nothing is
legal.

**Severity, honestly scoped.** This validation is *not* advisory, but it is also not on the legacy
tool form. `Tool.expand_incoming_async` (`lib/galaxy/tools/__init__.py:2282-2340`) calls
`internal_tool_state.validate(parameter_bundle, ...)` at `:2333`; the classic
`Tool.expand_incoming` (`:2343-2377`) does not. So the blast radius is the newer surfaces:
the tool-request API (`lib/galaxy/webapps/galaxy/services/jobs.py:257-268`), landing requests
(`lib/galaxy/managers/landing.py:107`), `lib/galaxy/tools/evaluation.py:1101`,
`lib/galaxy/workflow/modules.py:2404`, `lib/galaxy/managers/jobs.py:2247`, and the parameter
schema served via `lib/galaxy/webapps/galaxy/services/base.py:206`. Real, growing, and not yet
the default path — which is why it went unnoticed, and also why landing it now is cheap.

Also worth stating in the body: **the escape hatch works.** `optional="false" multiple="true"`
still models as `optional=False` with the validator attached (measured, table in P2-1). Tool
authors who genuinely require a selection are not locked out. That directly answers mvdbeek's
"then later flip the default via a profile" worry — no profile flag is needed to opt out today.

---

## P2 findings

### P2-1 — The one-line patch closes the select gap, but two more of exactly the same gap remain

The lead question was whether patching one call site is the right move. I answered it by
execution: for each parameter type I built the model via
`_from_input_source_galaxy(XmlInputSource(elem), 24.2)` and the runtime object via
`ToolParameter.build(None, elem)` from the same XML, and compared `.optional`.

| param XML | model | runtime | |
|---|---|---|---|
| `select` | False | False | |
| `select multiple="true"` | **True** | **True** | fixed by this PR |
| `select multiple="true" optional="false"` | False | False | escape hatch intact |
| `genomebuild` | False | False | |
| **`genomebuild multiple="true"`** | **False** | **True** | **DIVERGES** |
| `genomebuild optional="true"` | True | True | |
| `data_column` (± `multiple`, `optional`, `force_select`) | agrees | agrees | |
| `group_tag` (± `multiple`) | False | False | |
| `group_tag optional="true"` | True | `"true"` | **type bug, see P3-3** |
| `drill_down multiple="true"` | False | False | |
| **`drill_down optional="true"`** | **False** | **True** | **DIVERGES** |
| `data multiple="true"`, `text`, `integer`, `rules` | agrees | agrees | |
| `ftpfile` | `UnknownParameterTypeError` | True | no model exists at all |

Two live divergences remain, both one-liners, both in the file this PR already touches:

**`genomebuild multiple="true"`.** `GenomeBuildParameter` (`basic.py:1264`) is a
`SelectToolParameter` subclass with no `optional` override, so it inherits `basic.py:995`'s
`parse_optional(self.multiple)`. `factory.py:331` is a bare `parse_optional()`. The mechanical fix
mirrors this PR exactly — move the `multiple` lookup above it and pass it. **But do not do that
without a decision**, because unlike selects the XSD does *not* carve out genomebuild: the
documentation at `galaxy.xsd:4493-4495` says "except when the `type` attribute value is `select`
and `multiple` is `true`", full stop. So here it is arguable that `basic.py` is the bug and the
model is right. Either way it should be *decided* and pinned, not left as an accident of class
inheritance. (`gx_genomebuild*` spec blocks exist at `parameter_specification.yml:837+`; there is
no `multiple` genomebuild fixture.)

**`drill_down optional="true"`.** `DrillDownParameterModel` has no `optional` field of its own
(`lib/galaxy/tool_util_models/parameters.py:2053-2058`) and the `drill_down` branch in
`factory.py:275-289` never calls `parse_optional` at all — so `optional` is hardcoded to the
`BaseGalaxyToolParameterModelDefinition` default of `False` (`parameters.py:250`). A tool that
explicitly writes `optional="true"` on a drill_down has that silently dropped by the model, while
`DrillDownSelectToolParameter.__init__` (`basic.py:1698-1700`, which calls
`ToolParameter.__init__` directly, bypassing `SelectToolParameter`) honours it. That one is
unambiguously a model-layer bug — the tool said something and the model ignored it.

Neither is a blocker for this PR. Both are the argument for P2-2.

### P2-2 — There is no shared derivation and no test enforcing model/runtime agreement; the test is ~30 lines and finds bugs immediately

This is the reuse question, and the answer is bleak: `optional` is derived independently in two
places with no coupling and nothing checking them against each other.

Runtime (`lib/galaxy/tools/parameters/basic.py`) has one base call plus three overrides:

```
:224   ToolParameter.__init__          parse_optional()
:781   FTPFileToolParameter            parse_optional(True)
:995   SelectToolParameter             parse_optional(self.multiple)     <- the rule
:1457  ColumnListParameter             parse_optional(False)
```

Model (`lib/galaxy/tool_util/parameters/factory.py`) has eleven independent call sites — lines
97, 129, 156, 188, 200, 222, 237, **252**, 292, 316, 331 — of which this PR fixes exactly one.
There is no shared helper, no cross-check, and no test in `test/unit/` that compares the two.
(`test/unit/tool_util/test_input_models.py`, `test_parameter_convert.py` and
`test_parameter_test_cases.py` all exercise the model alone; `test/unit/app/tools/util.py` is the
only place `ToolParameter.build` appears in unit tests, and it is not doing this.)

The `parameter_specification.yml` harness looks like it should be the mechanism, but it isn't:
`_test_file` (`test/unit/tool_util/test_parameter_specification.py:90-96`) builds
`parameter_bundle_for_file(...)` from `galaxy.tool_util.parameters` only. It pins the *model's*
behaviour against hand-written expectations. Nothing in it ever instantiates a `basic.py`
parameter, so a model/runtime drift is invisible to it by construction — which is precisely how
this one survived.

**Concrete suggestion, and I verified it works.** The `test/functional/tools/parameters/`
directory is already a curated corpus of every parameter shape. A single parametrized test over
it, asserting the two layers agree on `optional`, is the durable abstraction this PR could leave
behind:

```python
@pytest.mark.parametrize("path", sorted(glob(".../test/functional/tools/parameters/*.xml")))
def test_model_and_runtime_agree_on_optional(path):
    for elem in ET.parse(path).getroot().iter("param"):
        model = _from_input_source_galaxy(XmlInputSource(elem), profile)
        runtime = ToolParameter.build(None, elem)
        assert model.optional == runtime.optional, elem.get("name")
```

That is the whole thing. Written ad hoc against a small hand-rolled case list it found both
divergences in P2-1 on the first run, plus the `group_tag` string/bool bug in P3-3. Landing it
would also mean the *next* `factory.py` branch cannot silently disagree with `basic.py`, and it
gives a place to record the intentional exceptions (`ftpfile`, which has no model at all) as
explicit skips rather than as nothing.

If that is too much for this PR — fair, it is a different piece of work — then at minimum the
`multiple`-implies-optional rule deserves to exist once. A `select_default_optional(input_source)`
helper on `InputSource`, called from both `basic.py:995` and `factory.py:252`, would make the two
layers structurally incapable of drifting on this particular rule. Today they agree by
coincidence of two people typing the same expression eleven years apart.

### P2-3 — One deleted comment is answered; the other is deleted rather than answered

This is the crux, so here is the measurement rather than an opinion. I reverse-applied the lib
commit and re-ran the spec suite. **Exactly one spec block fails**, and it is the new one:

```
FAILED test/unit/tool_util/test_parameter_specification.py::test_specification
  file = 'gx_select_multiple_no_options_validation'
  valid_or_invalid = 'job_internal_valid'
  request = {'parameter': None}
  AssertionError: ... failed to validate internal job description {'parameter': None}.
    parameter: Value error, No options available for selection
1 failed, 7 passed
```

Every pre-existing `gx_select_multiple` case passes identically with and without the patch. That
splits the two deleted comments cleanly:

**Deleted comment 1 (`parameter_specification.yml:732`, under `request_valid`) — legitimately
answered.** The old text was `# ugh... but these aren't optional...`, sitting above
`- parameter: null` / `- {}`. It was a complaint that the *model said* `optional=False` while the
spec accepted null anyway (the accepting bit comes from
`SelectParameterModel.py_type`, `parameters.py:1920-1922`, which uses
`self.optional or self.multiple`, and from `request_requires_value` returning `False`
unconditionally at `:1984-1989`). After this PR the model says `optional=True`, so the "ugh" is
gone and the replacement `# multiple selects are optional by default` is an accurate statement of
why those cases are valid. Good change. This is "the spec was confusing and is now explained,"
not "the spec was inconvenient."

**Deleted comment 2 (formerly at `parameter_specification.yml:757`, under `workflow_step_valid`)
— not answered.** The text was `# ... hmmm? this should maybe be invalid right?` above
`- parameter: null`. That case is valid because `py_type_workflow_step`
(`parameters.py:1924-1927`) is `optional(self.py_type_if_required())` — unconditionally optional,
with its own comment saying "this is always optional in this context". It has nothing to do with
`self.optional`, which is why it passed both before and after in my mutation run. The previous
author's question — *should a workflow step be allowed to null out a required select?* — is
untouched by this PR and is still open.

Deleting it removes the only marker anyone left on a live question. **Ask for it back**, ideally
sharpened to say why it is unrelated:

```yaml
  workflow_step_valid:
  - parameter: ["--ex1"]
  - parameter: ["ex2"]
  - {}  # could come in linked...
  # always optional in workflow_step state regardless of `optional` - see
  # SelectParameterModel.py_type_workflow_step. Should it be?
  - parameter: null
```

That is a one-line ask and it is the difference between the diff reading as a cleanup and reading
as tidying away an inconvenient sticky note.

### P2-4 — The new tool is the only member of its family with no runtime test, and the request-state flip is unasserted

Three gaps, in descending order of how cheap they are to close.

**The new tool has zero runtime coverage, and it is the odd one out.** `grep -rn
gx_select_multiple_no_options_validation lib/ test/` returns exactly two hits: its own XML and
`parameter_specification.yml:824`. Nothing in `lib/galaxy_test/`. Every sibling in the
`*_no_options_validation` family *does* have runtime coverage in
`lib/galaxy_test/api/test_tool_execute.py`:

| tool | runtime tests |
|---|---|
| `gx_select_no_options_validation` | `:730` (`test_select_first_by_default`), `:740` (`test_select_on_null_errors`) |
| `gx_select_optional_no_options_validation` | `:771` (`test_select_optional_null_by_default`) |
| **`gx_select_multiple_no_options_validation`** | **none** |

And it ships an empty `<tests>` block, so the framework-tool CI does not run it either. It is
therefore exercised only by the YAML spec harness.

This matters more than usual because of the state matrix above: for this tool `null` flips
`INVALID -> valid` in **all nine** state representations, including `request` — the one that
reaches the tool-request API — and the spec block asserts only two of them (`job_internal`,
`job_runtime`).

The fix is one decorator line, and the precedent is 15 lines above the target:
`test_select_multiple_does_not_select_first_by_default` (`test_tool_execute.py:786-801`) already
pairs `gx_select_multiple` with `gx_select_multiple_optional` and asserts that both `{}` and
`{"parameter": None}` produce a single job with output `None`:

```python
@requires_tool_id("gx_select_multiple")
@requires_tool_id("gx_select_multiple_optional")
@requires_tool_id("gx_select_multiple_no_options_validation")   # <- add this
def test_select_multiple_does_not_select_first_by_default(...):
```

That test's `tool_input_format` fixture is parametrized `["legacy", "21.01", "request"]`
(`lib/galaxy_test/api/conftest.py:154-156`) and `when.any()` applies the inputs to all three
(`lib/galaxy_test/base/populators.py:4757-4759`), so the `request` parametrization drives the
model-validated path end to end. One line buys genuine coverage of the exact flip this PR makes,
on the exact surface where it matters. The mirror-image structure is already there in
`test_select_optional_null_by_default` (`:770-783`), which pairs `gx_select_optional` with
`gx_select_optional_no_options_validation` for the single-select case — this PR is adding the
multiple-select half of that pair and stopping one line short of wiring it up the same way.

**The request-state flip is unasserted in the spec too.** Given that `request::null` genuinely
changes for this tool (measured), a `request_valid: - parameter: null` in the new block would be a
real red-to-green case. Two more lines:

```yaml
gx_select_multiple_no_options_validation:
  request_valid:
  - parameter: null      # <- newly valid; INVALID on dev
  job_internal_valid:
  ...
```

**Nothing covers `optional="false" multiple="true"`.** This PR *creates* a newly meaningful state:
before it, `optional="false"` on a multiple select was a no-op (the default was already false);
after it, it is the only way a tool author can demand a selection, and the only path on which the
`no_options` validator still fires for a multiple select. There is no fixture and no spec block
for it. A `gx_select_multiple_required_no_options_validation.xml`
(`multiple="true" optional="false"` + `no_options`) with `job_internal_invalid: - parameter: null`
would pin the escape hatch that makes this change safe to land — and it is the case a future
refactor is most likely to break, since it is now the only thing standing between "optional by
default" and "optional, full stop."

---

## P3 findings

### P3-1 — The empty `<tests>` block is fine, and the tool needs no registration (question answered, no action)

Both worth stating explicitly so nobody re-raises them:

- **Empty `<tests>` is the local convention for validation-only fixtures.** Of the 98 XML files in
  `test/functional/tools/parameters/`, 24 have an empty `<tests>` element and 10 have none at all.
  The direct sibling `gx_select_no_options_validation.xml` has an empty `<tests>` block too, as do
  `gx_select_optional_no_options_validation.xml`, `gx_select_dynamic_empty*.xml` and every
  `gx_text_*_validation.xml`. This file matches its neighbours exactly.
- **No registration needed.** `test/functional/tools/sample_tool_conf.xml:309` is
  `<tool_dir dir="parameters/" />`, so every `.xml` in the directory is loaded automatically. Only
  the YAML tools need explicit `<tool file="..."/>` lines (`:310-327`, with a comment saying so).
  And the spec harness resolves by basename through
  `parameter_tool_source` (`lib/galaxy/tool_util/unittest_utils/parameters.py:37-53`), which finds
  it without any conf at all.

So the file is not dead weight — but see P2-4, it is currently doing only half the job it could.

### P3-2 — The missing `request_*` cases match the sibling's shape, but the sibling's reasoning does not carry over

Worth recording carefully because the omission looks defensible and is only half so.

The sibling `gx_select_no_options_validation` block (`parameter_specification.yml:814-822`) also
has only `job_internal_*` and `job_runtime_*` — no `request_*` — and the new block at
`:824-834` matches it exactly. For the *sibling* that is correct: it is a single, non-optional
select, so `request::null` was INVALID before this PR and is INVALID after (measured), and
request-state cases really would be vacuous.

But the reasoning does not transfer to the new *multiple* tool, where `request::null` flips
`INVALID -> valid`. Copying the sibling's shape imported its silence without importing its
justification. Covered as an ask in P2-4; noting it here so the "it matches the sibling" defence
is on the record as insufficient rather than wrong.

### P3-3 — Two stale references and a latent type bug in the neighbourhood

None of these are this PR's fault; all three are one-liners for whoever is next in this file.

- **`test/functional/tools/parameters/gx_select_multiple.xml:27`** carries
  `<!-- these parameters are not implicitly optional and don't select top option -->` on a test
  that asserts the output is `None`. The first half of that sentence is now flatly contradicted by
  the change (and was already contradicted by `basic.py:995`). Since this PR is the one making it
  false in the model, updating it here is fair game and cheap.
- **`lib/galaxy/tool_util_models/parameters.py:1988`** points at
  `test_select_multiple_null_handling` to justify the "always allow null regardless of optional"
  behaviour. `grep -rn` over `lib/` and `test/` finds exactly one hit — this comment. The test does
  not exist. The behaviour it describes is real (measured), but the citation is dead;
  `test_select_multiple_does_not_select_first_by_default` looks like the intended referent.
- **`lib/galaxy/tools/parameters/basic.py:1342`**, `SelectTagParameter.__init__`, is
  `self.optional = input_source.get("optional", False)` — `get`, not `get_bool`, and not
  `parse_optional`. Measured, `optional="true"` on a `group_tag` yields the **string** `"true"`
  rather than `True`. Truthy, so behaviourally invisible today, but it means `group_tag` bypasses
  the shared `parse_optional` entry point entirely and would silently do the wrong thing under
  `optional="False"` or any `is True` comparison. Found incidentally by the P2-2 check, which is
  the point of P2-2.

### P3-4 — `null` vs `[]` for an empty multi-select is still undecided

Question 5's second half. The surviving comment at `parameter_specification.yml:760` —
`# itd be coool if this was forced to empty list - probably breaks backward compat though...` —
is untouched and still accurate. Measured, both spellings are accepted everywhere in the model:
`{'parameter': None}` and `{'parameter': []}` both validate at `job_internal` and `job_runtime`,
before and after this PR. At runtime the two take different paths —
`ToolParameter.validate` (`basic.py:349-356`) short-circuits on `value in ["", None] and
self.optional` but not on `[]`, so `[]` actually runs the validators and passes only because
`no_options_validate` checks `is not None` (`parameter_validators.py:293-295`). Net effect: with
`optional="false" multiple="true"`, `null` is rejected and `[]` is accepted, which is a strange
distinction to expose to a client. Out of scope here, but this PR is the moment the distinction
starts to matter (it is now the only path on which the validator fires), so it is worth a
follow-up issue rather than another year as a YAML comment.

### P3-5 — Style

Nothing to flag. No new imports at either layer, so no function-local import question arises. The
lib diff is a two-line reorder with no dead code left behind. Commit messages are descriptive and
accurate ("Treat multiple selects as optional by default in the tool parameter model" / "Cover
multiple selects with a no_options validator") — considerably better than the PR body, which is
the one artifact reviewers and future archaeologists actually read.

---

## Verification

There is no `.venv` in this worktree, and per instruction I did not bootstrap one. Instead I
borrowed `~/projects/worktrees/galaxy/branch/tool_parsing_abstraction/.venv` with `PYTHONPATH`
pointed at *this* worktree's `lib` and `test`. Confirmed the borrow resolves correctly before
relying on it — `galaxy_directory()` returns `/Users/jxc755/projects/worktrees/galaxy/pr/23351`
and `galaxy.tool_util.parameters.__file__` resolves under this worktree's `lib`. No venv was
written to. Suites were run one at a time, never in parallel.

**Ran (by execution):**

- `pytest test/unit/tool_util/test_parameter_specification.py` → **8 passed** in 3.25s.
- **Red-to-green confirmed.** Reverse-applied the lib commit
  (`git show 7db3dcf713 -- lib/... | git apply -R`) and re-ran → **1 failed, 7 passed**. The only
  failure is the new `gx_select_multiple_no_options_validation` block on
  `job_internal_valid: {'parameter': None}`, with `No options available for selection`. Every
  pre-existing `gx_select_multiple` case passed both ways — that is the measurement behind P2-3.
  Restored; `git status --porcelain` clean afterwards.
- `pytest test/unit/tool_util/test_parameter_specification_json_schema.py test_input_models.py
  test_parameter_test_cases.py test_parameter_convert.py` → **45 passed**, 2 unrelated
  `PytestCollectionWarning`s from `case.py` dataclasses. No JSON-schema snapshot drift.
- **Full state matrix, patched vs reverted** — the measurement behind the "Exactly what changes"
  section. Both affected tools x 9 state representations (`request`, `request_internal`,
  `landing_request`, `job_internal`, `job_runtime`, `workflow_step`, `workflow_step_linked`,
  `test_case_xml`, `test_case_json`) x 4 value shapes (`null`, absent, `["--ex1"]`, `[]`) = 72
  cells, dumped to JSON both ways and diffed. Result: for `gx_select_multiple` exactly two cells
  move (`test_case_xml::null`, `test_case_json::null`) plus the `optional` field; for
  `gx_select_multiple_no_options_validation`, `null` moves in all nine states and `validators`
  goes `['no_options'] -> []`. Nothing else in the matrix changes.
- **Runtime coverage census** — `grep -rn` over `lib/` and `test/` for each member of the
  `*_no_options_validation` family, confirming the new tool appears only in its own XML and
  `parameter_specification.yml:824`, while both siblings have `test_tool_execute.py` tests at
  `:730`, `:740` and `:771`. Also read the `tool_input_format` fixture
  (`lib/galaxy_test/api/conftest.py:154-156`) and `when.any` (`populators.py:4757-4759`) to
  confirm the `request` parametrization drives the model-validated path.
- **Model-vs-runtime `optional` matrix** (P2-1 table): built each parameter both ways from
  identical XML and compared. Found the `genomebuild multiple`, `drill_down optional` and
  `group_tag` string/bool results reported above.
- **Blast radius, both directions** (P2 "measured, not inferred" block): built models for
  `wc_gnu.xml::options` and `ngs_simulation.xml::{polymorphism,detection_thresh}` and ran
  `validate_internal_job` / `validate_job_runtime` against `None`, `[]` and a valid list, with the
  patch applied and reverted.
- **Corpus scan** for the behavioural blast radius: parsed all 798 XML files under
  `test/functional/tools/`, `tools/`, `lib/galaxy/tools/` and `config/`. **81** `multiple="true"`
  selects carry no explicit `optional`; of those, **4** also carry a `no_options` validator — the
  new test fixture plus `wc_gnu` and `ngs_simulation`'s two params (each duplicated between
  `tools/` and `lib/galaxy/tools/bundled/`).
- `git log -L 995,995:lib/galaxy/tools/parameters/basic.py` for the 2013→2015 history table, and
  `git log -L 258,268:...factory.py` to date the `if not optional` validator gate to
  `2e4a50a38c` ("Tool Request API...").
- `gh pr checks 23351` — one failure, `Integration / Test (3.10, 0)`. Pulled the log: five
  `test/integration/objectstore/test_tee_streaming.py::TestCloudTeeStreamingIntegration` failures
  plus a 60s job-state `TimeoutAssertionError`, and a `digest-mismatch` in setup. Nothing touching
  selects or parameter models. Unrelated.
- `gh api .../pulls/23351/comments` for the mvdbeek → guerler exchange on the superseded
  `convert.py` approach.

**Verified by reading, not execution:**

- The `expand_incoming` (legacy) vs `expand_incoming_async` (tool-request) split that scopes the
  severity — `lib/galaxy/tools/__init__.py:2282-2340` vs `:2343-2377`. I traced the call sites but
  did not drive a tool execution through either.
- The other model-layer consumers (`landing.py:107`, `services/jobs.py:257`, `evaluation.py:1101`,
  `workflow/modules.py:2404`, `managers/jobs.py:2247`, `services/base.py:206`) — enumerated by
  grep and read, not exercised.
- `SelectToolParameter.validate` / `ToolParameter.validate` short-circuit behaviour
  (`basic.py:349-356`, `:1252-1261`) underpinning P3-4.
- The XSD documentation quote (`galaxy.xsd:4490-4495`).

**Not verified:**

- Did not execute `test_tool_execute.py` itself (needs a running Galaxy server), so the claim
  that `test_select_multiple_does_not_select_first_by_default` passes on `dev` today is inferred
  from the state matrix — its `request`-format assertions exercise cells I measured as unchanged —
  rather than observed.
- Did not start a Galaxy server, so no API- or framework-level run of
  `gx_select_multiple_no_options_validation`, and no end-to-end confirmation that `wc_gnu` with
  nothing selected actually surfaces the error to a user through the tool-request API. The failure
  is reproduced at the model-validation level, which is where the change lives.
- Did not run the `test/unit/app/tools/` suites or `basic.py`'s doctests — they need a fuller app
  environment than the borrowed venv gives.
- Did not run mypy over the touched packages.
- Did not check whether any Tool Shed tool in the wild relies on the current (broken) strictness —
  only the in-tree corpus was scanned.

---

## Disposition (2026-08-25)

Review was **never posted**. The user merged 23351 on the strength of it (`8bd272a050`), then
asked for the leftovers as a branch.

**Landed on `jmchilton:parameter_model_optional_agreement`** — one commit `dc22d11a21`, based on
the 23351 merge, pushed, **no PR opened**. PR body drafted at [[23351_followup_pr_body]].

| finding | disposition |
|---|---|
| P2-1 `genomebuild multiple="true"` divergence | fixed — `factory.py` now `parse_optional(multiple)` |
| P2-2 `drill_down` drops `optional` | fixed — parsed in `factory.py`, honoured in `DrillDownParameterModel.py_type` and `request_requires_value`; new `gx_drill_down_exact_optional.xml` |
| P2-3 deleted `workflow_step` comment | restored |
| P2-4 no execution coverage for the new tool | fixed — rides the existing multi-select test; a `gx_genomebuild_multiple` execution test added too |
| `test_case_xml`/`test_case_json` null | added — the states 23351 actually flipped, previously unasserted |
| `request_valid` for the no_options tool | added — the one request surface where it isn't vacuous |
| `["hg18", hg19"]` YAML typo | fixed |

On the `drill_down` fix: `multiple` deliberately does **not** imply optional there, because
`DrillDownSelectToolParameter.__init__` calls `ToolParameter.__init__` rather than
`SelectToolParameter.__init__`. Copying the select rule would have been wrong. Nothing in the
tree sets `drill_down optional="true"`, so that half cannot regress an existing tool.

**Dropped at the user's direction, not missed:** the cross-layer model-vs-runtime agreement test
(P2-1/P2-2's recommended durable guard). It was written and pushed as `1d9d05e4c3`, then
force-removed from the remote. It survives in the worktree reflog. Consequence to keep in mind:
the seam is still unguarded — `factory.py` has eleven independent `parse_optional()` sites,
`basic.py` derives `optional` per type, and `parameter_specification.yml` structurally cannot
compare them because it only ever builds the model. Both divergences above were found by reading.

**Not run locally, at the user's direction** — deferred to CI. Only pre-commit
(black/ruff/flake8/prettier) has passed. Note that a fork branch with no PR will not trigger
galaxyproject's `pull_request`-gated workflows, so that verification is still pending.
