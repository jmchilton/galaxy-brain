---
type: research
subtype: component
tags:
  - research/component
  - galaxy/testing
status: draft
created: 2026-03-16
revised: 2026-03-16
revision: 1
ai_generated: true
component: E2E Tests Smart Components
galaxy_areas: [testing]
---

# Galaxy Selenium Component System — Deep Dive

## Architecture

```
navigation.yml  →  Component.from_dict()  →  SmartComponent(Component, HasDriver)
                                                   ↓ __getattr__
                                             SmartTarget(SelectorTemplate, HasDriver)
                                                   ↓ wait_for_visible() / click() / etc.
                                             Selenium WebElement
```

**Key files:**
- `client/src/utils/navigation/navigation.yml` — source of truth for selectors
- `lib/galaxy/navigation/components.py` — `Component`, `SelectorTemplate`, `Target`, `Label`, `Text`
- `lib/galaxy/navigation/data.py` — `load_root_component()`
- `lib/galaxy/selenium/smart_components.py` — `SmartComponent`, `SmartTarget`
- `lib/galaxy/selenium/navigates_galaxy.py` — `self.components` property, helper methods
- `lib/galaxy/selenium/has_driver.py` — `HasDriver` mixin

## Loading

`data.py` loads navigation.yml and parses it into a `Component` tree:

```python
def load_root_component() -> Component:
    raw = yaml.safe_load(resource_string(__name__, "navigation.yml"))
    return Component.from_dict("root", raw)
```

Cached on `NavigatesGalaxy._root_component`. When `_interactive_components=True`, reloads every access (for live dev).

`self.components` wraps the root with `SmartComponent(self.navigation, self)`.

## Resolution Chain

`self.components.tool_form.execute.wait_for_and_click()` resolves as:

1. `self.components` → `SmartComponent(root, self)`
2. `.tool_form` → `SmartComponent.__getattr__("tool_form")` → finds `Component` in `_sub_components` → wraps as `SmartComponent`
3. `.execute` → finds `SelectorTemplate` in `_selectors` → wraps as `SmartTarget`
4. `.wait_for_and_click()` → calls `self._has_driver.wait_for_and_click(self._target)` → Selenium interaction

Lookup order in `Component.__getattr__`: `_sub_components` → `_selectors` → `_labels` → `_text` → `AttributeError`

## Parameterized Selectors

YAML:
```yaml
parameter_div: 'div.ui-form-element[id="form-element-${parameter}"]'
```

Usage:
```python
self.components.tool_form.parameter_div(parameter="inttest")
```

Calling a `SmartTarget` invokes `SelectorTemplate.__call__(**kwds)` which creates a **new** `SelectorTemplate` with merged kwds. The `${parameter}` substitution happens lazily when `.selector` is accessed via `string.Template.substitute()`.

## The `_` Convention

The `_` key in a `selectors:` block is the component's root/self selector. It enables parent-reference in child selectors via `${_}`:

```yaml
content_item:
  selectors:
    _: '.history-index .content-item${suffix}'
    title: '${_} .content-title'
```

```python
# Resolves to: .history-index .content-item[data-hid="1"] .content-title
self.components.history_panel.content_item(suffix='[data-hid="1"]').title
```

All other selectors in the same block become `children` of `_`. Calling a `Component` directly invokes its `_` selector.

## Selector Types

- **CSS** (default): `'button#execute'`
- **XPath**: `{type: xpath, selector: '//button[contains(text(), "${name}")]'}`
- **data-description shorthand**: `{type: data-description, selector: 'repeat insert'}` → `[data-description="repeat insert"]`
- **ID**: `{type: id, selector: 'some-id'}`
- **List selectors**: A list of template strings — the first one whose `${vars}` all resolve is used. Enables selectors that adapt based on which parameters are supplied.

## SmartTarget Methods

### Wait methods (all return WebElement unless noted)
- `wait_for_visible(**kwds)`
- `wait_for_and_click(**kwds)` — waits clickable, clicks
- `wait_for_and_double_click(**kwds)`
- `wait_for_clickable(**kwds)`
- `wait_for_text(**kwds)` — returns `.text` string
- `wait_for_value(**kwds)` — returns input `.value`
- `wait_for_present(**kwds)` — DOM present, possibly hidden
- `wait_for_absent(**kwds)` — completely gone from DOM
- `wait_for_absent_or_hidden(**kwds)`
- `wait_for_element_count_of_at_least(n, **kwds)`

