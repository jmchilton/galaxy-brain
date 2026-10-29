# File action rules: unstructured staging crashes, prefix rules ignore path boundaries, rewrite ignores its path

Three bugs in `pulsar/client` `FileActionMapper` / `PathMapper` rule handling, verified at 0.16.0 and still present on `master` (827ece21). Two were reproduced through Galaxy's `PulsarComputeEnvironment` on Galaxy dev 7761eeb; the third through a probe. Filed as one combined issue.
