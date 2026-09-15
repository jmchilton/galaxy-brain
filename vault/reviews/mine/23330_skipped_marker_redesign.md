# 23330 — hardening the "skipped output" marker

Research note for [PR #23330](https://github.com/galaxyproject/galaxy/pull/23330)
(`pja_guard_mapped_over_skipped`), specifically mvdbeek's review comment:

> This seems right, but maybe we should harden the hack itself ? expression.json with `skipped`
> blurb could probably also be manufactured by a non-skipped job ? maybe something like a
> `Skipped Output` variant, or a skipped.expression.json or something more explicit ?

All line numbers are against `origin/dev` at `b22ea1b516` unless the file is one the PR touches,
in which case the PR-branch state is called out. Files verified byte-identical to `dev` before
citing: `workflow/modules.py`, `tools/__init__.py`, `schema/schema.py`, `workflow/run.py`,
`datatypes/text.py`, `model/store/__init__.py`, `tools/evaluation.py`,
`tools/parameters/wrapped_json.py`.

---

## 1. What the marker is today

### 1.1 The write side — one function, four callers

Everything that marks a dataset skipped goes through a single model method:

`lib/galaxy/model/__init__.py:5599` — `DatasetInstance.set_skipped()`

```
self.extension = "expression.json"     # :5609
self.state     = self.states.OK        # :5610
self.blurb     = "skipped"             # :5611
self.visible   = False                 # :5612
<file contents> = json.dumps(None)     # i.e. the four bytes "null"
self.peek      = "null"
```

So the on-disk artifact is an ordinary `expression.json` dataset containing `null`. The only thing
distinguishing it from a real expression-tool null is the `blurb` string and the invisibility.
Note `state` is deliberately set to `OK` — that is what lets the placeholder flow through the rest
of the stack unmolested (see §4.2; this is load-bearing).

Callers, all of them:

| site | context |
|---|---|
| `lib/galaxy/tools/actions/__init__.py:777` | conditional (`when: false`) tool step; the job is set to `Job.states.SKIPPED` at `:769` first |
| `lib/galaxy/tools/actions/model_operations.py:184` | same, for `DatabaseOperationTool`s; job state set at `:137` |
| `lib/galaxy/workflow/modules.py:2231` | `PickValueModule._create_skipped_output` — `first_or_skip` with no non-null input. **No `Job` row exists at all** |
| `lib/galaxy/tools/__init__.py:4885-4892` | `HarmonizeTwoCollectionsTool._create_null_dataset` — the null half of a harmonize when `input2` is absent. Runs inside a job whose state is **`OK`** |

Those last two are the reason a job-state-based detector is not sufficient (§4.3).

`Column("blurb", TrimmedString(255))` — `lib/galaxy/model/__init__.py:13142` (HDA) and `:13190`
(LDDA). Plain string column, no DB-level enum.

### 1.2 The read side — the full list

This is the list mvdbeek's concern is really about. It is shorter than it looks, because most
`expression.json` checks in the tree are *not* skip detection.

**True skip detectors (ext + blurb):**

- `lib/galaxy/workflow/modules.py:2107-2113` — `PickValueModule._is_null_or_skipped`. This is the
  **only** place in the entire tree that reads `blurb == "skipped"`. Verified by grepping `blurb`
  across `lib/galaxy/{workflow,tools,job_execution,managers,model,webapps,schema}` and
  `lib/galaxy_test/` — the only other hits are constructor/copy/serializer plumbing.
  Called from two places: `modules.py:2119` (`_pick_from_replacements`) and `modules.py:2308`
  (`_apply_post_job_actions`, the guard that stops PJAs running on a skipped `pick_value` output).
- On the PR branch this moves to `DatasetInstance.is_skipped`
  (`lib/galaxy/model/__init__.py`, new property just above `set_skipped`) and `_is_null_or_skipped`
  delegates to it, widening the isinstance test from `HistoryDatasetAssociation` to
  `DatasetInstance`.
- New on the PR branch: `DefaultJobAction.mapped_over_dataset_instances`
  (`lib/galaxy/job_execution/actions/post.py`, new staticmethod at the top of the class) filters
  `not instance.is_skipped`.

**Job-state detectors (a parallel, older mechanism):**

- `lib/galaxy/job_execution/actions/post.py:127-129` — `ChangeDatatypeAction.execute` bails when
  `job.state == job.states.SKIPPED`, with the comment *"Don't change datatype, must remain
  expression.json"*. This is the unmapped-over sibling of the bug #23330 fixes, and it is why the
  mapped-over path was the one that broke.
- `lib/galaxy/managers/jobs.py:722` — job caching: when `__when_value__` is `False`, only
  `Job.states.SKIPPED` jobs are cache candidates.
- `lib/galaxy/model/__init__.py:1836` — `Job.is_terminal` includes `SKIPPED`.
- `lib/galaxy/tools/actions/__init__.py:769`, `model_operations.py:137` — the writers.

**Content detectors (deliberately catch real nulls too, not skip detection):**

- `lib/galaxy/tools/__init__.py:4621-4628` — `FilterNullTool.element_is_valid`: `extension ==
  "expression.json"` and content starts `null` ⇒ filtered out. Intentionally does not care whether
  the null came from a skip or from a real expression tool.

**Extension-only checks — "is this a value rather than a file", NOT skip detection.** Listing them
because any redesign that changes the extension has to reckon with all of them:

- `lib/galaxy/workflow/modules.py:219` (`to_cwl`), `:3085` (parameter replacement — reads the JSON)
- `lib/galaxy/tools/parameters/wrapped_json.py:189` (`_hda_to_object`)
- `lib/galaxy/tools/evaluation.py:361` (`_eval_format_source`)
- `lib/galaxy/tools/__init__.py:3640` (`ExpressionTool.exec_after_process` extension selection)
- `lib/galaxy/tool_util/cwl/util.py:532`, `lib/galaxy/tool_util/cwl/representation.py:152`
- `lib/galaxy/tool_util/client/staging.py:164`, `:243`

**Tests that pin the current representation:**

- `lib/galaxy_test/api/test_workflows.py:3428-3429` (`test_pick_value_first_or_skip`-family) — asserts `extension == "expression.json"`
  **and** `misc_blurb == "skipped"`. The only test asserting the blurb.
- `lib/galaxy_test/api/test_workflows.py:4065`, `:10572` — assert the extension only.
- `lib/galaxy_test/workflow/pick_value_skip_pja.gxwf-tests.yml:14` and the three new
  `pick_value_mapped_*` files added by this PR — assert `ftype: expression.json`.

### 1.3 The marker's durability under mutation

| operation | extension survives? | blurb survives? |
|---|---|---|
| `HistoryDatasetAssociation.copy()` (`model/__init__.py:6247`) | yes | yes |
| `copy_from()` (`model/__init__.py:6221`) | yes (`:6231`) | yes (`:6229`) |
| model store export/import (`model/store/__init__.py:528`, `:571`) | yes | yes |
| `ChangeDatatypeAction` PJA | **no** | yes |
| user-driven datatype change via API ⇒ `set_metadata` ⇒ `Json.set_peek` (`datatypes/text.py:99-105`) | no | **no** (becomes `"JavaScript Object Notation (JSON)"`) |
| `misc_blurb` write via the datasets API | n/a | **not possible** — `misc_blurb` is in the HDA serializer (`managers/hdas.py:559`, `:621`) but *not* in `add_deserializers` (`managers/hdas.py:743-757`, which registers only `visible`, `genome_build`, `misc_info`) |

**This table is the finding that matters.** The extension is the half a post-job action can rewrite;
the blurb is the half that survives everything except a full metadata regeneration. The bug #23330
fixes is a *false negative* caused by the extension being mutable — not a false positive caused by
the blurb being guessable.

---

## 2. Is mvdbeek's collision real?

**Yes in mechanism, no in practice — and it points the wrong way.** Three separate questions:

### 2.1 Can an ordinary (non-expression) tool job produce ext `expression.json` + blurb `skipped`? **No.**

`blurb` is written by `datatype.set_peek()` during `JobWrapper._finish_dataset`
(`lib/galaxy/jobs/__init__.py:2059`). For an `expression.json` output that resolves to
`ExpressionJson` (`config/datatypes_conf.xml.sample:723` →
`galaxy.datatypes.text:ExpressionJson`), `ExpressionJson` defines no `set_peek`, so it inherits
`Json.set_peek` (`lib/galaxy/datatypes/text.py:99-105`), which writes the fixed string
`"JavaScript Object Notation (JSON)"`. A real expression tool emitting `null` gets that blurb, not
`"skipped"`. There is no tool-provided-metadata key for `blurb` either
(`TOOL_PROVIDED_JOB_METADATA_KEYS`), and no API deserializer for it (§1.3).

Grepping the whole tree for writes of the literal: `blurb = "skipped"` appears exactly once,
`lib/galaxy/model/__init__.py:5611`.

### 2.2 Can a job in state `OK` produce a dataset that `is_skipped` reports `True` for? **Yes — reachable in-tree.**

`ExpressionTool.exec_after_process` (`lib/galaxy/tools/__init__.py:3616-3650`) handles a `data`-typed
expression output whose expression returns `{"src": "hda", "id": ...}` — it resolves the referenced
*input* HDA and calls `output.copy_from(copy_object, ...)`. `copy_from`
(`lib/galaxy/model/__init__.py:6221`) copies `blurb` (`:6229`), `extension` (`:6231`), *and* rebinds
`self.dataset = other_hda.dataset` (`:6239`).

Ordering matters and works against us: `_finish_dataset` (and therefore `set_peek`) runs at
`lib/galaxy/jobs/__init__.py:2237`, `exec_after_process` at `:2313`. So the `copy_from` blurb wins.

Concretely reachable with an in-tree tool: `test/functional/tools/expression_pick_larger_file.xml`
(`tool_type="expression"`, `<output name="larger_file" type="data" from="output">`). Point it at a
skipped placeholder and a null second input; its job ends in state `OK`; its output comes out
`extension == "expression.json"`, `blurb == "skipped"`.

**But this is a true positive, not a false one.** The output is a byte-identical alias of a skipped
placeholder — it shares the very same `Dataset` row. Anything downstream *should* treat it as
skipped. This path is evidence that skippedness is a property of the *data*, not of the job, which
matters for §4.3.

### 2.3 Is there a genuine false positive anywhere? **One, and it is self-inflicted.**

`ModelStoreImporter` constructs HDAs straight from the archive's `datasets_attrs`, passing
`extension` and `blurb` through verbatim (`lib/galaxy/model/store/__init__.py:567-576` for the
create path, `:524-543` for the `allow_edit` path). A user who hand-edits a history export to say
`{"extension": "expression.json", "blurb": "skipped", ...}` over arbitrary content, then imports it,
gets an HDA that `is_skipped` calls `True` while holding real data. Feeding it to a `pick_value`
step would then silently discard it (`first_or_skip`) or fail the invocation
(`first_non_null`, `modules.py:2124-2131`).

Severity: low. It requires deliberate archive tampering, affects only the tamperer's own
invocation, and grants no access. Note that this same code path is why genuine skipped placeholders
survive export/import at all — the property is desirable in the normal case.

### 2.4 Verdict

mvdbeek's instinct is right that the marker is stringly-typed and under-specified, but the concrete
worry ("manufactured by a non-skipped job") is not the live risk. **The live risk is the opposite
one, and it is the bug this PR fixes:** the half of the marker that a post-job action can rewrite is
the extension, and any code that keys skip detection on the extension is one PJA away from a false
negative. Both of mvdbeek's suggestions — `Skipped Output`, `skipped.expression.json` — put the
marker *back into the extension*. Neither would have prevented this bug. That is the single most
useful thing to say back to him.

---

## 3. Survey of existing "this dataset is special" abstractions

| mechanism | fit | cost / breakage |
|---|---|---|
| `Dataset.state` (`schema/schema.py:85-103`, `model/__init__.py:4808`) | **Best fit.** Already carries `EMPTY`, `DISCARDED`, `DEFERRED`, `PAUSED` — i.e. "non-deleted dataset that is not a normal ok file". `Dataset.state` is `state: Mapped[str | None] = mapped_column(TrimmedString(64), index=True)` (`model/__init__.py:4757`), and the HDA/LDDA association-local `_state` columns are `Column("state", TrimmedString(64))` (`:13127`, `:13171`) — all plain strings, no DB enum, so **adding a value needs no DDL migration**. Immune to PJAs and to `change_datatype`. Travels through `copy()` (`model/__init__.py:6247`), `copy_from()` (shared `Dataset` row, `:6239`), and export/import (`model/store/__init__.py:672`). | Not free — see §4.2. Every consumer that today accepts skipped placeholders *because* they are `state == OK` has to be told about the new value. |
| `DatasetInstance.info` | Poor. `misc_info` **is** deserializable (`managers/hdas.py:753`), so any user can set it to anything. Strictly worse than `blurb`. |
| `DatasetInstance.blurb` (today) | It is a *display* string. `datatypes/binary.py` alone writes ~40 different blurbs; the field's contract is "human-readable one-liner", not "machine-readable flag". Works today only because exactly one reader exists. |
| `metadata` / `MetadataElement` | Poor. `ExpressionJson` already declares `json_type` (`datatypes/text.py:161-163`). Metadata is regenerated by `set_metadata` on datatype change, so the marker would be *more* strippable, not less. |
| `visible` / `deleted` / `purged` | `set_skipped` already sets `visible = False` (`model/__init__.py:5612`) but that is presentation, and `modules.py:3238-3240` hides whole-step-skipped outputs the same way. Not a discriminator. |
| `DatasetCollectionElement` | Doesn't reach the case. `PickValueModule._create_skipped_output` (`modules.py:2219`) returns a bare HDA with no collection around it, and `_apply_post_job_actions` (`modules.py:2302`) has to answer the question for that bare HDA. |
| a new datatype | see §4.4 |
| `Job.states.SKIPPED` | Already exists (`schema/schema.py:142`) and is the canonical *job*-level answer. Insufficient at the dataset level: two of the four `set_skipped` callers produce placeholders with no skipped job (§1.1), and §2.2 shows an `OK` job legitimately producing one. |

**Client-side prior art worth knowing:** `client/src/utils/datasetStates.ts:33` already declares
`SKIPPED: "skipped"` with the comment *"the job has been skipped"*, and `:56` already lists it in
`READY_STATES`. The API has never emitted it — `DatasetState` (`schema/schema.py:85`) has no
`SKIPPED`. So the client is half-prepared for a `skipped` dataset state already. The gap is
`client/src/components/History/Content/model/states.ts:60` (`STATES` map — no `skipped` entry, so
`ContentItem.vue:125` would render undefined) and
`client/src/api/datasets.ts:206` (`TERMINAL_DATASET_STATES`).

---

## 4. Options

### Option A — do nothing beyond this PR (baseline)

**What changes.** `DatasetInstance.is_skipped` becomes the one named predicate; `_is_null_or_skipped`
delegates to it; `DefaultJobAction.mapped_over_dataset_instances` gives element-iterating PJAs a
correct way to skip placeholders.

**Cost.** Zero beyond the PR. **Migration.** None — the representation is unchanged.
**Blast radius.** None.

**What it does not do.** The PR body says this itself: *"It is opt-in, so it does not by itself stop
a future action from repeating the mistake."* The extension stays load-bearing, so the next PJA (or
the next `execute_on_mapped_over` implementation that iterates elements) can strip the marker again.
`post.py` has six per-action `execute_on_mapped_over` overrides (`:111` `ChangeDatatypeAction`,
`:159` `RenameDatasetAction`, `:309` `HideDatasetAction`, `:333` `DeleteDatasetAction`, `:361`
`ColumnSetAction`, `:483` `TagDatasetAction`, plus the base at `:30` and the `ActionBox` dispatcher
at `:599`). This PR fixes the two that iterate dataset instances; the other four act on the
collection as a whole, so there is no *current* gap — but that is a property of today's actions,
not of the design.

