# Review debrief: sweep fixes phase 2 (t28), batch 1 (FP-7, FP-6)

I acted on every finding from the four review passes, and each fix is folded into its cause commit. After the fixes, the range is `f8955682e6d..e4da83767c8`: FP-7 is `3f6be6a07ad` and FP-6 is `e4da83767c8`. It is pushed as a checkpoint.

The main change came from the reviews. FP-7 first gave non-account attributes of `$__user__` (addresses, for example) a source the job check could resolve, a literal attribute chain from the user object. Three review passes each found a new way for the job check's reading and the template's rendering to disagree. In each one, the template changed the list in place, inside a loop, through a function argument, or through the stored object. So the final FP-7 reads those attributes with the default sanitizer's characters, but as untraced, which makes them uncheckable. Account attributes and preferences stay traced.

Not acted on:
- **Catalogue item D (new, pre-existing):** a plain `int()` cast reads as fully clean, so a negative number's leading dash is not visible to option-injection. `map(int, ...)` keeps the dash, so it now differs from `int()` here.
- **Catalogue item E (new, pre-existing):** a string method on a preference or an account string, followed by `.unsanitized`, still reads as sanitized, but Galaxy renders the stored value raw. On other attributes of the user object it is closed.
- **Catalogue item F (new, pre-existing):** template lists and dicts changed in place inside a loop after a read, or through a function argument (`random.shuffle($l)`, `list.reverse($l)`, `dict.update($d, ...)`), are not seen as changed.
  - Changes made through a method name (`$l.reverse()`, `$d.update(...)`) and through subscript assignment are seen.
  - The general fixes are separate work: run a loop body until its locals are stable, and unorder list arguments of unknown calls.
- **`str()` of a container the user object reaches:** the text has structural characters (`[ ] { } , :`) that the default-sanitizer reading leaves out. This was observed and not changed.
- **For the runtime branch:** the first block of the API test `test_model_attributes_sanitization` expects a job with `"` in the dataset name to be refused at the default level. That expectation no longer holds. At the parent, the refusal came from the uncheckable high findings on `$__user__`. Those findings are gone, and only low findings remain, which enforce_code does not enforce. The test needs that expectation dropped or inverted.

<details>
<summary>Reviews (non-sensitive)</summary>

The reviewers were general-purpose subagents (Claude Opus 5.5), read-only, with probes. Pass 1 reviewed `f8955682e6d..490473ed5fd`. Passes 1b, 1c and 1d re-reviewed each round of fixes.

**Pass 1**
1. **blocker, FP-7:** a job check source that couldn't resolve the attribute. Non-account attributes of the user object got a source key that the job check resolved to the wrapper object itself, not the attribute. Their findings passed every job, where the parent refused them.
   - Done, first as a resolvable chain. After pass 1c, it was replaced by the uncheckable reading (see above).
   - Red spec cases: `user_attribute_python_code` and `user_attribute_unquoted`.
2. **should-fix, FP-7:** `.unsanitized` of a preference reached through `.items()`, `.values()`, a computed key or `.get($key)` read as sanitized, but Galaxy renders it raw.
   - Done: those forms give a sanitized user string whose `.unsanitized` is raw.
   - Spec case: `user_preferences_items_unsanitized`.
3. **nit:** a string method, then `.unsanitized`. Recorded as item E.
4. **nit:** use the subscript form in `test_security_review.py`'s user-preference tool. Done.
5. **nit:** pass the sanitized value at construction rather than overwriting it in `__post_init__`. Done.
6. **should-fix, FP-6:** a shadowed `int` (`#set $int = lambda x: x`) was still read as numbers.
   - Done: the map reading tests the evaluated callee. There is a unit row for it.
7. **Confirmed:** plain `int()` hides the leading dash. Recorded as item D.

Pass 1 also confirmed the render path on its own. Galaxy sanitizes `$__user__` (attributes, addresses and `extra_preferences`: subscript, `.get` and loops) in `__sanitize_param_dict` before `__populate_non_job_params` wraps it raw. With `sanitize="false"` it renders raw. It also confirmed the `__user__` source key and the job check's handling of it once fixed.

**Pass 1b (round 1 fixes)**
1. **blocker:** a method call on the sanitized user object (`.copy()`, `.__getitem__`, `.pop`, ...) dropped the node, so a later `.unsanitized` read as sanitized.
   - Done: a `Node.called()` hook. Unmodelled dict attributes of the preferences give an untraced sanitized object.
   - Spec case: `user_preferences_copy_unsanitized`.
2. **blocker:** an in-place reorder of a traced list (`.reverse()`, `.pop(0)`, `#del a[0]`, ...) kept the literal chain.
   - Done: the list changes itself in place, and `#del` is now evaluated.
   - Spec case: `user_attribute_reversed`.
3. **should-fix:** untraced user reads in medium or low places passed enforce_all, even under when_unsure strict.
   - Done: the strict check now refuses an untraced value wherever its finding is enforced, not only at the code level.
   - Spec cases: `user_attribute_loop_untraced` and `user_attribute_loop_unquoted`.
4. **nit:** the commit body now says that the key=None expansion covers metadata too. Done.
5. **nit:** the `str` branch of `map()` now tests the evaluated callee, with a unit row. A shadowed `str` was an observable FN.

**Pass 1c (round 2 fixes)**
1. to 3. **blockers:** three more cases where the chain's reading and the rendering disagree, all from in-place changes:
   - a read before the change, in a loop or comprehension;
   - a change through a function argument;
   - a change through `.unsanitized` of the stored list, seen by a later fresh access.
   - Done by dropping the resolvable chain: non-account attributes are uncheckable.
   - Spec cases: `user_attribute_reordered_in_loop`, `user_attribute_reordered_by_function` and `user_attribute_reordered_as_stored`.
4. **nit:** `.copy()` of the preferences was over-refused. Done: it gives a fresh preferences node.

Pass 1c also judged that the strict check's level-aware refusal fits the documented meaning of strict ("every value the job carries must be plain"). Its measured reach is small: 4 of 5,990 corpus tools have only low untraced findings. Those tools are now refused at enforce_data and enforce_all under strict; nothing changes at enforce_code. No functional test tool or existing spec tool is affected. Its description now says so.

**Pass 1d (round 3 fixes)**
- Every probe from the earlier passes is refused wherever its finding is enforced.
- Nothing that was kept is dead.
- **should-fix (pre-existing):** subscript assignment into the preferences (`#set c["k"] = $p`) was not read as an in-place add.
  - Done: it is read as `__setitem__`.
  - Spec case: `user_preferences_set_item`.

</details>

## Commits and regression (per commit, against the previous run)

| commit | cause | removed | added | changed | tool events |
|---|---|---|---|---|---|
| `3f6be6a07ad` | FP-7 | 60 in 24 tools (57 low configfile-injection, 3 high shell-injection) | 0 | 0 | 1 |
| `e4da83767c8` | FP-6 | 3 (medium configfile-injection) in 3 tools | 0 | 0 | 3 (medium to none) |

The catalogue predicted 4 findings for FP-7, all in the one functional test tool. The other 56 removals come from preference reads in credential configfiles. They are sanitized, as the render tests show. The functional test tool reads `$__user__` attributes. It has no medium or higher vulnerability finding left, and it runs at enforce_code. At enforce_all with when_unsure strict it is refused, because its address is untraced.

At `e4da83767c8` these pass:
- 1145 security unit tests;
- 133 tests in `test_security_review.py` and `test_security_review_datasets.py`;
- 4493 spec job tests, run alone.

Lint is clean, and mypy matches the parent.
