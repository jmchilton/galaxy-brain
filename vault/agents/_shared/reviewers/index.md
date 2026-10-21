# Reviewer Registry

Review profiles, when to run them, and where they write in REVIEW_DIRECTORY. Every profile loads [shared.md](shared.md).

| Profile                                               | Run when                                                                                                          | Writes                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------- |
| [default](default.md)                                 | Every pull request review                                                                                         | `initial_review.md`         |
| [thermo_review](thermo_review.md)                     | More than 500 lines of implementation and/or test code                                                            | `thermo_review.md`          |
| [gx_test_challenger](gx_test_challenger.md)           | Every Galaxy pull request review that touches test code                                                           | `test_challenges_review.md` |
| [generic_test_challenger](generic_test_challenger.md) | Every non-Galaxy pull request review that touches test code                                                       | `test_challenges_review.md` |
| [learning_galaxy](learning_galaxy.md)                 | Galaxy pull requests not against a release branch with more than 250 lines of diff, or when John calls out the PR | `learning_galaxy.md`        |
| [gx_risk_assessment](gx_risk_assessment.md)           | Every Galaxy pull request                                                                                         | `risks.md`                  |
| [generic_risk_assessment](generic_risk_assessment.md) | Every non-Galaxy pull request                                                                                     | `risks.md`                  |

Thermo's 500-line threshold is deliberately higher than branch hardening's 50: John spends more context on work he authors than on PRs he reviews.
