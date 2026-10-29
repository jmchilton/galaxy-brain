# Pulsar runner drops `home_target: pwd`, so non-XML tools get no `$HOME`

`PulsarComputeEnvironment._target_to_directory` has no `return` in its `pwd` branch (since 2023). `pwd` is the default home target for YAML, CWL and user-defined tools, so they run on Pulsar without `HOME`. Reproduced in a unit test on dev 7761eeb.
