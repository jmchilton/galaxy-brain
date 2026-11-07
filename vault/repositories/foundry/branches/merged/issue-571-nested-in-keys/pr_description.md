States two gxformat2 wiring rules agents had been inferring. One run hit 96 topology errors on the second.

Closes #571.

## The two rules

Sketch, not a runnable workflow:

```yaml
steps:
  - id: fastp_1
    label: trim
  - id: merge
    in:
      - id: input_type|i       # parameter in a conditional or section: |-joined path
        source: trim/out1      # list form: the step part is the label, not fastp_1
      - id: pick_from_0|value  # repeat instance: _N
        source: trim/out2
    state:
      pick_from:
        - {}                   # _0 needs this entry, or the connection does nothing
```

## What changed

**`gxformat2-schema` (rev 5)**

- States the nested key, `_N` and repeat entry rules. Without the entry the job can still succeed. All 917 repeat-instance connections in IWC at `980fc00` have one.
- A connection's step part is the `label` when one is present, otherwise the `id`, in list form. In map form, for a step with no `label`, it is the map key.

**`implement-galaxy-tool-step` (rev 13)**

- Step 3 states the nested key rule directly. A domain-review scan, whose script I read but didn't rerun, found a `|` key on 1,157 of 3,258 IWC tool steps, so it shouldn't depend on loading a note.
- `[[gxformat2-schema]]` becomes an on-demand reference, for connection step names and dataset `rename:`. Step 5 already cited the note, which wasn't in the cast.
- A new eval property checks the repeat entry, which `draft-validate` doesn't catch.

**Generated:** casts and the Dashboard. About 4,000 diff lines are the note and its vendored `gxformat2.schema.json`, because companions travel with their note. `SKILL.md` gains two lines, and the files cost context only if opened. `repair`'s bundle also takes the new note text, through its reference from #753.

## For John

- **File the gxformat2 issue?** The draft says to check a live Galaxy import first.
- **Change the `galaxy-workflow-draft-format` worked example?** It has the map-form shape below, and this PR leaves it alone.

## Left out

- **A map-form step whose `label` differs from its key:** no reference to it passes both validation and conversion. That looks like a gxformat2 bug, so the note gives no guidance on it.
- **"Labels must not contain `/`", from #571's comment:** `gxwf draft-validate` 1.15.0 accepts a list-form reference to such a label. Conversion wasn't checked.
- **Eval properties for nested keys and step names:** a reviewer reports `--concrete` already rejects wrong keys, which I didn't rerun. A step-name property should wait for the resolvers to agree.
- **Dropping the reference or using a small stub note, suggested in domain review:** step 5 cites the note, and a stub saves only disk.

## Evidence

`gxwf` 1.15.0 `draft-validate`, and gxformat2 `validate_draft` and `python_to_workflow` on 0.28.0 and 0.29.1 (the versions agree):

| Form | Step carries | Reference | `gxwf` and `validate_draft` | `python_to_workflow` |
|---|---|---|---|---|
| List | `id`, `label` | label | resolves | converts |
| List | `id`, `label` | id | `references unknown step` | `ValueError` |
| List | `id` | id | resolves | converts |
| Map | nothing else | key | resolves | converts |
| Map | `id` | key | resolves | converts |
| Map | `id`, `label` | id | `references unknown step` | `ValueError` |
| Map | `label`, or `id` and `label` | key | **resolves** | **`ValueError`** |
| Map | `label`, or `id` and `label` | label | **`references unknown step`** | **converts** |

The bold rows are the disagreement.

**Didn't run**

- No import into a live Galaxy. `python_to_workflow` is the function Galaxy's import calls, but these results come from calling it directly.
- The new eval property hasn't been run against a Mold run.

**CI at `3b9f559f`:** `test` and `changeset` pass.

**`make -k check`:** everything passes (496 tests) except `check-vendored`, a known failure on this machine.

## Collisions

- **#755:** both regenerate three `_provenance.json` files, so whichever lands second needs a recast.
- **#678:** any later edit to `implement` conflicts only in frontmatter.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