**Honest assessment.** This is a correct, well-tested bug fix and is worth merging on its own. It
does not answer mvdbeek's question; it answers "is the current call site correct".

### Option B — `DatasetState.SKIPPED`, a real dataset state

**What changes.**

1. Add `SKIPPED = "skipped"` to `DatasetState` (`lib/galaxy/schema/schema.py:85`) and a `skipped`
   key to `ElementsStatesDict` (`schema/schema.py:111`).
2. `set_skipped` writes `self.state = self.states.SKIPPED` instead of `OK`
   (`model/__init__.py:5610`).
3. `is_skipped` becomes `self.state == Dataset.states.SKIPPED`, with a compatibility clause for one
   release: `or (self.extension == "expression.json" and self.blurb == "skipped")`.
4. Add `SKIPPED` to `Dataset.terminal_states` (`model/__init__.py:4816`). It falls into
   `ready_states` and `valid_input_states` automatically (both are set-differences,
   `model/__init__.py:4811-4814`). Leave it out of `no_data_states` — the placeholder does hold four
   bytes.
5. Teach the OK-acceptance sites (§4.2).
6. Client: a `skipped` entry in `states.ts:60` (`status: "info"`, `faForward` matching
   `useInvocationGraph.ts:73`), add to `TERMINAL_DATASET_STATES` in `api/datasets.ts:206`,
   regenerate `client/src/api/schema`.

