# galaxy#22195 — Handling of optional text parameters `""` vs `null`

[Issue](https://github.com/galaxyproject/galaxy/issues/22195)

Optional text parameters without a default are `null` but users can't enter `null` through tool or workflow forms, so a `""` → False mapping never fires (bernt-matthias); next: write test cases pinning `""` vs `null` handling.
