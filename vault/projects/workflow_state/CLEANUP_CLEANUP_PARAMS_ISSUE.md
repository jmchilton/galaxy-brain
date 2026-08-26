# `gxwf clean --preserve/--strip` silently do nothing for 4 of 5 categories (and `--strip` does nothing at all)

> Handoff doc for a Galaxy/Python `gxwf` agent. Prepared by Claude (AI assistant) on jmchilton's behalf, 2026-07-16. Self-contained: repro, tested evidence, root cause, history, code pointers, fix options. The HTTP half of this is already fixed; the CLI half is outstanding.

## TL;DR

The `clean` path's per-category policy has **never worked**. `StaleKeyPolicy` is genuinely category-aware and works for `validate`/`export`, but the clean pipeline collapses the whole policy object to a **single boolean** (`strip_bookkeeping`) and hands it to a stripper that isn't category-aware at all.

Consequences for `gxwf clean`:

- **`--strip CATEGORY` is a total no-op.** `for_clean()` starts from "deny every category", so `--strip` can only re-deny an already-denied category.
- **`--preserve CATEGORY` is inert for 4 of its 5 categories.** Only `--preserve bookkeeping` changes any output.
- Both flags advertise a 5-value menu (`_cli_common.py:65`) where 4 values silently do nothing. No error, no warning — the flag is accepted and ignored.

