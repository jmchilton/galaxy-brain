No refactoring of the base branch was performed.

The implementation adds the missing accessible name and native close semantics directly at their owning controls. The short focus-restoration handler and native-button style resets are required by the fix, rather than behavior-preserving cleanup that should land separately. Extracting them into an earlier commit would either alter dev behavior before its regression tests or introduce unused helpers.

Existing baseline coverage is already isolated in commit `a2166f2c585` and was verified against unchanged dev (36 tests passed). No benefit was found in rewriting that history or introducing additional preparatory refactor commits. The coordinator retains ownership of Git operations; this review performed none.
