# 23283 — [26.1] Generate parameter models for upload_dataset and file inputs

- PR: https://github.com/galaxyproject/galaxy/pull/23283
- Author: guerler · base `release_26.1` · head `91d710798d` · open
- Diff is tiny: 4 files, +30/-3.
- CI: two Test shards red, both `##[error]The process '/usr/bin/sudo' failed` — infrastructure,
  not this change.

## Where the thread stood

Prior round (2026-08-11, an issue comment, so it pre-dates this tracking directory):

> Those things don't validate in those ways - files does not act as a DataParameter model for
> validation purposes at all. It is like at best a marker that indicates we should process
> multi-part file data right? [...] Maybe the right thing to do is just to in those conditionals
> for data_fetch and upload1 just assert the tool_id is `__DATA_FETCH__` and upload1 respectively
> in the factory layer and let it be a no-op layer for them. Return a No-op of somekind?

guerler, 2026-08-12:

> Ok, I reworked it, upload_dataset is now a no-op, limited to `__DATA_FETCH__` and upload1. Since
> file/ftpfile only appear inside it, I dropped those branches. upload1 also has a dynamic
> value_from conditional (files_metadata) that can't be modeled statically, so I skip those as well.

The first clause of that reply is what got fixed. The second and third don't match the code.

## What actually landed

`lib/galaxy/tool_util/parameters/factory.py`, inside `input_models_for_page`:

```python
if input_type == "upload_dataset":
    continue
if input_type == "conditional" and input_source.get("value_from"):
    continue
```

## P1-1 — "limited to `__DATA_FETCH__` and upload1" is not implemented

Neither skip is limited to anything. `input_models_for_page(page_source, profile)` has no tool id
in scope, so it *can't* be. The requested assert is absent from the diff.

It is feasible one frame up: `input_models_for_tool_source(tool_source)` (factory.py:496) holds the
`ToolSource`, which exposes `parse_id()`. That is where the guardrail belongs.

In practice the blast radius is currently small — `upload_dataset` appears in exactly two in-tree
XMLs (`lib/galaxy/tools/data_fetch.xml`, `tools/data_source/upload.xml`) — but `galaxy.xsd:3793`
declares the element generally, so nothing stops a third-party tool from silently losing inputs.

## P1-2 — the value_from skip is broader than the reply describes, and uncommented

Described as upload1's `files_metadata`; written as *every* `value_from` conditional in *every*
tool. In-tree there is exactly one such conditional — `tools/data_source/upload.xml:63` — so today
it happens to mean the same thing. (`grep value_from` also hits
`tools/expression_tools/parse_values_from_file.xml`, but that's the tool *id*
`param_value_from_file`, not an attribute.) Unpinned and with no comment saying why, this reads as
a general rule about dynamic conditionals rather than a workaround for one legacy tool.

Not a bug: `get(key, default)` is on the `InputSource` ABC (`parser/interface.py:519`), so YAML and
CWL sources handle it fine.

## P1-3 — this is a partial model, not a no-op, and that is the difference that bites

The ask was a no-op *layer* for these two tools. What landed drops the offending inputs and keeps
the rest, so `tool.parameters` flips from `None` to a model that describes the tool incompletely.

That flip matters because `None` is a well-guarded state and a partial model is not.
`Tool.parse_inputs` (tools/__init__.py:1699-1704) already swallows generation failure:

```python
try:
    parameters = input_models_for_pages(pages, self.profile)
    self.parameters = parameters
except Exception:
    log.warning("Failed to generate parameter models for tool '%s'", self.id, exc_info=True)
```

so `self.parameters is None` was how upload1 and `__DATA_FETCH__` used to present themselves, and
every consumer branches on it: `expand_incoming_async` raises "has no parameters defined" (2153),
`tool_dict["has_parameters"]` (3020), `parse_tool_test_descriptions` (1600), and `landing.py`.

And the omission is not benign, because the generated state models forbid extras —
`create_model_strict` sets `ConfigDict(extra="forbid")`
(`tool_util_models/parameters.py:2606-2610`, used at 2656). A bundle without `files` does not
*ignore* a `files` key, it *rejects* it. Which is the opposite of a no-op.

## P1-4 — the landing.py commit proves P1-3, and only covers half of it

The second commit ("Fix landing page manager") exists because `__DATA_FETCH__` flipped to non-None
and started getting strict-decoded:

```python
if tool.parameters is not None and tool.id != FETCH_TOOL_ID:
```

**upload1 got exactly the same flip and no exemption.** A tool landing request for upload1 now
takes the decode branch with a bundle missing `files` and `files_metadata`, both of which are
`extra="forbid"` violations. Whether any caller passes `tool_id="upload1"` here is worth asking
rather than asserting, but the asymmetry is unexplained either way.

Note also the `else` branch immediately re-narrows to the same tool via a bare `assert` — so the
condition is now spelled out twice, once positively and once as an assertion, both hard-coding
`FETCH_TOOL_ID`. That is roughly the assert that was asked for, just at the wrong layer: it landed
in the *consumer* instead of the factory, so every future consumer has to repeat it.

## P2-1 — the new tests lock in absence, not usability

```python
assert "files" not in names
assert "files_metadata" not in names
```

