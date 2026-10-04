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

## Implementation log (2026-09-16)

Three branches, in order. Each is independently mergeable.

### `playwright_column_definition_send_enter`

Answers the first open question: the `send_enter` bug is **separate**, and fixing it standalone was
right. The description field is a `<textarea>`, ENTER inserted a literal newline into the saved
value, and `FormText` commits through `v-model` on every input event — so the ENTER was never doing
the work the comment claimed. Removing it unblocked
`test_collection_input_sample_sheet_chipseq_example`; green under both backends.

### `playwright_gesture_vocabulary_port` — plan step 5, pulled to the front

Sequencing the mechanical port *first* turned out better than steps 1-4. It needs no new API, so it
is the cheapest thing to review, and it shrinks the surface the later steps have to think about.

13 sites became `hover()` or `move_to_and_click()`. Three `backend_type` branches disappeared
(`clear_tooltips`, `workflow_run_ensure_expanded`, and the tooltip hover in `get_tooltip_text`) —
those branches existed only because the *domain* layer was choosing an input strategy, which is the
driver's job. One chain in `test_history_multi_view` was built and never performed; deleted.

`test_conditional_subworkflow_step` migrated for free: its only blocker was one
`move_to_element(x).click().perform()`.

### `playwright_neutral_key_press` — plan step 1

`press(*keys, modifiers=..., element=...)` on the protocol, implemented natively by each backend, plus
the `Key` enum. `send_enter`/`send_escape`/`send_backspace` now delegate to it.

Two design decisions changed from the sketch above:

- **`Key` values are semantic** (`"shift"`, `"tab"`), not Selenium's unicode constants, with one map
  per backend. The tempting shortcut — give the enum Selenium's values so existing call sites keep
  working — would have made Selenium's encoding the interchange format. It is safe to do properly
  because `press()` never goes through `PlaywrightElement.send_keys`, which flattens its arguments
  into a character stream and would type `"tab"` literally. That flattening is why
  `send_keys_to_page` still takes Selenium constants; it migrates when the char-stream path is
  rewritten.
- **No new `click()`.** The sketch proposed `click(element, modifiers=...)`, which collides with the
  protocol's existing `click(selector_template: Target)`. Modified clicks belong as a `modifiers`
  kwarg on `move_to_and_click()` instead — extending the gesture that already exists rather than
  adding a near-synonym.

Fixed a latent bug on the way: `HasDriver._send_key` built an `ActionChains` for the no-element case
and never called `perform()`, so page-level `send_escape()` silently did nothing under Selenium.
`test_workflow_run_target` is the one caller; it now gets a real ESCAPE, which CI should confirm.

Tests live in `test/unit/selenium/test_has_driver.py` (answering the third open question) because the
`has_driver_instance` fixture there already parametrizes over Selenium, Playwright, and the proxy
against real browsers. 21 new tests; the whole file is 400 passing.

### `playwright_hover_away` - plan step 3, plus half of step 6

`hover_away()` on the protocol. `_clear_tooltip` was the last unguarded `action_chains()` use in
shared code, so every tooltip assertion was broken under Playwright - and nothing caught it, because
`integration_selenium.yaml` has no Playwright matrix and its four `assert_tooltip_text_contains`
calls are the only live callers.

**Not a faithful port, deliberately.** Selenium's `move_by_offset(100, 100)` is *relative* to the
current pointer. Playwright exposes no read of that position, so parity needs the driver to track
every mouse move - and `mouse_drag`'s Playwright branch still moves the mouse from
`navigates_galaxy`, outside the driver, so a cached position would go stale and be silently wrong.
That is the exact failure class this work exists to delete. Instead the Playwright impl asks the page
for `document.querySelectorAll(":hover")`, takes the innermost hovered element, and moves clear of
its box. No stored state.

Known limit, accepted not overlooked: it clears the *innermost* hovered element, so a trigger that is
an ancestor of what the pointer sits on (icon inside a button) may survive. Selenium's blind offset
has the same hole, and `_clear_tooltip` retries twice then raises a named message, so it fails loudly.

