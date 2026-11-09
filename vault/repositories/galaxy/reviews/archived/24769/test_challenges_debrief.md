# Test challenges debrief: #24769

- Profile: `gx_test_challenger`
- Model: Opus 5.5
- Effort: low
- Reviewed commit: `b4d1c730ac79`

## Verdict

Keep the one new test, at the unit layer. One small gap: it never exercises the restore branch that makes an incomplete backup harmful.

## Challenge results

`test_prepare_dirs_backup_only_appears_after_successful_copy`:

- Implementation-only or silly: no. It runs the real template with bash and asserts on the filesystem.
- Better at API/Integration/E2E: no. Failing a copy partway through a job isn't practical at those layers, and no UI is involved. E2E not warranted.
- Duplicated elsewhere: no. No other test under `test/` references `PREPARE_DIRS_TEMPLATE`, `prepare_dirs` or `_configs` in this sense.
- Mocks: none.
- Root skip: acceptable; unprivileged runs still give coverage.
- Failure injection: a permission error rather than a kill. Both leave `mv` unrun, so it is a fair stand-in.

## Mutation check

The worktree has no `.venv`, so I did not run pytest. A scratch script extracted `PREPARE_DIRS_TEMPLATE` from the PR head and replayed the test's steps and assertions against each mutant.

| Template | Result |
|---|---|
| Unmodified | pass |
| Old template (`cp -R` straight to `_$dir`) | fails first assert |
| Stale `.partial` cleanup removed | fails second assert |
| `&&` before `mv` changed to `;` | fails first assert |
| Restore branch replaced with `:` | **pass** |

This confirms the PR's two red-test claims. The last row is the gap.

## Test plan

Extend the existing test rather than adding a file. After the final assertion, damage `configs`, rerun, and assert it matches the backup:

```python
expected = _tree(configs)
(configs / "registry.xml").write_text("")
_run_prepare_dirs(tmp_path)
assert _tree(configs) == expected
```

This also pins the file contents through the full sequence: failed backup, good backup, restore. The new test name would need broadening to fit.