These pass by construction from the `continue`s — they restate the implementation. Nothing asserts
the resulting bundle can round-trip a real upload request, which is the property that actually
matters given `extra="forbid"`. A test that decodes a representative `__DATA_FETCH__` landing
payload through the bundle would have caught P1-4 before the second commit was needed.

## P2-2 — third near-copy of the same helper

`parameter_bundle_for_internal_tool` joins `parameter_bundle_for_framework_tool` and
`parameter_bundle_for_file` in `tool_util/unittest_utils/parameters.py`. All three are
`get_tool_source(path, macro_paths=[])` + `input_models_for_tool_source`, differing only in the
path root. One helper taking a root would do.

## Verdict

Direction is right and the actual original objection is resolved — the `file`/`ftpfile` branches
that tried to model upload markers as data parameters are gone. But the two things asked for
(assert the tool id; make it a no-op) both came back as something else: an unpinned unconditional
skip, and a partial-but-strict model. P1-4 is the concrete evidence that the partial model is a
landmine rather than a theoretical concern.

## Confirmed empirically

Ran both bundles against a borrowed venv (`branch/extract_next/.venv`, `PYTHONPATH=lib`). Both
tools now produce a non-None bundle:

```
tools/data_source/upload.xml   -> ['file_type', 'file_count', 'force_composite', 'dbkey', 'tags']
lib/galaxy/tools/data_fetch.xml -> ['request_version', 'request_json', 'file_count']
```

Both then **reject their own requests** through that bundle:

```
upload1        files -> "Extra inputs are not permitted" [extra_forbidden]
__DATA_FETCH__ request_json -> "Input should be a valid string" [string_type]
```

The `__DATA_FETCH__` failure is worse than P1-3 predicted and is *not* about the skipped inputs:
`request_json` is declared `type="text"` in `data_fetch.xml`, so it models as `gx_text`, while the
API stores an object. The generated model is wrong about a parameter it **kept**. That makes
guerler's landing.py exemption load-bearing rather than defensive — and confirms upload1's missing
exemption is a real gap, not a hypothetical one.

## Postscript — what the issue actually asks for

#23258 is a startup log warning, nothing more: `Failed to generate parameter models for tool
'__DATA_FETCH__'` plus a traceback. No consumer wants these tools to *have* a model. That reframes
the whole PR: the cheap correct fix is to make "no model" explicit and quiet, not to synthesise one.

Counter-proposal implemented on branch `23283_unmodelable_tool_inputs` (commit `80fae90377`, on top
of guerler's head), opened as guerler/galaxy#35:

- `factory.py` raises a typed `UnmodelableToolInputs` where guerler skips. `upload_dataset` already
  raised a plain `Exception` on this path before the PR, so every other factory caller sees exactly
  what it saw — only the log level changes, which is the reported bug.
- `Tool.parse_inputs` catches it and logs at debug; `self.parameters` stays `None`, so all four
  consumers keep the guarded path they already have.
- `landing.py` reverts to its pre-PR form; the `__DATA_FETCH__` exemption is no longer needed. The
  pre-existing `assert tool.id == FETCH_TOOL_ID` in the `else` branch is untouched.
- Tests replaced: the two absence assertions become `pytest.raises(UnmodelableToolInputs)` for both
  tools.

Red-to-green verified: restoring the `continue`s (keeping the exception class) fails both
parametrized cases. 48 tests pass across `test_parameter_specification.py`,
`test_parameter_convert.py`, `test_parameter_test_cases.py`. black/isort/ruff/flake8 clean.

## Not verified

- Whether any caller actually reaches `create_tool_landing_request` with `tool_id="upload1"`.
- Whether upload1/`__DATA_FETCH__` reach `expand_incoming_async` today.
- Integration tests not run (no `.venv` in the worktree; unit tests used a borrowed one).

---

## Approved 2026-08-21 at `8179074875`

guerler merged guerler/galaxy#35 (`70d2e952e8`) and pushed one follow-up, `8179074875 "Adjust
comment"`. `git diff 80fae90377 <pr-head>` is that single hunk — the counter-proposal landed
verbatim otherwise.

Verified before approving:

- Both upload tools decline rather than model partially. Against the borrowed venv,
  `input_models_for_tool_source` raises `UnmodelableToolInputs` for `tools/data_source/upload.xml`
  **and** `lib/galaxy/tools/data_fetch.xml`, so `tool.parameters` stays `None` for both. P1-1
  through P1-4 are all closed by construction: no partial model, so no strict-decode landmine, so
  no `FETCH_TOOL_ID` exemption and no upload1 asymmetry.
- 48 pass across `test_parameter_specification.py`, `test_parameter_convert.py`,
  `test_parameter_test_cases.py` at the PR head.
- Red CI is unrelated: one run died in setup (`sudo` exit 1), the other is Selenium
  (`test_histories_published` sort/tag/advanced-search, `test_standalone_page_revision_diff`).

### Nit raised in the approval

The comment guerler substituted is factually wrong:

```python
# Only __DATA_FETCH__ lacks a typed parameter schema; everything else decodes through it.
```

upload1 lacks one too — it takes the same `upload_dataset` path. That is *why* the exemption could
be deleted instead of gaining a second tool id, so the comment inverts the reason it is there.
Non-blocking, comment-only.

### Still not verified

P2-2 (the third near-copy of the bundle helper in `unittest_utils/parameters.py`) was never raised
with the author and is unchanged. The three "Not verified" items above still stand — no integration
tests run.
