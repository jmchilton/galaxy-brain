# Alt: original_scope

Branch: [`fix_markdown_cell_menu_focus_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/fix_markdown_cell_menu_focus_alt_original_scope) (`0d1ebb49773`).

This is the branch before the scope evaluation's modest expansion. It has the #24335 fix only:

- `Popper.close()` is exposed.
- CellAction and CellAdd route option selection through `close()`.
- `ButtonPlain` prevents Enter's default and activates Space on keyup.
- It includes the baseline tests, vitest focus tests and the (unrun) E2E test.

The working branch adds two things on top:

- **Move keeps focus on the moved cell's actions button.** `CellEditor` keys cells by index, so without this, focus lands on another cell's button or on `<body>`.
- **`usePopper`'s `.popper-close` click delegation is removed.**
