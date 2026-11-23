Branch `pr_24696_review_0` sits on the reviewed commit `b26614f7c11` and finishes the shared focus ring without changing how any control looks. The mixin default reads the `--color-ring` token from #23964 and falls back to `--color-blue-600` until the branch is merged with `dev`, the dropdown items' inset ring moves into a second mixin in the same partial, and the unused `$color` parameter goes away.

- `15c378d11e5` Default the focus-ring mixin to --color-ring: changes `$focus-ring-color` to a nested `var()` and updates the README description of the ring (P2 1).
- `7c49eef4208` Share the inset focus ring through a mixin: adds `focus-ring-inset` and uses it from `GDropdownItem` and `GDropdownItemButton`, which become `lang="scss"` (P3 1).
- `97306db4bd0` Drop the focus-ring mixin's unused $color parameter: removes the parameter and its README mention (P3 2).
