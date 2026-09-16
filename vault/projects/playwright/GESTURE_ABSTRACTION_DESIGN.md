# Designing the input abstraction for both backends

Context: `test_conditional_subworkflow_step` dies on
`'_PlaywrightDriverImpl' object has no attribute 'move_to_element'`. The tempting fix — build a
Playwright `ActionChains` shim — is wrong. It makes a Selenium-shaped API permanent and forces the
Playwright backend to emulate a builder it does not want.

## What the call sites actually say

Census of all 33 `action_chains()` uses. Collapsed by intent:

| Intent | Sites | Already on the protocol? |
|---|---|---|
| hover over element | 6 | yes — `hover()` |
| click at element center, bypassing overlays | ~6 | yes — `move_to_and_click()` |
| double click | 1 | yes — `double_click()` |
| drag source → target (optional waypoints) | 3 | yes — `drag_and_drop()`, `mouse_drag()` |
| type text / keys to page | 2 | yes — `send_keys_to_page()` |
| **click with modifier held** (shift-click) | 1 | **no** |
| **press key with modifier** (shift-tab) | 1 | **no** |
| **move pointer away** (dismiss hover/tooltip) | 1 | **no** |

The vocabulary is ~80% built already. This is not a new abstraction — it is an existing one that is
incomplete and, crucially, **bypassable**.

## The actual defect: the protocol exports a Selenium builder

`HasDriverProtocol.action_chains()` (has_driver_protocol.py:365) and its proxy
(has_driver_proxy.py:323) hand tests Selenium's builder directly. So call sites reach past the
vocabulary and compose raw primitives. The Playwright impl answers with a stub returning `self`
(has_playwright_driver.py:831) — "exists but isn't used the same way" — which is why any chain method
raises `AttributeError`.

## Design

**The protocol speaks gestures, not input primitives.**

    tests                    intent:  shift_click(el), hover(el)
    NavigatesGalaxy          domain:  workflow_editor_connect(...)
    HasDriverProtocol        gesture: small, closed, backend-neutral vocabulary
    Selenium | Playwright    native:  ActionChains     |  page.mouse / page.keyboard

Additions to close the vocabulary:

    def click(self, element, *, modifiers: Sequence[Key] = ()) -> None
    def press(self, *keys: Key, modifiers: Sequence[Key] = (), element=None) -> None
    def hover_away(self) -> None          # move pointer off any element
    def active_element(self) -> WebElementProtocol   # for the aria test

**The rule that makes it stick:** delete `action_chains()` from `HasDriverProtocol` and
`HasDriverProxy`. Keep it as a private detail of the Selenium impl, which should keep using it —
Selenium's intent methods are *already* implemented that way (has_driver.py:360, 369, 388, 659), and
that is correct. Once it is off the protocol, a test physically cannot express a Selenium-shaped
gesture, and the type checker enforces it. A Playwright shim would instead make the leak permanent
and bidirectional.

**Neutral keys.** `_SELENIUM_KEY_TO_PLAYWRIGHT` in playwright_element.py translates Selenium `Keys`
constants at the Playwright boundary — the mapping's existence is the leak, in miniature. Invert it:
a neutral `Key` enum in test-facing code, each backend mapping to its own constants. Playwright's map
already exists; Selenium needs the mirror.

**Why intents, not a neutral chain builder.** A deferred chain fights Playwright's actionability
auto-waiting — you buffer steps, then fire them blind. That is the origin of the `force=True` calls
already in `has_playwright_driver.py`. Intent methods let each backend use its own strength:
Playwright auto-waits per action, Selenium batches into one W3C Actions call.

**Escape hatch, only if needed.** For a genuinely novel sequence, describe it as data and let each
backend compile it (`Gesture([MoveTo(el), PointerDown(), MoveBy(10,10), PointerUp()])`). The census
shows nothing currently needs it. Do not build it speculatively.

## Testing

Red-to-green, and the regression surface is real because `hover`/`move_to_and_click` get reimplemented.

1. Unit, per backend: a fake driver asserting each gesture compiles to the expected primitive calls.
   `test/unit/selenium/` already exists as a home.
2. Integration red-to-green: `test_conditional_subworkflow_step` (needs `click(modifiers=...)` path)
   then `test_aria_connections_menu` (needs `active_element()`).
3. Regression: re-run migrated workflow-editor tests under **both** backends — the shared helpers change.

## Sequencing as atomic PRs

1. Neutral `Key` enum + `press()`; migrate the shift-tab site. No Selenium behavior change.
2. `click(element, modifiers=...)`; migrate the shift-click site.
3. `hover_away()`; consolidate the move-by-offset sites.
4. `active_element()` on the protocol.
5. Port the remaining `action_chains()` call sites in `navigates_galaxy.py` onto the vocabulary.
6. Delete `action_chains()` from protocol + proxy — the enforcing step.
7. Drop the decorators that now pass.

Steps 1-4 are additive and independently mergeable. Step 6 is the one that cannot be partially done.

## Unresolved questions

- `send_enter` semantics: separate bug (trailing newline in committed field values). Fix as part of the
  neutral-key work, or standalone first?
- Does `press()` take an element, or always page-level with an explicit focus step?
- Is `test/unit/selenium/` the right home for gesture-compilation unit tests, or do they belong beside
  the drivers?
- Step 6 touches every remaining call site at once — acceptable as one PR, or gate it behind a
  deprecation period where the protocol method warns?
