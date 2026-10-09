# FormDefault

Reviewed `client/src/components/Workflow/Editor/Forms/FormDefault.test.js`: 2 cases before and after, both passing with shuffle seed 120043; scoped ESLint and Prettier pass.

Each scenario now mounts its own step through a short local helper with explicitly installed testing Pinia, `withPlugins`, and automatic unmounting. The collection-refresh case no longer also creates an unused subworkflow form in a shared hook. Both arrangements reuse `createTestStep`; the subworkflow's formerly camel-cased fixture keys now use the actual `content_id` and `config_form` step contract. The static presentation case has a specific name and no unnecessary async declaration.

Preserved the title, four input fields, and both output-label counts. The dependent collection sequence remains one test: paired selection emits once, refreshing re-seeds list without another emission, and list:paired subsequently emits the second payload. The refresh store is captured under the same Pinia as the mounted form. Full mounting remains necessary for the original real child fields and parent/child events; the existing datatype-only mock stays.

Existing workflow fixtures and mount helpers cover reuse. Neighboring forms need different step kinds and assertions; no additional common setup is justified. No README addition is needed.