**`action_chains()` under Playwright now raises** instead of returning `self`. Strictly an
improvement in error quality, not a behavior change: the stub made every chain method an
`AttributeError` on the driver, so nothing that passes today could break. The single exception was
`test_action_chains`, which asserted `chains is not None` - the one thing a stub satisfies. Rewritten
to assert the per-backend contract rather than dropped, as the sketch above had assumed.

**Verification.** `test_hover_away` added beside `test_hover`, using the existing
`#hover-target` / `#hover-indicator` fixture and its `:hover + sibling` CSS, so it runs against real
browsers on all three fixture params. Confirmed load-bearing by stubbing both impls and watching it
go red on selenium, playwright and proxy-selenium. Full file: 309 passed, 1 skipped.

The real-Galaxy path needed a separate check, because `integration_selenium` cannot run in a
`GALAXY_SKIP_CLIENT_BUILD=1` worktree - it hosts its own Galaxy, so there is no Vite dev server to
target and every test errors on `#masthead` in setup. Probed instead with a throwaway selenium test
against the running dev server: two `get_tooltip_text` reads with `click_away=False`, so the second
can only succeed if `_clear_tooltip` dismissed the first tooltip. Passes under both backends, same
text both times (`'Home'`, `'Support, Contact, and Community'`).

That probe happens to cover the ancestor-trigger case above: `MastheadItem` puts `v-g-tooltip` on the
`BNavItem` `<li>`, while the pointer lands on the `<a>` inside it. 100px of clearance from the inner
box leaves the outer one too, so the limit needs a trigger much larger than its hovered child before
it bites.

## Remaining work

