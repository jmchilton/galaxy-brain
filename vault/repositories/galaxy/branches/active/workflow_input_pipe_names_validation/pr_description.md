# Reserve pipes in workflow input names

Galaxy uses `|` to delimit nested input paths. Workflow input labels containing
the same character make those paths ambiguous, so this change rejects them on
import and update. It also checks legacy data-input names stored in tool state.
Tool-step labels are unaffected.

There is no compatibility migration in this version. Existing workflows load
with their original names; authors must manually correct invalid input names
before saving those inputs. Nothing rewrites labels, connections, expressions,
or referenced subworkflows automatically.

This is the validation-only scope. Legacy-name autocorrection can be considered
separately, rather than being a prerequisite for reviewing the validation rule.

## Tests

- Unit coverage for all workflow input types, valid labels, legacy tool-state
  names, unrestricted tool labels, and unchanged legacy editor/subworkflow data.
- Retained API regressions for invalid input names on update and nested import.
- Local focused unit tests pass; fork CI and the API regressions have not been
  rerun for this comparison branch.

## How to test the changes?

- [x] I have included appropriate automated tests.

## License

- [x] I agree to license these and all my past contributions to the core Galaxy
  codebase under the MIT license.
