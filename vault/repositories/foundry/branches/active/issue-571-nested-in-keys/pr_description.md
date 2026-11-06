Agents had been inferring two things about gxformat2 wiring, and one run hit 96 topology errors on the second:

- how a step's `in:` key addresses a nested parameter
- what the step part of a `source` or `outputSource` names

## What changed

**`gxformat2-schema` (rev 5)**

- `in:` keys use a `|`-joined path for a parameter nested in a conditional or section, and `_N` for a repeat instance.
- Each `_N` connection needs its own entry in the repeat in `state`. Without it the connection does nothing and the job can still succeed. All 917 repeat-instance connections in IWC at `980fc00` have one.
- A connection's step part is the `label` when one is present, otherwise the `id`, in list form. In map form, for a step with no `label`, it is the map key.

**`implement-galaxy-tool-step` (rev 13)**

- Step 3 states the nested key rule. IWC uses a nested connection key on about a third of its tool steps, so it shouldn't depend on loading a note.
- `[[gxformat2-schema]]` is now an on-demand reference, for connection step names and dataset `rename:`. Step 5 already cited the note, but the note wasn't in the cast.
- A new eval property checks the repeat entry, which `draft-validate` doesn't catch.

Casts and the Dashboard are regenerated. About 4,000 of the diff's lines are the note and its vendored `gxformat2.schema.json`, copied into this Mold's bundle because companions travel with their note. At runtime `SKILL.md` gains two lines, and the files cost context only if opened.

## What this leaves out

The note says nothing about a map-form step whose `label` differs from its key, because the tools disagree and no reference to such a step passes both. That looks like a gxformat2 bug and should be fixed there, so it isn't documented here as guidance. The worked example in `galaxy-workflow-draft-format` has this shape, and this PR doesn't change it.

It also leaves out the rule #571's comment suggests, that labels must not contain `/`. `gxwf draft-validate` 1.15.0 accepts a list-form reference to a label containing `/`, so that check gives no reason for the rule. Conversion wasn't checked for this case.

## Reproductions

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

The two bold rows are the disagreement.

## What didn't run

- No import into a live Galaxy. `python_to_workflow` is the function Galaxy's import calls, but the conversion results come from calling it directly.
- No CI yet. It starts when this PR opens.
- The new eval property hasn't been run against a Mold run.

## Local gate

`make -k check`: everything passes (496 tests) except two targets:

- `check-vendored`, a known failure on this machine.
- `validate-roadmap`, which reads live GitHub labels and fails the same way on clean `main`.

Closes #571.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
