# Migrate `workflow_editor_connect` to Playwright

## Problem

`workflow_editor_connect()` in `navigates_galaxy.py:1414` doesn't work with the Playwright backend. Tests that need to connect workflow nodes in the editor must use YAML import workarounds instead of programmatic connections.

## Root Cause

The method uses Selenium's `action_chains()` API:

```python
def workflow_editor_connect(self, source, sink, screenshot_partial=None):
    source_id, sink_id = self.workflow_editor_source_sink_terminal_ids(source, sink)
    source_element = self.find_element_by_selector(f"#{source_id}")
    sink_element = self.find_element_by_selector(f"#{sink_id}")
    ac = self.action_chains()
    ac = ac.move_to_element(source_element).click_and_hold()  # <-- FAILS HERE
    if screenshot_partial:
        ac = ac.move_by_offset(10, 10)
        ac.perform()
        ...
    self.drag_and_drop(source_element, sink_element)
```

`action_chains()` returns `self` (the driver) in Playwright, which doesn't have `move_to_element()` or `click_and_hold()`. Error: `AttributeError: '_PlaywrightDriverImpl' object has no attribute 'move_to_element'`.

## What exists already

### `drag_and_drop` (Playwright)

`has_playwright_driver.py:794` has a `drag_and_drop` that uses JS `DragEvent` simulation:

```python
def _drag_and_drop(self, source, target):
    self.page.evaluate("""
        (elements) => {
            const [source, target] = elements;
            const dataTransfer = new DataTransfer();
            source.dispatchEvent(new DragEvent('dragstart', { dataTransfer, bubbles: true }));
            target.dispatchEvent(new DragEvent('dragover', { dataTransfer, bubbles: true }));
            target.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true }));
        }
    """, [source, target])
```

### `workflow_editor_source_sink_terminal_ids`

This helper (`navigates_galaxy.py:1427`) resolves `"node_label#terminal_name"` strings to DOM element IDs. It works fine with Playwright — uses `wait_for_present()` and `get_attribute("id")`.

## What didn't work

1. **`action_chains().move_to_element()`** — Playwright returns `self` from `action_chains()`, so `.move_to_element()` raises `AttributeError`. The Selenium ActionChains pattern has no Playwright equivalent.

2. **Just calling `drag_and_drop` directly** — Not tested but the existing JS DragEvent simulation may not work for the Galaxy workflow editor canvas. The editor uses `@mousedown`/`@mousemove`/`@mouseup` events on SVG/canvas elements, not the HTML5 drag-and-drop API (`dragstart`/`dragover`/`drop`). The existing `_drag_and_drop` implementation dispatches `DragEvent`s which the editor may not listen for.

## Proposed fix

### Option A: Mouse event simulation (recommended)

Replace `action_chains` usage with Playwright's native mouse API in `workflow_editor_connect`:

```python
def workflow_editor_connect(self, source, sink, screenshot_partial=None):
    source_id, sink_id = self.workflow_editor_source_sink_terminal_ids(source, sink)
    source_element = self.find_element_by_selector(f"#{source_id}")
    sink_element = self.find_element_by_selector(f"#{sink_id}")

    if self._driver_impl.backend_type == "playwright":
        # Playwright: use native mouse drag via bounding box coords
        source_box = source_element._element.bounding_box()
        sink_box = sink_element._element.bounding_box()
        sx = source_box["x"] + source_box["width"] / 2
        sy = source_box["y"] + source_box["height"] / 2
        tx = sink_box["x"] + sink_box["width"] / 2
        ty = sink_box["y"] + sink_box["height"] / 2
        page = self._driver_impl.page
        page.mouse.move(sx, sy)
        page.mouse.down()
        if screenshot_partial:
            page.mouse.move(sx + 10, sy + 10)
            self.sleep_for(self.wait_types.UX_RENDER)
            self.screenshot(screenshot_partial)
        page.mouse.move(tx, ty)
        page.mouse.up()
    else:
        # Selenium: existing action_chains approach
        ac = self.action_chains()
        ac = ac.move_to_element(source_element).click_and_hold()
        if screenshot_partial:
            ac = ac.move_by_offset(10, 10)
            ac.perform()
            self.sleep_for(self.wait_types.UX_RENDER)
            self.screenshot(screenshot_partial)
        self.drag_and_drop(source_element, sink_element)
```

This uses real mouse events that the workflow editor's event listeners will respond to.

### Option B: Add ActionChains adapter to Playwright driver

Implement a `PlaywrightActionChains` class that translates Selenium's fluent API to Playwright mouse operations. More complex, but fixes all `action_chains()` callers at once.

### Option C: Also fix `_drag_and_drop` for mouse-based UIs

The existing `_drag_and_drop` in Playwright uses `DragEvent`s (HTML5 DnD API). Many Galaxy UI components use `mousedown`/`mousemove`/`mouseup` instead. Could add a `mouse_drag` method alongside:

```python
def mouse_drag(self, source, target):
    """Drag via mouse events (for UIs that use mousedown/mousemove/mouseup)."""
    source_box = self._unwrap_element(source).bounding_box()
    target_box = self._unwrap_element(target).bounding_box()
    self.page.mouse.move(source_box["x"] + source_box["width"]/2, ...)
    self.page.mouse.down()
    self.page.mouse.move(target_box["x"] + target_box["width"]/2, ...)
    self.page.mouse.up()
```

## Unresolved questions

- Does the workflow editor canvas use HTML5 DnD events or mouse events? Determines if existing `_drag_and_drop` would work at all.
- Should `action_chains()` return a proper adapter class, or should each caller be fixed individually?
- Any existing Playwright workflow editor tests that connect nodes? Could use as reference.

## Files to modify

- `lib/galaxy/selenium/navigates_galaxy.py` — `workflow_editor_connect()`
- `lib/galaxy/selenium/has_playwright_driver.py` — optionally add `mouse_drag()` or `PlaywrightActionChains`