**Migration.** No DDL — `state` is `TrimmedString(64)`. Existing skipped placeholders in production
histories keep `state = "ok"`, `blurb = "skipped"`, `extension = "expression.json"`, and are still
detected by the compat clause in (3). No backfill is strictly required. If you want one, it is a
single `UPDATE dataset SET state='skipped' WHERE ...` joined through HDA on
`extension='expression.json' AND blurb='skipped'` — but it is optional, which is the point: the
compat clause makes this a zero-downtime, zero-backfill change. Drop the clause a release later,
optionally with the backfill then.

**Blast radius — the real cost.** `set_skipped` sets `state = OK` today precisely so that
placeholders pass every "is this dataset usable" gate. Un-smuggling that forces each gate to
decide. Enumerated:

- `DatasetInstance.is_ok` (`model/__init__.py:5969`) — `state == OK`. Consumers that would flip
  behaviour for skipped placeholders:
  - `lib/galaxy/workflow/run.py:562` and `:578` — a skipped placeholder feeding a **non-data**
    (parameter) connection would start raising `FailWorkflowEvaluation(dataset_failed)`. Today it
    passes and is read as JSON `null` by `modules.py:3085`. **This one must be fixed or conditional
    workflows break.**
  - `lib/galaxy/tools/__init__.py:4512`, `:4575` — `FilterFailedDatasetsTool` /
    `KeepSuccessDatasetsTool.element_is_valid`. Today a skipped element survives `filter_failed`;
    under B it would be filtered out as failed. Arguably wrong either way — worth an explicit
    decision, since skip ≠ fail.
  - `lib/galaxy/tools/__init__.py:4593` — `KeepSuccessDatasetsTool`.
  - `lib/galaxy/managers/hdas.py:209`, `lib/galaxy/visualization/data_providers/genome.py:113` —
    not workflow paths, low risk.
