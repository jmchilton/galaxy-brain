Fixes #23544.

Recognize workflow output checks containing `element_tests` as collection checks even when no explicit `class: Collection` or `elements` key is present.

Also allow `count`, `min`, and `max` assertions on nested collection elements in the workflow test model, matching the existing collection verification support, and regenerate the client API schema.

Includes a regression test for nested collection size assertions.

Targets `release_26.1`.
