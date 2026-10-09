# galaxy#23797 - [26.1] Fix built-in converter registration during toolbox reload

PR: https://github.com/galaxyproject/galaxy/pull/23797 | head `f230d51d914` | base `release_26.1` | reviewed 2026-09-30

## Summary

On reload, `ToolBox.__init__` -> `load_builtin_converters()` put the *previous* toolbox's converter objects into the Built-in Converters section, but they weren't in the new toolbox's `_tools_by_id`, so EDAM view building hit `KeyError` in `__add_tool_to_tool_panel` (`base.py:582`). The fix: reload converters through `registry.load_datatype_converters(self, use_cached=True)` at the top of `load_builtin_converters()` (only when the registry is already populated, i.e. a reload), `register_tool()` every displayed converter, and dedupe `_tools_by_old_id` appends.

The diagnosis is right and the fix works. CI green (56 pass). `_get_new_toolbox` (`queue_worker/__init__.py:300`) still loads converters right after construction, so a reload now loads them twice. Verified harmless: the second load is always a cache hit that returns the same object.

**Verdict: approve. Findings 1-3 are optional; 1 and 2 fit a `dev` follow-up better than 26.1.**

## Findings

1. **Low / optional - reload now loads converters twice.** `tools/__init__.py:567-571` and `queue_worker/__init__.py:300` both run `load_datatype_converters(new_toolbox, use_cached=True)`, and the loop at `:585` then calls `register_tool` again. That's three registrations per converter, where there used to be one, and it's why the `tool not in` dedupe at `tool_util/toolbox/base.py:1300` is needed. This is harmless in practice. `reload_toolbox` cleans the cache only before construction (`queue_worker:279`), so the second load is a cache hit that returns the same object, and the extra cost is a few dict operations per converter. If you want to tidy it up, make one call site own the reload-time load:
   ```python
   # ToolBox.__init__, after super().__init__()
   registry = app.datatypes_registry
   if registry.datatype_converters:
       # Toolbox reload: rebind converters to this toolbox before panel views are built.
       registry.load_datatype_converters(self, use_cached=True)
   if app.config.display_builtin_converters:
       self.load_builtin_converters()
   ```
   Then drop `queue_worker:300` and the refresh block in `load_builtin_converters`. With the loop's `register_tool` kept, the dedupe stays load-bearing. Fine to leave for the `dev` follow-up in (2), which moves startup loading into the toolbox as well.
   Verification (2026-09-30): an app without `tool_cache` never reloads (`UniverseApplication` sets it at `app/__init__.py:913`; mocks set one too), and nothing expires the cache between the two loads short of a concurrent admin `remove_tool`. So the divergent-object scenario in the first draft of this finding doesn't occur; downgraded from Medium.

2. **Low / follow-up (pre-existing, not a 26.1 blocker) - Built-in Converters section is empty at first startup.** The datatypes registry is configured (`app/__init__.py:763`) before the toolbox (`:917`). Converters, though, are loaded only after construction (`:930`), so on first boot `load_builtin_converters` sees an empty `datatype_converters` and builds an empty section. It fills only after the first reload. The `if registry.datatype_converters:` gate keeps this behavior on purpose. For `dev`: gate on `registry.converters` (the configured list) instead, and remove the `:930` call. The toolbox then owns converter loading at startup and reload alike, which is the reusable abstraction the three call sites currently lack.

3. **Low - the test replays the reload sequence by hand.** `test_toolbox.py:660-661` constructs `ToolBox(...)` and then calls `load_datatype_converters` "to match the reload order". If `_get_new_toolbox` changes, this copy won't follow. Once (1) is applied, the second call goes away and the test just constructs the toolbox. Also, all three EDAM modes go through the same `__add_tool_to_tool_panel` -> `_tools_by_id[...]` path. The 3 x 4 matrix could become the 4 version cases on a single EDAM view (keeping `merged` covers the reported error) without losing coverage. The test itself is good: real registry loader, real cache expiry, no monkeypatching, and it fails red before the fix.

Imports: fine (the new `ToolBox`/`Path` imports are module-level). No weakened tests.

## Draft review

_This review was posted by Claude (AI assistant) on behalf of jmchilton._

Thanks, the diagnosis is right: the reloaded toolbox was building panels with converter objects it had never registered, and the regression test with the real registry loader and cache expiry is nice.

Optional tidy-up, fine to skip for 26.1: `_get_new_toolbox` (`queue_worker/__init__.py:300`) still calls `load_datatype_converters(new_toolbox, use_cached=True)` after construction, so a reload now loads converters twice (harmless, since the second load is a cache hit that returns the same object). If you'd like a single call site, the toolbox could own the reload-time load:

```python
# ToolBox.__init__, after super().__init__()
registry = app.datatypes_registry
if registry.datatype_converters:
    # Toolbox reload: rebind converters to this toolbox before panel views are built.
    registry.load_datatype_converters(self, use_cached=True)
if app.config.display_builtin_converters:
    self.load_builtin_converters()
```

The EDAM-mode parametrization could probably shrink to a single view, since all three go through the same `_tools_by_id` lookup.

Not for 26.1: at first startup the Built-in Converters section looks empty until the first reload, because converters are loaded after the toolbox is built (`app/__init__.py:930`). Gating on `registry.converters` and dropping that call would let the toolbox own converter loading at startup and reload alike. That could be a follow-up on `dev`, together with the tidy-up above.