### Assert methods
- `assert_absent(**kwds)`
- `assert_absent_or_hidden(**kwds)`
- `assert_absent_or_hidden_after_transitions(**kwds)`
- `assert_disabled(**kwds)`
- `assert_data_value(attribute, expected_value)`

### Data access
- `is_displayed` (property, no wait)
- `is_absent` (property, no wait)
- `all()` — `find_elements`, returns list of all matching elements
- `has_class(class_name)` — bool
- `data_value(attribute)` — reads `data-{attribute}` from element

### Input methods
- `wait_for_and_send_keys(*text)`
- `wait_for_and_send_enter()`
- `wait_for_and_clear_and_send_keys(*text)`
- `wait_for_and_clear_aggressive_and_send_keys(*text)`
- `select_by_value(value)` — for `<select>` elements

### Accessibility
- `axe_eval()` → `AxeResults`
- `assert_no_axe_violations_with_impact_of_at_least(impact, excludes)`

## SelectorTemplate Advanced Operations

### `.with_class(class_)`
Returns new `SelectorTemplate` with `.{class_}` appended:
```python
self.components.history_panel.content_item.with_class("active")
# Produces: .content-item.active
```

### `.with_data(key, value)`
Returns new template with `[data-{key}="{value}"]` appended:
```python
selector.with_data("state", "ok")
# Appends: [data-state="ok"]
```

### `.descendant(has_selector)`
Returns new template with child selector appended:
```python
parent.descendant(".child-class")
# Produces: parent_selector .child-class
```

### `resolve_component_locator(path)`
Supports dot-path string resolution:
```python
component.resolve_component_locator("item(hid=1).title")
```
Parses the path with regex, recursively resolves through sub-components.

## The `tool_form` Component (navigation.yml)

```yaml
tool_form:
  selectors:
    tool_version: '[data-description="galaxy tool version"]'
    options: '.tool-dropdown'
    execute: 'button#execute'
    parameter_div: 'div.ui-form-element[id="form-element-${parameter}"]'
    parameter_error: '...${parameter}"] .ui-form-error-text'
    parameter_checkbox: '...${parameter}"] .ui-switch'
    parameter_select: '...${parameter}"] .multiselect'
    parameter_input: '...${parameter}"] .ui-input'
    parameter_textarea: '...${parameter}"] textarea'
    parameter_data_select: '...${parameter}"] .multiselect'
    repeat_insert: '[data-description="repeat insert"]'
    repeat_move_up: '#${parameter}_up'
    repeat_move_down: '#${parameter}_down'
    drilldown_select_all: '...${parameter}"] div.select-all-checkbox'
    drilldown_option: '.drilldown-option'
    drilldown_expand: '.fa-caret-down'
  labels:
    generate_tour: 'Generate Tour'
```

All `parameter_*` selectors follow the pattern: `div.ui-form-element[id="form-element-${parameter}"]` prefix + child selector. Flat structure (no `_` root, no sub-components).

## How the Tool Form Harness Uses Components

**Via components (defined in navigation.yml):**
```python
self.components.tool_form.execute.wait_for_and_click()
self.components.tool_form.execute.wait_for_visible()
self.components.tool_form.repeat_insert.wait_for_and_click()
self.components.tool_form.parameter_data_select(parameter=id).wait_for_visible()
self.tool_parameter_div(id)  # wraps parameter_div(parameter=id).wait_for_clickable()
```

**Via raw CSS selectors (within parameter divs):**
```python
div.find_element(By.CSS_SELECTOR, "input[type='checkbox']")
div.find_element(By.CSS_SELECTOR, ".multiselect")
div.find_element(By.CSS_SELECTOR, "input[type='color']")
div.find_element(By.CSS_SELECTOR, ".drilldown-option")
div.find_element(By.CSS_SELECTOR, "input")
self.find_elements_by_selector(".ui-portlet-section .portlet-header")
```

The harness mixes component-based access (top-level form elements) with raw CSS (finer-grained inspection within parameter divs). The raw CSS is used because detection logic needs to inspect what's *inside* a parameter div to determine the type, and the component system doesn't model that level of detail.

## Lazy Resolution

- `_root_component` loaded once at class definition (eager)
- `self.components` creates a new `SmartComponent` on every access (cheap — stores references)
- Attribute traversal creates wrapper objects but doesn't touch the DOM
- DOM interaction only on terminal method calls (`wait_for_visible()`, etc.)
- `string.Template.substitute()` happens lazily when `.selector` is accessed
