```yaml
documents:
  - path: vault/repositories/galaxy/branches/merged/issue_24377_history_item_buttons_26.2/scope_evaluation.md
    why: Option B/B1 analysis of this exact fix (ContentOptions GButton switch); warns that moving the enabled edit button to GTooltip breaks tooltip_balloon/get_tooltip_text, so a GTooltip-aware helper is needed.
    load_when: Planning the fix and its test impact.
  - path: vault/repositories/galaxy/branches/merged/issue_24377_history_item_buttons_26.2/implementation_debrief.md
    why: Origin of the bug; discarded test asserts aria-disabled instead of hovering, and the enabled-edit hover checks that must keep passing.
    load_when: Updating test_history_dataset_state.py or the Selenium tooltip helpers.
  - path: vault/projects/architecture/topics/client.md
    why: Short GButton/GLink guidance (tooltip prop, BButton to GButton migration); only existing client-component note.
    load_when: Confirming the GButton tooltip convention.
  - path: vault/research/Component - E2E Tests Smart Components.md
    why: Smart-component assertions (assert_disabled etc.) that behave differently for aria-disabled under Selenium vs Playwright.
    load_when: Writing or changing the E2E assertion for the disabled edit button.
  - path: vault/research/Component - E2E Tests - Writing.md
    why: Navigation/selectors and clear_tooltips helper background for adding a GTooltip-aware hover helper.
    load_when: Touching navigation.yml tooltip_balloon or navigates_galaxy tooltip helpers.
research_requests:
  - vault/agents/gx_research/todo/client_galaxy_ui_components.md
```

Gaps: no note on GButton/GTooltip/vGTooltip disabled-tooltip semantics (queued above); `projects/architecture/topics/client.md` doesn't mention `disabled-title` or the directive's disabled guard. The audit of other `v-g-tooltip` + `:disabled` GButton sites has no prior vault coverage; the code is the source.
