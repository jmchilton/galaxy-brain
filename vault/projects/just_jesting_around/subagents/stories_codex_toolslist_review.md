# ToolsList stories review — 2a56b0f6a0b

Reviewed 2026-10-14. Independent read-only review approved candidate and shared prerequisite a0af328d9bf against e539c84d41d. No blocking findings or requested corrections.

## Assertion mapping

All 12 original cases retain unchanged constants and expectations: 28 sites, 36 executed assertions because advanced-input existence/type checks run for five inputs. Advanced search retains empty fetch, toggle, expanded menu, each input existence/type, exact router payload (6 sites/14 assertions). Advanced route and repeated-tag route each retain exact Whoosh query. Entered tags retain router and fetch (2). Autocomplete retains existence, suggestion, value, router and fetch (5). Missing closing quote retains absence and value (2). Card tag retains quoted value, router and fetch (3). Route multi-word tag and legacy Get Data each retain exact value. Boolean, mixed tag/free-text and mixed tag/ontology each retain exact router and fetch (2 each).

Selective Pinia stubs replace the same four original controlled fetch actions. Original partial router mock, real RouterLinks and exact 400 ms advances remain. Mount waits for the actual component and owns/disposes its Pinia. Fake timers start after asynchronous decorator preparation; debounce coverage remains. Existing storage cleanup reused unchanged.

## Scenarios and fixture scope

The three stories are understandable catalog states and reuse toolbox data, handlers and decorator. Shared fixtures precede consumers. Build help/help_format match Tool.to_json, and fallback matches ToolMissingException. The catalog matcher supports declared scenarios correctly; it intentionally omits other advanced fields and combined tag/free-text/ontology semantics. Future result stories for those queries need richer handlers. This limitation does not affect original controlled query assertions.

## Validation

Supplied targeted units 12/12, removable scenario probes 3/3, prerequisite browser 339 tests/88 files and clean types were reviewed. Probes removed. No reviewer edits or additional gates. Complete post-review gates passed unit 716 tests in all 90 selected files and Chromium 342 tests in 89 files. Formatting, lint and normal hooks passed; fast-forward push completed.
