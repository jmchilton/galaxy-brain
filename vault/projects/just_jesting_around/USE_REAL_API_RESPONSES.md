The value we get from the typing system by having the backend and frontend share models is immense - it assures typing stays in sync and eliminates many classes of errors. Sharing backend-generated API responses with the frontend type layer - should ensure non-type structural aspects of these systems stay in sync as well. A hand-written mock can type-check and still describe a response the server never sends (what values are emitted, how they interact, how they nest).

We shouldn't use synthetic frontend types for API responses - we should also not use synthetic test data when test data is easy and more correct to generate directly and keep in sync.

There is a code review aspect to this also - reading through repeated agentic generated synthetic examples mixed in with tests harms the readability of the test itself and increases the review surface. I'd rather these examples are coming from files I can ignore and just look at how the test is using the file and how the examples were generated.

I asked an agent to generate a summary of how I tried to address this problem in the Tool Shed. 

<details>

- Generator: test_generate_frontend_fixtures in lib/tool_shed/test/functional/test_shed_repositories.py is an ordinary API test. It sets up repos with populators, calls real endpoints, and writes the responses with json.dump(..., indent=2).
- Output dir: set by TOOL_SHED_FIXTURE_OUTPUT_DIR. When it's unset, the test writes to a temp dir. CI therefore runs the generator and its assertions on every run but never touches the committed files.
- Each fixture asserts why it exists. For example, the column_maker_unchanged repo must produce comparison_result: "equal", or the test fails. That stops a fixture from quietly losing the edge case it was captured for.Some states need specest-data repos(column_maker_subset,roduce particularstates. The direct_purver config flag(TOOL_SHED_CONFIG_CON it the test prints awarning and skips thal shed version of your"different Galaxy conTyped index: Metadataex.ts imports each JSONfile and casts it to . It also documents theregen command.Factories: factories.Revision and makeTool,which take overrides.l fixture as their base;makeChangeset uses ha use these for edgecases.Simulated leftovers: re explicitly labeled,with TODOs saying thely produce them.Regen docs: packages//regenerate-fixtures.mdcovers the regen commen to regenerate.
- Reuse beyond tests: t dev-only/_component_showcase reenshot test.

</details>

There are real issues with that approach that we should address for Galaxy-scale and Galaxy import.

<details>

1. Shared writer helper in galaxy_test.base, for example write_client_fixture(name, response_json, model=SomePydanticModel). It would:
   - validate the response against the pydantic model on write;
   - normalize nondeterministic values (encoded ids, timestamps, server URL and port, random populator usernames);
   - write to GALAXY_TEST_CLIENT_FIXTURE_DIR, or a temp dir when unset (same trick as the tool shed).
2. Default-config responses come from lib/galaxy_test/api/ tests.
3. Config-dependent responses come from test/integration/ classes that override handle_galaxy_config_kwds. Group them by config, one class per config, because each class boots its own Galaxy. Example: enable_quotas is needed for quota responses. That fits QuotaUsageSummary, which lane 3 just played.
4. One fixture location and a typed index, ideally generated: the Python side knows the model name, so it can emit the components["schemas"][X] mapping.
5. A cheap drift check in client unit CI. Validate the committed JSON against the OpenAPI schema (vitest + ajv) so schema changes fail fast. A full regen + git diff --exit-code needs a server, so it would be a manual or periodic job.
6. MSW plugs straight in. 141 client files already use useServerMock, and the openapi-typed handlers accept typed fixtures directly. That makes lane 4's per-test work mostly mechanical.
7. Simulated data policy: factories over a real base, a simulated_ prefix, and a TODO on what generator change would replace it.

</details>