**It was never reverted — it has always been wrong.** One commit (`19d23b7986`) claims in its message to have fixed exactly this and did not; see [History](#history-the-fix-that-wasnt). That commit message is the likely source of any memory that this once worked.

## Tested evidence

Run in the `wf_tool_state` worktree venv:

```python
from galaxy.tool_util.workflow_state.stale_keys import StaleKeyPolicy
from galaxy.tool_util.workflow_state.clean import _policy_to_strip_bookkeeping as f

# --strip is a no-op: identical denied sets
for_clean([],[])        -> denied = [bookkeeping, runtime-leak, stale-branch-data, stale-root-keys, unknown]
for_clean([],['unknown'])-> denied = [ ...identical... ]
for_clean([],['all'])   -> denied = [ ...identical... ]

# the policy collapses to one bool, so --preserve is inert except for bookkeeping
f(for_clean([], []))            -> True
f(for_clean(['unknown'], []))   -> True     # indistinguishable from default
f(for_clean(['bookkeeping'],[]))-> False    # the ONLY value that changes behavior
```

## Root cause

Two independent layers, either of which alone would break it.

**1. Policy level — `--strip` can't do anything.** `stale_keys.py:337-341`:

```python
@classmethod
def for_clean(cls, preserve: list[str], strip: list[str]) -> "StaleKeyPolicy":
    """Clean defaults: strip all categories including bookkeeping."""
    defaults = set(ALL_CATEGORIES)
    return cls._build(defaults, allow_args=preserve, deny_args=strip)
```

`_build` then does `denied = set(defaults)` (already ALL), `denied |= deny_cats` (no-op), `denied -= allow_cats`. Only `preserve` can move the needle.

**2. Execution level — the policy never reaches the stripper.** `clean.py:240-244` and `:278`:

```python
def _policy_to_strip_bookkeeping(policy: StaleKeyPolicy | None) -> bool:
    """Extract strip_bookkeeping boolean from policy for strip_undeclared_keys."""
    return False if policy is None else policy.is_denied(StaleKeyCategory.BOOKKEEPING)
...
preserve_keys = () if _policy_to_strip_bookkeeping(policy) else _NATIVE_BOOKKEEPING_KEYS
strip_undeclared_keys(tool_state, list(parsed_tool.inputs), removed_state_keys, preserve_keys=preserve_keys)
```

`grep -n policy clean.py` confirms `_policy_to_strip_bookkeeping` is the **only** consumer. And `strip_undeclared_keys` (`parameters/visitor.py:237-256`) is not category-aware:

```python
stale = [key for key in state if key not in known and key not in preserve_keys]
```

It deletes every undeclared key regardless of category. **The clean path never classifies at all** — it produces no `StaleKey` objects, so there are no categories to filter on. That's the whole bug: the flags describe a classification that the clean path doesn't perform.

### The asymmetry (why the categories aren't uniformly bogus)

| path | policy consumed via | per-category? |
|---|---|---|
| `validate` | `validate.py:356` — `policy.filter(stale)` | **yes, works** |
| `export` | `export_format2.py:154` — `policy.filter(stale)` | **yes, works** |
| `clean` | `clean.py:244` — `is_denied(BOOKKEEPING)` only | **no** |

`--allow`/`--deny` (validate/export) are fine. Only `--preserve`/`--strip` (clean) are broken. The category vocabulary and `StaleKeyPolicy` are sound — they were just attached to a stripper that can't act on them.

## History: the fix that wasn't

Granular history is squashed into `7708f583c1` "Add galaxy.tool_util.workflow_state package…" (47 files, 7893 insertions, 2026-07-15), but survives in backup refs. Search with `git log --all -S`.

- `5d1c627c23` (2026-03-15) "Add stale key classification with --allow/--deny/--preserve/--strip knobs." — introduces the flags.
- `19d23b7986` (2026-03-15) "Review fixes: double-counting, clean policy, conflict check, sys.exit." — its message says:

  > Wire full StaleKeyPolicy through clean.py pipeline (was reduced to strip_bookkeeping boolean, making --preserve/--strip no-ops for non-bookkeeping categories).

  That is an exact statement of this bug, claimed as fixed. **It wasn't.** The commit threads the `policy` *object* through the intermediate call chain — which reads like "wiring the full policy through" — then collapses it back to the same boolean at the leaf. It **introduced** `_policy_to_strip_bookkeeping` (0 occurrences before, 2 after):

  | | before `19d23b7986` | after |
  |---|---|---|
  | collapse site | `CleanOptions.strip_bookkeeping` property (top) | `_policy_to_strip_bookkeeping()` (leaf) |
  | passed down | `strip_bookkeeping: bool` | `policy` object |
  | `_strip_recursive` signature | `strip_bookkeeping: bool` | `strip_bookkeeping: bool` — **unchanged** |

  Net behavior identical. The collapse moved somewhere less visible, under a message asserting it was gone.

Verify:

```bash
git show 19d23b7986~1:lib/galaxy/tool_util/workflow_state/clean.py | grep -c _policy_to_strip_bookkeeping  # 0
git show 19d23b7986:lib/galaxy/tool_util/workflow_state/clean.py   | grep -c _policy_to_strip_bookkeeping  # 2
```

## Already fixed: the HTTP half

The same defect was exposed on `GET /api/workflows/{id}/download` as `clean_preserve`/`clean_strip`. **Removed** in `4628277d35` "Simplify workflow download clean params." on branch `wf_tool_state` — `clean=true` now simply strips everything. Zero consumers existed (no client code, no tests passing either param, no docs). Full analysis in `DOWNLOAD_CLEAN_PARAMS_CLEANUP_PLAN.md` in the worktree root.

**The CLI was deliberately left alone** — that's this issue.

## Code pointers

| what | where |
|---|---|
| `for_clean` / `_build` | `lib/galaxy/tool_util/workflow_state/stale_keys.py:337-368` |
| `StaleKeyCategory` enum, `ALL_CATEGORIES`, `CATEGORY_NAMES` | `stale_keys.py:40-50` |
| the collapse | `lib/galaxy/tool_util/workflow_state/clean.py:240-244`, `:278` |
| non-category-aware stripper | `lib/galaxy/tool_util/parameters/visitor.py:237-256` |
| CLI flags + the 5-value menu string | `lib/galaxy/tool_util/workflow_state/_cli_common.py:59-80` (`categories` at `:65`) |
| working per-category use (reference impl) | `validate.py:356`, `export_format2.py:154` |
| docs that oversell | `doc/source/dev/wf_tooling.md:263`, `:461` |

## Fix options

### `MAKE_CLEAN_CATEGORY_AWARE` — the real fix

Have clean classify before stripping, reusing the classifier `validate` already uses, then `policy.filter(stale)` to decide what to remove. `--preserve unknown` would then mean something. This is what the flags have always promised.

- Bigger change: `strip_undeclared_keys` (or a clean-specific wrapper) must emit categorized `StaleKey`s rather than raw key names.
- **Constraint (checked):** `strip_undeclared_keys` is **not** private to `workflow_state`. It is part of the public `tool_util.parameters` API (`parameters/__init__.py:105`, exported in `__all__` at `:189`) and has a live consumer at **`lib/galaxy/workflow/modules.py:2496`** — `strip_undeclared_keys(tool_state, parameters, preserve_keys=NATIVE_BOOKKEEPING_KEYS)`, the `ToolModule.save_to_step` stale-state stripping path. Don't change its contract in place; add a category-aware wrapper (or an opt-in return type) and leave the existing signature alone.
- Highest value: makes `--preserve stale-branch-data` (keep divergent conditional branch data) actually possible, which is plausibly the most useful knob for IWC cleanup work.

### `NARROW_THE_FLAGS` — honest, cheap

Replace `--preserve`/`--strip` with a single `--preserve-bookkeeping` boolean naming the one implemented behavior. Fix `wf_tooling.md:263` and the `categories` help string. Removes the lie without new machinery.

### `DOCUMENT_ONLY` — not recommended

Leave the flags, document the inertness. Keeps a menu where 4/5 entries do nothing.

## Testing notes

Whichever path: there is currently **zero test coverage** for either flag. `test_gxwf_cli.py:69` runs bare `["clean", CLEAN_WF]`; every `for_clean` call in tests passes `([], [])`. Red-to-green is available and appropriate here — write the test that `--preserve unknown` retains an unknown key **first** (it will fail today), then fix.

## Open questions

1. `MAKE_CLEAN_CATEGORY_AWARE` or `NARROW_THE_FLAGS`?
2. If narrowing — is `--preserve bookkeeping` itself wanted, or drop the knob entirely (like the HTTP side)? Nothing in-tree uses it.
3. `19d23b7986`'s message is inaccurate in the permanent record. Worth a note if this branch's history is ever presented for review?

*(Was Q4 — "does `strip_undeclared_keys` have callers outside `workflow_state`?" — answered: **yes**, `workflow/modules.py:2496` plus public export. Folded into `MAKE_CLEAN_CATEGORY_AWARE` above.)*