- `DatabaseOperationTool.valid_input_states` (`tools/__init__.py:4038-4046`) returns `(OK,)` when
  `require_dataset_ok`, and `check_dataset_state` (`:4060-4068`) raises `ToolInputsNotOKException`
  for anything else. `require_dataset_ok = True` is the class default (`:4033`), so **most**
  collection-operation tools (`flatten`, `zip`, `merge`, `sort`, `relabel`, `filter_null`, …) would
  start hard-failing on any collection containing a skipped element. Two mechanical edits, but a
  missed one is a production workflow failure.
- `lib/galaxy_test/api/test_workflows.py:3428-3429` and the framework `ftype: expression.json`
  assertions keep passing (extension is unchanged); the state assertions are additive.

Call it ~10 edits, all greppable (`is_ok`, `states.OK`), each a deliberate semantic decision.

**What it buys.** The marker becomes non-strippable: no PJA can write `Dataset.state`, and
`change_datatype` (`datatypes/registry.py:669-678`) touches only `extension`, `size` and metadata.
The extension stops being load-bearing for skip detection entirely — you could let
`ChangeDatatypeAction` run on a skipped placeholder and nothing downstream would break, which is a
strictly stronger guarantee than the opt-in guard in Option A. Plus: skipped placeholders become
legible in the API and (if unhidden) in the UI, instead of masquerading as `ok`.

