
Galaxy Commit Hooks prevent most code problems statically.

Still there is a couple static checks we should do before branch state transitions (not between every change or anything).

- Run `make format` to make sure the code is formatted.
- Run mypy according to GX_DEVELOPMENT.md.