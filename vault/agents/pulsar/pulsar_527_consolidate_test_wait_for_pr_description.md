Fixes #527.

Four test modules each had their own "poll until a condition holds or time out" loop, and they behaved differently on failure. `messaging_outbox_test.py`'s version returned `False` instead of raising, so every caller had to assert on the result.

They are replaced by one `wait_for(poll, description, until=None, timeout=5, interval=0.01)` in `test/test_utils.py`:
- It returns the polled value, so `wsgi_app_test.py` still gets the final job status back.
- On timeout it raises `AssertionError` naming what it waited for.
- With an `until` predicate it polls a value rather than a boolean, and the timeout message includes the last value seen. Call sites that compared a polled value (stdout contents, pending counts, callbacks) now use `until`, so a failure shows what the test actually saw.

Other changes:
- `BaseManagerTestCase._assert_status_becomes_cancelled` uses it too, instead of its hand-counted 100 × 10ms loop. The bound is now 2s of wall-clock time: the old loop's 100 polls always took more than 1s. It still fails immediately on `complete` or `failed`.
- `wsgi_app_test.py` imports from `test_utils` at the top of the module instead of inside the test function.
- `test/wait_for_test.py` covers the helper's timeout messages, since no passing test ever exercises that path.

`_test_simple_execution` is left alone. It waits with no timeout by default and busy-spins without sleeping. Changing that would change drmaa test timing, so it's out of scope here. `test/integration_test_state.py` has two more of these loops, but pytest never collects that file (#484), so they're left for whoever revives it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