### Option C — `skipped.expression.json` datatype (mvdbeek's suggestion (b))

**What changes.** A `SkippedExpressionJson(ExpressionJson)` in `lib/galaxy/datatypes/text.py` with
`file_ext = "skipped.expression.json"`, a `<datatype>` line in `config/datatypes_conf.xml.sample`
(next to `:723`), `display_in_upload="false"`, and **no sniffer** (a sniffer would misclassify every
uploaded `null` JSON). `set_skipped` writes the new extension.

**Cost.** Substantially higher than B, and in the wrong direction:

- Every one of the eight extension-only sites in §1.2 (`modules.py:219`, `:3085`,
  `wrapped_json.py:189`, `evaluation.py:361`, `tools/__init__.py:3640`, `cwl/util.py:532`,
  `cwl/representation.py:152`, and `FilterNullTool` at `tools/__init__.py:4621`) currently does
  `extension == "expression.json"` and would silently stop matching skipped placeholders. Each has
  to become an `isinstance(dataset.datatype, ExpressionJson)` check or an explicit two-way `or`.
  Missing one means a skipped placeholder stops being readable as a JSON value — a new class of the
  exact bug we are trying to kill.
- The extension is public API (`file_ext` / `extension` in `HDADetailed`), so this is a
  user-observable change to every skipped output.
