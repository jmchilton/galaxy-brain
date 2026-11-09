Branch `pr_24693_review_0`, from `db8d06be733`, adds the missing test coverage for the verifier's population check and makes the check reusable. A new framework tool produces a real failed collection from a job that ends `ok`, and integration tests run the verifier against it for plain and mapped-over runs. The unit tests now pin the check's ordering, message and recursion, and no longer pass ignored definition keys. The only non-test change moves the check to module level, with no behavior change.

- `e6ffa9640c1` Test verifier against really failed discovered collections: adds `collection_creates_dynamic_population_fail` and two integration tests in `test_galaxy_interactor.py`.
- `e4441d33697` Pin population check before type and count checks: extends the rejection parametrization and uses `attributes` so type assertions take effect.
- `c67e1d8c1a1` Move collection population check to module level: `verify_population` becomes `verify_collection_population`.
- `8c68cea70df` Test population message in collection verifier error: asserts the full error with `populated_state_message` set.
- `c760931177b` Test collection population check three levels deep: asserts the `plots/outer/inner` path.
