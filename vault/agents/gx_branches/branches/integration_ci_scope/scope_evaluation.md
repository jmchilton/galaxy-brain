Keep the implemented scope, including the requested relocation of selection documentation and policy/pytest modules into `test/integration/`, while retaining the CLI in `scripts/`. No scope change or user decision is recommended. This revision changes ownership and imports while preserving the reviewed expensive-family selection policy; infrastructure optimization and broader test filtering remain follow-up work.

## As implemented: requested relocation, existing selection policy

The selection documentation and both implementation modules now live alongside the integration tests; the existing script remains the CI entry point and imports through the repository's `test` directory. The revision updates dependent imports and tests without expanding the classifier, changing family coverage, or changing infrastructure setup.

| Pros | Cons |
| --- | --- |
| • Matches the user's explicit ownership request.<br>• Keeps policy, pytest hook, and documentation near their consumers.<br>• Preserves the existing CI entry point and coverage boundary. | • CLI startup must resolve the source-tree test package.<br>• Test-owned modules remain dependencies of a CI script. |

<details>
<summary>Review evidence and preserved boundaries</summary>

The revision's normal review and fresh test challenge reported no required policy or import changes. Reported validation is 52 focused tests (44 selector and eight shard tests), including an isolated-site real-Git CLI regression. Full collection remains 1,745 test IDs and selective collection remains 1,467, matching the original real collection exactly. This scope evaluation relies on those reviews rather than repeating correctness or test execution.

The earlier review's conservative shared dataset, download, tool-execution, and S3/cloud dependency mappings remain applicable; relocation does not invalidate those decisions. No reviewer-reported unmet requirement calls for expanding or contracting scope. The original CI feature still retains general integration coverage and full runs for schedules/manual dispatch or unavailable/malformed selection. Test counts alone do not establish runtime savings.
</details>

## Alternative: retain modules and documentation in their previous locations

Keep policy and pytest integration under `lib/galaxy_test/` and documentation under `scripts/`, changing only references or adding links from the integration directory. This would contract the requested relocation.

| Pros | Cons |
| --- | --- |
| • Avoids changing the script's module lookup.<br>• Keeps policy in the existing test-helper library. | • Does not implement the user's stated placement preference.<br>• Leaves integration-specific ownership split across three directories.<br>• Provides no demonstrated behavioral advantage. |

## Alternative: move the CLI into the integration directory too

Relocate `scripts/select_integration_tests.py` alongside the implementation modules and update its workflow entry point. This expands the relocation beyond the requested documentation and modules.

| Pros | Cons |
| --- | --- |
| • All selection components occupy one directory.<br>• Could simplify local discovery. | • Changes an existing CI command unnecessarily.<br>• Requires additional workflow/documentation changes.<br>• Offers no additional selection or runtime benefit. |

## Alternative: redesign imports or package the policy independently

Introduce a separately installed policy package or restructure the test package to avoid a source-tree import from the script. This treats relocation as a packaging project.

| Pros | Cons |
| --- | --- |
| • Could provide a reusable package boundary.<br>• May help future callers outside this checkout. | • Adds packaging/install or package-layout changes to a dependency-free CLI.<br>• Existing import validation identifies no need for this work.<br>• Expands scope without a demonstrated consumer. |

## Alternative: combine relocation with further CI optimization

Also centralize detection into one workflow job, gate infrastructure after separating shared services, or broaden filtering to ordinary integration tests. These were already considered in the initial scope review and remain separate from the user's placement request.

| Pros | Cons |
| --- | --- |
| • Could reduce repeated history fetches or shared startup costs.<br>• Wider filtering could reduce additional test execution. | • Requires workflow/service/dependency work unrelated to relocation.<br>• Shared Minikube/services and container tooling still serve unconditional tests.<br>• Needs CI timing and runtime evidence; wider filtering increases coverage risk. |

The earlier scope recommendation still applies: preserve conservative expensive-family selection and use measured preparation/test timings to choose any subsequent CI optimization.