- It encodes a *workflow-scheduling* concept in the *datatype registry*, whose job is file formats.
  A skipped placeholder and a real expression null are the same bytes in the same format. That is
  the wrong axis.
- **It does not fix the bug.** `ChangeDatatypeAction` rewrites `extension`. A
  `skipped.expression.json` output is exactly as strippable as an `expression.json` one.

**Migration.** Existing rows carry `expression.json`; either a data migration rewriting extensions
(risky — you cannot distinguish a skipped placeholder from a real null without the blurb, so you'd
be migrating on the same fuzzy predicate) or a permanent compat `or` in every read site.

**Blast radius.** API extension string, framework tests asserting `ftype: expression.json` (four
files), datatype registry, plus the eight sites above. Nothing in `client/` keys off
`expression.json` specifically (grep: no hits), so the client is mostly spared.

### Option D — "Skipped Output" variant (mvdbeek's suggestion (a))

Ambiguous in the comment; three readings, all weaker than B:

- **(i) An HDA subclass.** Galaxy has no single-table-inheritance discriminator on
  `history_dataset_association`, and `DatasetInstance` subclassing is `HDA` vs `LDDA` at the table
  level. A new subclass means a new table or a new discriminator column — a real alembic migration
  for a boolean fact.
- **(ii) A marker on `DatasetCollectionElement`.** Doesn't cover the case that broke:
  `PickValueModule._create_skipped_output` (`modules.py:2219`) returns a bare HDA, and
  `_apply_post_job_actions` (`modules.py:2302`) asks the question of that bare HDA.
- **(iii) A `skipped` boolean column on `Dataset` (or on `DatasetInstance`).** This is the honest
  version of the idea and is genuinely close to Option B in effect — unambiguous, unstrippable,
  survives copies. It costs an alembic migration and, more importantly, adds a *second* axis
  parallel to `state`, so every consumer now has to check two things. Option B reuses the axis that
  already exists and already carries four other "not a normal ok file" values.

