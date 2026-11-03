# Alt: original scope

Branch `harden_url_abstractions_25.1_alt_original_scope` at `178587b7e40` on `jmchilton`. It's the branch as hardened before the [scope evaluation](../scope_evaluation.md) recommended expanding.

It has everything on the parent except the three expansion items: the http file source doesn't check `ftp://` URLs, the urllib redirect handler stays in `lib/galaxy/files/sources/http.py`, and remote ZIP requests have no timeout. The 13 commits (4 baseline, 3 refactor, 6 change) are described in [baseline_refactor.md](../baseline_refactor.md).