| Step | Needs |
|---|---|
| `move_to_and_click(modifiers=...)` | migrates `shift_click`, deletes its `backend_type` branch |
| ~~`hover_away()`~~ | done - `playwright_hover_away` |
| ~~`active_element()`~~ | done - merged with `press()` in [#23574](https://github.com/galaxyproject/galaxy/pull/23574) on 2026-09-21; both are on the protocol (`has_driver_protocol.py:375`, `:380`), the proxy (`has_driver_proxy.py:329`, `:333`) and both impls. `test_aria_connections_menu` is unblocked. |
| `send_keys_to_page` / `mouse_drag` | move their `backend_type` branches into the driver impls |
| ~~held drags~~ | done - `playwright_drag_over_feedback`. `drag_over(source, target)` is a context manager holding a drag over the target, dropping on exit; `test_history_pages:387` uses it and its `selenium_only` is gone. |
| partial drags | `navigates_galaxy:1245` holds a pointer drag to an *offset* with no target, only to screenshot it. Deliberately not folded into `drag_over`, which takes a target and ends in a drop. |
| delete `action_chains()` from protocol + proxy | the enforcing step; decided 2026-09-20, deferred behind the ports above (see below) |

Remaining `action_chains()` callers, all that step 6 has left to port: `navigates_galaxy` 1245 (partial
drag), 3012 (`shift_click`), 3045 (`send_keys_to_page`), 3088 (`mouse_drag`) - each already inside a
`backend_type == "selenium"` branch - plus `test_workflow_editor`
1354/1390/1431/1437, `test_uploads:424`, and `test_workflow_run:319` in the test suite
(`test_history_pages:387` came off this list with `playwright_drag_over_feedback`).
`test_custom_tools:111` and `test_workflow_editor:1966` build their own `ActionChains(self.driver)` and
do not go through the protocol at all.

### Decided 2026-09-20: delete the protocol method, keep the Selenium one

Asked whether the `NotImplementedError` in the Playwright impl is the destination or a waypoint. It is a
waypoint. Step 6 deletes three things, not one: the abstract declaration
(`has_driver_protocol.py:373`), the proxy delegate (`has_driver_proxy.py:325`), and the Playwright raise
(`has_playwright_driver.py:867`). `HasDriver.action_chains()` stays as a concrete Selenium method - the
Selenium impl uses it internally at 361, 370, 378, 397 and 667, which is just an implementation using its
own toolkit.

Three findings settle it:

- **The escape hatch already exists.** `NavigatesGalaxy.driver` (`navigates_galaxy.py:268`) is a property
  returning the raw Selenium `WebDriver` under Selenium and raising
  `NotImplementedError("Functionality cannot be run with Playwright yet.")` under Playwright - the same
  semantics the `action_chains()` raise now has. Two doors to one room; the protocol method is the
  redundant one.
- **The target form has precedent in-tree.** `test_custom_tools:111` and `test_workflow_editor:1966`
  already write `ActionChains(self.driver)` directly. The other ten sites join them; no new machinery.
- **It fails the protocol's own premise.** The protocol speaks intents - `hover`, `double_click`,
  `fire_mousedown`, `drag_and_drop`. `action_chains()` returns a Selenium builder object that no
  non-Selenium backend can ever produce. A method that exists only to be refused is not an abstraction.

Checked and dismissed: whether `ActionChains(self.driver)` in `navigates_galaxy` would drag Selenium into
the domain layer. It would not - lines 29-30 already import `By` and `Keys`.

Sequencing is the open question, not the destination. Four of the ten sites are ones the gesture ports
above would *delete* rather than rewrite, so doing step 6 first means writing code we then throw away.
Deferred deliberately: the raise stays until the `move_to_and_click(modifiers=...)`, `send_keys_to_page`,
`mouse_drag` and partial-drag ports land, and step 6 closes behind them.

**Updated 2026-09-21.** Two of those prerequisites are now off the list. #23574 landed `press()` and
`active_element()` together - steps 1 and 4 - so the deferred set is down to
`move_to_and_click(modifiers=...)`, the `send_keys_to_page` / `mouse_drag` driver-impl moves, and the
partial / held drags. Nothing about the sequencing argument changes; the queue in front of step 6 is
just shorter. `playwright_hover_away` was rebased onto dev the same day, and the one conflict was
exactly here - dev added `active_element()` and `press()` at the spot in `has_driver.py` where the
branch adds `hover_away()`, purely additive, both sides kept.

## Element typing in HasDriver

Selenium's `WebElement` does **not** satisfy `WebElementProtocol` under mypy.
`WebElement.find_element` takes `str | By` and returns `WebElement`, while the
protocol declares `find_element(by: str) -> WebElementProtocol`; the return type
fails to match, recursively. This is exactly why `_webelement_to_protocol`
exists as a documented `cast`.

Practical consequence: a test holding a raw element from
`self.driver.find_element(...)` cannot pass it to a protocol-typed method such
as `move_to_and_click()`. **Fix it at the call site** — use the neutral finders
(`find_element_by_link_text`, etc.), which already return `WebElementProtocol`.

An abandoned branch (`selenium_driver_protocol_element_types`) instead widened
eleven `HasDriver` element parameters from `WebElement` to `WebElementProtocol`,
on the theory that the implementation narrowed what the protocol promised. That
was wrong twice over:

- **It fixed nothing.** The real errors land on `HasDriverProxy.move_to_and_click`,
  which was already typed `WebElementProtocol`, and survived the change verbatim.
- **It made the annotations false.** All eleven bodies genuinely require a real
  `WebElement`: `action_chains().move_to_element(element)` and
  `execute_script("...", element)` both serialize by Selenium element ID, so a
  `PlaywrightElement` fails at runtime. The widening only type-checked because
  `action_chains()` is unannotated (so `Any`) and `execute_script(*args)` takes
  `Any` — nothing checks those bodies at all.

Nor is anything enforcing conformance: every `HasDriverProtocol` binding site
uses `cast()`. Backend and element type always travel together, so cross-backend
substitution is not a real scenario — the implementations should keep their
concrete types, and shared code should obtain elements through the protocol.

## Local environment

Both backends now run locally on macOS:

- Point tests at the **Vite dev server** (`GALAXY_TEST_EXTERNAL=http://localhost:5173/`). Galaxy on
  8080 serves `/static/dist/*`, which does not exist in a `GALAXY_SKIP_CLIENT_BUILD=1` worktree.
- Playwright wants `GALAXY_TEST_SELENIUM_HEADLESS=1`. Headed runs hang in `Page.screenshot` when the
  browser window is occluded, and every failure then surfaces as a screenshot timeout rather than the
  real error.
- Selenium needs chromedriver on `PATH`; Selenium Manager will fetch it
  (`selenium/webdriver/common/macos/selenium-manager --browser chrome`). Leave
  `GALAXY_TEST_SELENIUM_HEADLESS` unset — setting it to `1` asks for Xvfb, which macOS lacks.