---

## 5. Recommendation

**Merge #23330 as-is (Option A), then do Option B as a follow-up.**

The argument:

1. #23330 is a correct fix for a live bug plus a genuine second defect (`ColumnSetAction` mutating
   `Base.metadata`). It should not be held hostage to a design discussion.
2. mvdbeek's stated worry — a non-skipped job manufacturing the marker — is **not reachable through
   ordinary tool execution** (§2.1). The only in-tree path (§2.2) produces a semantically correct
   skipped placeholder. So "make the marker harder to forge" is not the change that earns its keep.
3. The change that *does* earn its keep is "make the marker impossible to strip", because that is
   the failure that actually occurred and the PR's own guard is opt-in against it.
4. Both of mvdbeek's concrete suggestions put the marker back in the extension, which is exactly the
   mutable half. They would not have prevented this bug. Worth saying so explicitly in the PR
   thread — it is the most useful reply available.
5. `Dataset.state` is the axis Galaxy already uses for "this dataset is not a normal ok file"; it
   needs no DDL migration; the compat clause makes it a zero-backfill change; and the client already
   half-declares the value (`datasetStates.ts:33`).

**What would change my mind:**

- If the maintainers decide skipped placeholders **must** keep `is_ok == True` — that is a
  defensible position, since skip is not failure and a lot of machinery leans on it. Then Option B
  degrades into "add `or is_skipped` to ten call sites", the risk/benefit inverts, and Option A is
  the right stopping point.
- If `DatabaseOperationTool.check_dataset_state` turns out to have more consumers than the two edits
  I traced (`tools/__init__.py:4040`, `:4061`) — I verified those two statically but did not run the
  integration suite.
- If the collection-level state summary
  (`model/__init__.py:7653`, `:8266`, `dataset_states_and_extensions_summary`) turns out to surface a
  `skipped` element state as a scary collection-level badge. `HIERARCHICAL_COLLECTION_DATASET_STATES`
  (`client/.../states.ts:199`) is built from error + non-terminal states, so `skipped` would not
  enter the hierarchy — I believe this is fine, but I have not rendered it.
- If someone produces a real, non-tampered path to a **false positive** skipped marker. Then §2.4's
  framing is wrong and Option C/D become worth their cost.

---

## 6. Test plan (red-to-green)

Ordered by what to write first.

### 6.1 Pin the collision question itself (write before any redesign)

- **`test/unit/data/test_galaxy_mapping.py`** (or a new `test/unit/data/model/` module — the
  directory already exists) — unit test on `set_skipped` / `is_skipped`:
  - a fresh HDA + `set_skipped(...)` ⇒ `is_skipped` is `True`;
  - an HDA with `extension="expression.json"` and `blurb="JavaScript Object Notation (JSON)"` ⇒
    `False`;
  - `hda.copy()` of a skipped placeholder ⇒ still `True` (pins the copy path at
    `model/__init__.py:6245`).
  Red today only for the third if `copy()` regresses; the first two are characterization tests that
  become the regression net for Options B/C.
- **`lib/galaxy_test/api/test_workflows.py`** — extend the existing
  `test_pick_value_first_or_skip`-family test at `:3400-3429` (which already asserts
  `misc_blurb == "skipped"`) with a `state` assertion. Under Option B this is the headline red test:
  assert `output_details["state"] == "skipped"`, red on `dev` (`"ok"`), green after the `set_skipped`
  change.

### 6.2 Prove the ExpressionTool `copy_from` path (§2.2)

- **`test/unit/app/tools/test_expression_basics.py`** exists but is unit-level. The reachable
  integration is better placed in **`lib/galaxy_test/api/test_workflows.py`**: a workflow with a
  `when: false` branch feeding `expression_pick_larger_file`
  (`test/functional/tools/expression_pick_larger_file.xml`, already registered in the framework tool
  conf) and asserting the resulting HDA's `misc_blurb`/`state`. This is currently untested behaviour
  in either direction, so it is worth landing regardless of which option wins.

