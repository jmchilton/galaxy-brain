# Test challenges review: galaxy#24716

- Profile: `gx_test_challenger`
- Model: claude-opus-5-5
- Effort: low
- Reviewed commit: `79c6aac67bbd04a94e8fbd704cd3e92b07740c5d`

Test coverage is good for this fix: no P1 or P2 findings. The allowed-filters test fails with the pre-fix lookup restored, and the not-allowed test fails with validation disabled. Details and run caveats are in [test_challenges_debrief.md](test_challenges_debrief.md).

## P3 1: Share the preference setup and tighten the tool assertion

Both new tests repeat the same `trans` setup and preference dict. The allowed test also checks `filters["tool"][-1]`, relying on filter order, which the `TODO` in the neighboring `test_custom_filters` already calls an implementation detail that shouldn't be tested.

Move the setup into a small helper in the test file, and compare only what the preference added:

```python
def trans_with_filter_preferences(factory):
    trans = mock_trans()
    trans.app.config = factory.toolbox.app.config
    trans.user.preferences = {
        "toolbox_tool_filters": "filtermod:filter_tool",
        "toolbox_section_filters": "filtermod:filter_section",
        "toolbox_label_filters": "filtermod:filter_label_1",
    }
    return trans
```

```python
added = [f for f in filters["tool"] if f not in factory.default_filters["tool"]]
assert [f.__doc__ for f in added] == ["Test Filter Tool"]
```
