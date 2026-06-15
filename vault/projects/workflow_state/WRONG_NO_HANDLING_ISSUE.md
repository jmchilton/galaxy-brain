# gxwf (Python): unquoted YAML-1.1 reserved words in format2 tool_state corrupt string values (`use_guide: no` → bool `False`)

> Handoff doc for a Galaxy/Python `gxwf` agent. Prepared by Claude (AI assistant) on jmchilton's behalf, 2026-06-08. Self-contained: repro, tested evidence, root cause, code pointers, fix, tests.

## TL;DR

Python `gxwf` reads format2 (`.gxwf.yml`) with a **YAML 1.1** loader (PyYAML `SafeLoader`). YAML 1.1 coerces the plain scalars `no`/`yes`/`on`/`off`/`y`/`n` (and case variants) to **booleans**. Galaxy tool_state select/boolean params store these as **strings** (e.g. StringTie's `guide.use_guide = "no"`). When such a value is written unquoted in format2 (`use_guide: no`), Python loads it back as Python `False`, which then fails the tool's conditional discriminator. The TypeScript `gxwf` reads the same file with **YAML 1.2** and gets the correct string `"no"`, so this is a **Python-side** correctness/data-integrity bug. It affects every Python format2 read path — `validate`, `convert`, `clean`, `roundtrip`, lint — not just validate.

There is also a **contributing emitter bug**: Python's format2 writer (ruamel `YAML()` path) emits the string `"no"` unquoted, so it produces files that its own reader then misreads.

## Reproduction

Workflow: IWC `transcriptomics/brew3r/BREW3R`, step `assembl with StringTie` (`toolshed.g2.bx.psu.edu/repos/iuc/stringtie/stringtie/2.2.3+galaxy0`). Its tool_state conditional:

```yaml
guide:
  use_guide: no        # <-- intended string "no", select option / __current_case__: 0
```

Native `.ga` source stores it correctly as a string:

```json
"guide": {"use_guide": "no", "__current_case__": 0}
```

Run Python validate on the format2 file:

```
$ gxwf validate BREW3R.gxwf.yml
Step 2: .../stringtie/2.2.3+galaxy0 ... FAIL
  1 validation error for DynamicModelForTool
  guide
    Input tag 'false' found using model_x_discriminator() does not match any of
    the expected tags: 'no', '__absent__', 'yes' [type=union_tag_invalid, ...]
    input_value={'use_guide': False}
```

The discriminator expects `'no'` and receives boolean `False`. TypeScript `gxwf validate` on the **same file** does not report this — it reads `"no"` as a string and the branch matches.

## Tested evidence (root cause)

YAML 1.1 vs 1.2 read behavior:

```python
import yaml
yaml.safe_load("use_guide: no")["use_guide"]   # -> False   (PyYAML = YAML 1.1)
yaml.safe_load("use_guide: yes")["use_guide"]  # -> True
yaml.safe_load("use_guide: off")["use_guide"]  # -> False

from ruamel.yaml import YAML
y = YAML(typ="safe", pure=True); y.version = (1, 2)
y.load("use_guide: no")["use_guide"]            # -> 'no'    (YAML 1.2, correct)
```

Emitter behavior (same string `"no"`):

```python
import yaml
yaml.safe_dump({"use_guide": "no"})            # -> "use_guide: 'no'\n"   (PyYAML quotes — safe)

from ruamel.yaml import YAML; import io
y = YAML(); s = io.StringIO(); y.dump({"use_guide": "no"}, s)
s.getvalue()                                    # -> "use_guide: no\n"     (ruamel does NOT quote — unsafe)
```

So: the **reader** corrupts on load (1.1), and the **ruamel writer path** produces unquoted output that even a 1.2 reader survives but a 1.1 reader does not.

## Why this is broader than one field

YAML 1.1 implicit booleans cover: `y|Y|n|N|yes|Yes|YES|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF` (plus `~`/`null`, and numeric-looking scalars are a separate axis — see "Out of scope"). Any Galaxy select/boolean param whose **string** option value is one of these is corrupted on read. `use_guide` is just the first one this surfaced on (StringTie suite, widely used in IWC). Because `load_workflow` is shared by all commands, a `convert` or `roundtrip` of an affected file silently rewrites `"no"` → `False`/`"false"`, i.e. it corrupts the workflow, not just a validation report.

## Code pointers (galaxy fork: `worktrees/galaxy/branch/wf_tool_state`)

Read side (the primary bug):

- `lib/galaxy/tool_util/workflow_state/workflow_tools.py:10-22` — `load_workflow()` uses `galaxy.util.yaml_util.ordered_load` (PyYAML `SafeLoader`, YAML 1.1), falling back to `yaml.safe_load`. Used by `validate.py:182`, `convert`, `clean.py`, `roundtrip.py`, `cache.py`.
- `gxformat2/yaml.py` `ordered_load` — `Loader=yaml.SafeLoader` (YAML 1.1). Used by `workflow_tree.py:70,127` (tree commands). This lives in the **gxformat2** package (worktree: `worktrees/gxformat2/branch/abstraction_applications`); a fix may need to span gxformat2 + galaxy.
- `galaxy.util.yaml_util.ordered_load` — confirm its resolver; it is also PyYAML-based and should be addressed or bypassed for format2 reads.

Write side (contributing):

- `lib/galaxy/tool_util/workflow_state/export_format2.py:260-272` — `format_yaml()` uses ruamel `YAML()` (does **not** quote reserved-word strings), with a PyYAML `dump` fallback (which **does** quote). The default ruamel path produces unsafe output.

## Recommended fix

**1. Read side (primary, robust).** Read format2 with YAML 1.2 semantics so `no`/`yes`/`on`/`off`/`y`/`n` plain scalars decode as strings. Two options:

- Switch the format2 loaders to a YAML 1.2 core-schema loader (e.g. ruamel `YAML(typ="safe", pure=True)` with `version=(1,2)`), or
- Keep PyYAML but install a custom resolver that removes the bool implicit-resolver entries for the `y/n/yes/no/on/off` forms (retain only `true`/`false`), and likewise leave numeric/null resolution as-is.

This is the robust fix because it also corrects **existing** corpus files (the IWC format2 corpus, produced by the TS converter, already contains unquoted `no`). An emitter-only fix would not.

Caveat to verify: confirm nothing in the workflow_state / tool_state models relies on `yes`/`no`/`on`/`off` decoding to bool. Galaxy tool_state booleans are normally stored as real bools and emitted as `true`/`false` (still booleans under YAML 1.2), while `yes/no/on/off` appear only as select-option **string** values — so YAML 1.2 should be correct for this domain. Validate against the `parameter_specification` corpus and the IWC sweep.

**2. Write side (defense-in-depth).** Make `export_format2.format_yaml` quote string scalars that any YAML 1.1 reader would misinterpret (booleans, null, numerics). Either configure the ruamel dumper to do so or route through a representer that quotes such strings. Prevents Python from emitting files that its own (or any 1.1) reader corrupts.

Do both: 1.2 read fixes correctness everywhere; safe-quote write keeps output portable to any consumer.

## Suggested tests (red → green)

- Unit: loading `use_guide: no` (and `yes`/`on`/`off`) from a format2 string yields the **string**, not a bool. Red on current loader.
- Unit: `format_yaml({"x": "no"})` round-trips through the format2 reader back to `"no"`. Red on current ruamel path.
- Integration: `gxwf validate` on `transcriptomics/brew3r/BREW3R.gxwf.yml` no longer fails the `guide` discriminator. (Cross-check the TS sweep, which already passes this file.)
- Integration: `gxwf convert`/`roundtrip` on the same file preserves `use_guide: "no"` (no `False`/`"false"` in output).
- Add an upstream `parameter_specification.yml` row (then re-sync to TS) for a select param whose option value is a YAML-1.1 reserved word, asserting it stays a string.

## Out of scope (do not conflate)

- **Stringified numerics** (`fraction: "0.01"` on `gx_float`) are a **separate** axis — native string-encoding vs decoded format2. That is tracked on the TS side (galaxy-tool-util-ts #111: route verbatim-native `tool_state` blocks to `workflow_step_native` validation; and/or make `convert` schema-aware so numerics decode to real numbers). The Python reference already branches native-vs-format2 in `validation_format2.py:86-91 (validate_step_against)` and decodes numerics on schema-aware convert. The `no`-handling bug here is purely about YAML scalar interpretation of **string** values; keep the two fixes independent.

## Cross-impl note

This is the inverse of the TS situation: on this BREW3R file, **Python** catches the `use_guide` corruption (because YAML 1.1 produced a bool that fails the discriminator) while **TS** passes (YAML 1.2 string). The correct end state is that the value is the string `"no"` everywhere — which means Python should stop coercing on read (and stop emitting unquoted on write), converging with the TS reader.