### 6.3 Guard against marker stripping (the actual bug class)

- **`lib/galaxy_test/workflow/`** — this PR already adds the right shape:
  `pick_value_mapped_skip_pja`, `pick_value_mapped_mixed_skip_pja`, `pick_value_mapped_set_columns`
  (`.gxwf.yml` + `.gxwf-tests.yml` pairs, run by
  `lib/galaxy_test/workflow/test_framework_workflows.py`). Under Option B, add a fourth that is red
  under Option A and green under B: a mapped-over `pick_value` with `change_datatype: txt` where the
  test asserts the skipped element is **still recognised as skipped by a downstream step** even
  though its `ftype` changed. Concretely — chain a second `pick_value` (`first_or_skip`) off the
  first and assert its output is a skipped placeholder. Under A (with the guard removed, or with any
  future action that mutates elements) the second pick sees a `txt` dataset and returns it as
  non-null; under B it is still skipped. That is the test that proves B buys something A does not.
- The framework-workflow harness supports `ftype:` and `metadata:` assertions on collection elements
  (see the three new `.gxwf-tests.yml` files); it does **not** appear to support asserting dataset
  `state` — confirm before designing the assertion, otherwise use a `test_workflows.py` API test
  instead. **(unverified — I read the yml files, not the assertion implementation.)**

### 6.4 Option B's fan-out regressions

Each of these is a new API/integration test, red before the corresponding `is_ok` edit:

- `lib/galaxy_test/api/test_workflows.py` — a `when: false` step whose skipped output feeds a
  **parameter** (non-data) connection of a downstream step, asserting the invocation still succeeds.
  Guards `workflow/run.py:562`/`:578`.
- `lib/galaxy_test/api/test_workflows.py` (or `test_dataset_collections.py`) — a collection
  containing a skipped element passed to `flatten_collection` / `filter_null`, asserting no
  `ToolInputsNotOKException`. Guards `tools/__init__.py:4040`/`:4061`.
- `lib/galaxy_test/api/test_workflows.py` — `filter_failed` over a collection with a skipped
  element, pinning whichever semantics the team chooses (§4.2). Guards `tools/__init__.py:4512`.
- `test/integration/` — history export/import round-trip of a skipped placeholder. There is existing
  model-store round-trip coverage under `test/unit/data/` and `lib/galaxy/model/unittest_utils/
  store_fixtures.py`; extend a fixture with a skipped dataset and assert `state`/`blurb` survive.

### 6.5 Client (Option B only)

- `client/src/components/History/Content/model/states.ts` has no dedicated spec, but
  `client/src/composables/useInvocationGraph.test.ts:94-97` shows the pattern for asserting a
  `skipped` state renders. Add a case asserting `getContentItemState` returns `"skipped"` for an
  HDA with `state: "skipped"` and that `STATES["skipped"]` is defined (red before the `STATES` entry
  is added).

---

## 7. Open questions

1. Should skipped placeholders keep `is_ok == True`? This is the whole ballgame for Option B.
2. Should `filter_failed` / `keep_success` treat a skipped element as passing? (Today: yes,
   incidentally. Is that intended?)
3. Is a `skipped` **dataset** state acceptable to the team, or is `Dataset.state` considered
   job-lifecycle-only? (`EMPTY`, `DISCARDED`, `DEFERRED` argue it isn't.)
4. Should `PickValueModule._create_skipped_output` (`modules.py:2219`) mint a `Job` in state
   `SKIPPED`, so every skipped placeholder has a creating job? Would unify with the job-level
   mechanism but is heavier than the module pattern.
5. Do we want skipped placeholders visible in the history UI (`set_skipped` sets `visible = False`,
   `model/__init__.py:5612`), or is the current invisibility deliberate UX?
6. Backfill existing production rows to `state='skipped'`, or rely on the compat clause forever?
7. Reply to mvdbeek in-thread with the §2.4 finding (both his suggestions key on the mutable half),
   or open a follow-up issue?
