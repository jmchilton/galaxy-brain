# Form display review — iteration 07

Reviewed `client/src/components/Form/FormDisplay.test.js` against all client unit-testing guidance. Its seven cases remain: highlighted/server errors, top-level and conditional value replacement, switching and sustaining conditionals, inserting repeats, section help, and pagination/search propagation for both dataset and collection inputs. All 19 original assertion statements remain, including the two complete namespaced nested-repeat payload sequences; a twentieth verifies that the third insertion actually creates the third repeat block.

The first five tests now name their behavior, use a fresh `getLocalVue()` configuration, and unmount automatically after each case. Setup supplies the actual mixed input tree and relies on component defaults for unrelated icons, collapsed labels, empty errors, and unset replacements. The two event cases have their own suite, so they no longer mount and immediately discard the default form before arranging their real repeated dataset input.

The `FormData` double is now scoped to the event-case mounts rather than replacing the module throughout this file. Real FormDisplay/FormInputs parent-child interactions remain mounted: rendering, checkbox changes, repeat clicks, recursive name prefixes, and event forwarding are the tested contracts. Shallow mounting would erase those interactions. The event stub retains the component name and `name` prop, so the tests still locate both actual recursive selector positions and emit both events from each position.

Reuse: existing mount configuration and auto-unmount helpers suffice. The mixed input tree is specific to these scenarios, while the event tree intentionally contains distinct cached nesting; a shared form fixture would conceal the structures this test is explaining. No new shared helper or supporting file was needed.

Validation: all seven cases pass in `/private/tmp/jest_readability_batch07_forms_storage.json`; scoped ESLint 10 and Prettier pass. Missing guidance: no README or marginal-advice addition proposed; existing guidance covers domain setup and parent-child interaction.
